import asyncio
from ..models import Request, RequestStatus, ProjectStatus
from ..storage.memory import storage
from ..services.project_service import create_project, update_project_status
from ..services.answer_service import generate_answer, generate_all_answers
from ..indexing.indexer import indexer
from ..models import Document
import uuid

async def process_request(request: Request):
    request.status = RequestStatus.IN_PROGRESS
    storage.save_request(request)
    
    try:
        if request.type == "create_project":
            data = request.result or {}
            project = create_project(data["name"], data["questionnaire_file"], data["scope"])
            request.result = {"project_id": project.id}
            request.status = RequestStatus.COMPLETED
            
        elif request.type == "generate_all_answers":
            data = request.result or {}
            
            def progress_callback(progress_data):
                # Update request with progress information
                request.result = {
                    "status": "processing",
                    "progress": progress_data,
                    "partial_answers": []  # Could add partial results here
                }
                storage.save_request(request)
            
            answers = generate_all_answers(data["project_id"], progress_callback)
            request.result = {"answers": [a.dict() for a in answers]}
            
        elif request.type == "update_project":
            data = request.result or {}
            print(f"Starting update_project for project {data.get('project_id')}")
            # Index all documents for the project
            project = storage.get_project(data["project_id"])
            if project:
                print(f"Found project: {project.name}, scope: {project.scope}, current documents: {len(project.documents)}")
                
                if project.scope == "ALL_DOCS":
                    # For ALL_DOCS projects, index all reference documents
                    import os
                    # Get the absolute path to the data directory (relative to backend/src/workers/)
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    backend_dir = os.path.dirname(os.path.dirname(current_dir))
                    project_root = os.path.dirname(backend_dir)
                    data_dir = os.path.join(project_root, 'data')
                    for file in os.listdir(data_dir):
                        # Index PDF and TXT files as reference documents, but exclude questionnaire files
                        if (file.endswith('.pdf') or file.endswith('.txt')) and file != 'ILPA_Due_Diligence_Questionnaire_v1.2.pdf' and file != 'test_questionnaire.txt':
                            doc_path = os.path.join(data_dir, file)
                            doc = Document(
                                id=str(uuid.uuid4()),
                                filename=doc_path,
                                content="",  # Will be extracted during indexing
                                chunks=[]
                            )
                            indexer.index_document(doc)
                            storage.save_document(doc)  # Save the document to storage
                            print(f"Saved document: {doc.filename.split('/')[-1]}, ID: {doc.id}, Content length: {len(doc.content)}, Chunks: {len(doc.chunks)}")
                            project.documents.append(doc.id)
                else:
                    # For specific scope projects, just ensure existing documents are indexed
                    print(f"Project has specific scope, not re-indexing all documents. Current documents: {len(project.documents)}")
                
                # Set status based on whether project already has answers
                # Projects become OUTDATED when new docs are added to projects with ALL_DOCS scope
                if project.scope == "ALL_DOCS" and len(project.answers) > 0:
                    update_project_status(data["project_id"], ProjectStatus.OUTDATED)
                else:
                    update_project_status(data["project_id"], ProjectStatus.READY)
                storage.save_project(project)  # Save the updated project
                request.result = {"message": "Project updated and documents indexed"}
            
        elif request.type == "index_document":
            data = request.result or {}
            # Handle document upload and indexing
            filename = data["filename"]
            content = data["content"]
            project_id = data.get("project_id")
            
            # Save the uploaded file to data directory
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(os.path.dirname(current_dir))
            project_root = os.path.dirname(backend_dir)
            data_dir = os.path.join(project_root, 'data')
            os.makedirs(data_dir, exist_ok=True)
            
            file_path = os.path.join(data_dir, filename)
            with open(file_path, 'wb') as f:
                f.write(content if isinstance(content, bytes) else content.encode('utf-8'))
            
            # Create document object
            doc = Document(
                id=str(uuid.uuid4()),
                filename=file_path,
                content="",  # Will be extracted during indexing
                chunks=[]
            )
            indexer.index_document(doc)
            storage.save_document(doc)
            
            # If project_id is provided, add document to project
            if project_id:
                project = storage.get_project(project_id)
                if project:
                    project.documents.append(doc.id)
                    # Set project status to READY after indexing documents
                    # (or OUTDATED if it has answers and scope is ALL_DOCS)
                    if project.scope == "ALL_DOCS" and len(project.answers) > 0:
                        update_project_status(project_id, ProjectStatus.OUTDATED)
                    else:
                        update_project_status(project_id, ProjectStatus.READY)
                    storage.save_project(project)
                    print(f"Added document {doc.id} to project {project_id}, status set to {project.status}")
            
            request.result = {"document_id": doc.id, "filename": filename}
        
        request.status = RequestStatus.COMPLETED
        
    except Exception as e:
        request.status = RequestStatus.FAILED
        request.error = str(e)
        print(f"Error processing request {request.id}: {e}")
    
    storage.save_request(request)

def start_async_task(type: str, data: dict) -> str:
    request = Request(id=str(uuid.uuid4()), type=type, status=RequestStatus.PENDING, result=data)
    storage.save_request(request)
    return request.id

async def process_request_async(request_id: str):
    request = storage.get_request(request_id)
    if request:
        await process_request(request)