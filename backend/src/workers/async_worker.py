import asyncio
from ..models import Request, RequestStatus
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
            
        elif request.type == "generate_all_answers":
            data = request.result or {}
            answers = generate_all_answers(data["project_id"])
            request.result = {"answers": [a.dict() for a in answers]}
            
        elif request.type == "update_project":
            data = request.result or {}
            # Index all documents for the project
            project = storage.get_project(data["project_id"])
            if project:
                # Index all reference documents
                import os
                # Get the absolute path to the data directory (relative to backend/src/workers/)
                current_dir = os.path.dirname(os.path.abspath(__file__))
                backend_dir = os.path.dirname(os.path.dirname(current_dir))
                project_root = os.path.dirname(backend_dir)
                data_dir = os.path.join(project_root, 'data')
                for file in os.listdir(data_dir):
                    if file.endswith('.pdf') and file != 'ILPA_Due_Diligence_Questionnaire_v1.2.pdf':
                        doc_path = os.path.join(data_dir, file)
                        doc = Document(
                            id=str(uuid.uuid4()),
                            filename=doc_path,
                            content="",  # Will be extracted during indexing
                            chunks=[]
                        )
                        indexer.index_document(doc)
                        project.documents.append(doc.id)
                
                # Set status based on whether project already has answers
                # Projects become OUTDATED when new docs are added to projects with ALL_DOCS scope
                if project.scope == "ALL_DOCS" and len(project.answers) > 0:
                    update_project_status(data["project_id"], "OUTDATED")
                else:
                    update_project_status(data["project_id"], "READY")
                request.result = {"message": "Project updated and documents indexed"}
            
        elif request.type == "index_document":
            data = request.result or {}
            # Handle document upload and indexing
            filename = data["filename"]
            content = data["content"]
            
            # Save content to a temporary file or process directly
            doc = Document(
                id=str(uuid.uuid4()),
                filename=filename,
                content=content.decode('utf-8', errors='ignore') if isinstance(content, bytes) else content,
                chunks=[]
            )
            indexer.index_document(doc)
            request.result = {"document_id": doc.id}
        
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