from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from ..models import CreateProjectRequest, GenerateAnswerRequest, UpdateAnswerRequest, EvaluateProjectRequest, RequestStatus
from ..services.project_service import create_project, get_project, update_project_status
from ..services.answer_service import generate_answer, stream_answers
from ..workers.async_worker import start_async_task, process_request_async
from ..storage.memory import storage
import json

router = APIRouter()

@router.get("/test-ai")
def test_ai():
    """Test the AI provider connection"""
    from ..services.answer_service import generate_answer
    try:
        answer = generate_answer("test_project", "What is the capital of France?")
        return {"status": "success", "answer": answer.answer_text[:200]}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/requests/{request_id}/status")
def get_request_status_user_friendly(request_id: str):
    """Get user-friendly status with progress information and time estimates"""
    request = storage.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status == RequestStatus.PENDING:
        return {
            "status": "queued",
            "message": "Your request is queued and will start processing soon.",
            "progress": 0,
            "estimated_wait_time": "30 seconds"
        }
    elif request.status == RequestStatus.IN_PROGRESS:
        if request.result and "progress" in request.result:
            progress_data = request.result["progress"]
            return {
                "status": "processing",
                "message": f"🤖 AI analyzing: '{progress_data['current_question'][:30]}...'",
                "progress": progress_data["progress"],
                "subtitle": f"Question {progress_data['current']}/{progress_data['total']} • {progress_data['estimated_seconds_remaining']}s remaining",
                "icon": "brain",
                "color": "blue"
            }
        else:
            return {
                "status": "processing",
                "message": "AI analysis in progress...",
                "progress": 50,
                "estimated_time_remaining": "Unknown",
                "current_question": "Initializing..."
            }
    elif request.status == RequestStatus.COMPLETED:
        if request.result and "answers" in request.result:
            answer_count = len(request.result["answers"])
            return {
                "status": "completed",
                "message": f"🎉 Analysis complete! {answer_count} AI-powered answers ready.",
                "progress": 100,
                "subtitle": "All questions analyzed with confidence scores and citations",
                "icon": "check-circle",
                "color": "green",
                "results_available": True,
                "next_steps": "Review answers and provide manual responses where needed"
            }
        elif request.result and "project_id" in request.result:
            # Project creation completed
            return {
                "status": "completed",
                "message": "✅ Project created successfully!",
                "progress": 100,
                "results_available": True,
                "project_id": request.result["project_id"]
            }
        else:
            return {
                "status": "completed",
                "message": "✅ Processing completed successfully.",
                "progress": 100,
                "results_available": True
            }
    else:  # FAILED
        return {
            "status": "failed",
            "message": f"❌ Processing failed: {request.error or 'Unknown error'}",
            "progress": 0,
            "error_details": request.error
        }

@router.get("/requests/{request_id}")
def get_request_status(request_id: str):
    """Get request status (alias for /requests/{request_id}/status for frontend compatibility)"""
    return get_request_status_user_friendly(request_id)

@router.get("/projects")
def get_projects():
    """Get all projects"""
    projects = storage.list_projects()
    return [project.model_dump() for project in projects]

@router.post("/create-project")
def create_project_sync(req: CreateProjectRequest):
    project = create_project(req.name, req.questionnaire_file, req.scope)
    return {"project_id": project.id}

@router.post("/create-project-async")
def create_project_async(req: CreateProjectRequest, background_tasks: BackgroundTasks):
    request_id = start_async_task("create_project", {
        "name": req.name,
        "questionnaire_file": req.questionnaire_file,
        "scope": req.scope
    })
    background_tasks.add_task(process_request_async, request_id)
    return {"request_id": request_id}

@router.post("/create-project-with-upload")
def create_project_with_upload(
    name: str = Form(...),
    scope: str = Form(...),
    questionnaire_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    # Save uploaded questionnaire file
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    project_root = os.path.dirname(backend_dir)
    data_dir = os.path.join(project_root, 'data')
    
    # Save the uploaded file
    file_path = os.path.join(data_dir, questionnaire_file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(questionnaire_file.file.read())
    
    # Create project with the uploaded file
    project = create_project(name, questionnaire_file.filename, scope)
    return {"project_id": project.id}

@router.post("/create-project-with-upload")
def create_project_with_upload(
    name: str = Form(...),
    scope: str = Form(...),
    background_tasks: BackgroundTasks = None,
    questionnaire_file: UploadFile = File(...)
):
    # Save uploaded questionnaire file
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    project_root = os.path.dirname(backend_dir)
    data_dir = os.path.join(project_root, 'data')
    
    # Save the uploaded file
    file_path = os.path.join(data_dir, questionnaire_file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(questionnaire_file.file.read())
    
    # Create project synchronously for now (to debug)
    project = create_project(name, questionnaire_file.filename, scope)
    return {"project_id": project.id}

@router.post("/generate-single-answer")
def generate_single_answer(req: GenerateAnswerRequest):
    answer = generate_answer(req.project_id, "question text")  # Mock for now
    return answer

@router.post("/generate-all-answers")
def generate_all_answers(project_id: str, background_tasks: BackgroundTasks):
    request_id = start_async_task("generate_all_answers", {"project_id": project_id})
    background_tasks.add_task(process_request_async, request_id)
    return {
        "request_id": request_id,
        "message": "🚀 AI analysis started! Processing questions in optimized batches for faster results.",
        "estimated_duration": "1-3 minutes for 37 questions (parallel processing)",
        "what_happens_next": "Track progress at GET /requests/{request_id}/status. Questions are processed in batches of 3 concurrently.",
        "performance_tips": "This is normal for AI-powered analysis. Each question requires document search + AI reasoning."
    }

@router.post("/update-project-async")
def update_project_async(project_id: str, background_tasks: BackgroundTasks):
    request_id = start_async_task("update_project", {"project_id": project_id})
    background_tasks.add_task(process_request_async, request_id)
    return {"request_id": request_id}

@router.post("/update-answer")
def update_answer(req: UpdateAnswerRequest):
    project = storage.get_project(req.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Find and update the answer
    for answer in project.answers:
        if answer.id == req.answer_id:
            answer.status = req.status
            if req.manual_answer:
                answer.manual_answer = req.manual_answer
            storage.save_project(project)
            return {"message": "Answer updated"}
    
    raise HTTPException(status_code=404, detail="Answer not found")

@router.get("/get-project-info")
def get_project_info(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Include document details with filenames
    documents_with_details = []
    for doc_id in project.documents:
        doc = storage.get_document(doc_id)
        if doc:
            documents_with_details.append({
                "id": doc.id,
                "filename": doc.filename
            })
    
    project_dict = project.dict()
    project_dict["documents"] = documents_with_details
    return project_dict

@router.get("/get-available-files")
def get_available_files():
    """Get list of available files in the data directory"""
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    project_root = os.path.dirname(backend_dir)
    data_dir = os.path.join(project_root, 'data')
    
    if not os.path.exists(data_dir):
        return {"files": []}
    
    files = []
    for file in os.listdir(data_dir):
        if file.endswith(('.pdf', '.txt')) and not file.startswith(('ILPA', 'test_questionnaire')):
            files.append(file)
    
    return {"files": files}

@router.post("/index-document-async")
def index_document_async(background_tasks: BackgroundTasks, project_id: str, file: UploadFile = File(None), filename: str = Form(None)):
    if file:
        # Handle file upload
        content = file.file.read()
        actual_filename = file.filename
    elif filename:
        # Handle existing file by filename
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        project_root = os.path.dirname(backend_dir)
        data_dir = os.path.join(project_root, 'data')
        file_path = os.path.join(data_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File {filename} not found")
        
        with open(file_path, 'rb') as f:
            content = f.read()
        actual_filename = filename
    else:
        raise HTTPException(status_code=400, detail="Either file or filename must be provided")
    
    request_id = start_async_task("index_document", {
        "filename": actual_filename,
        "content": content,
        "project_id": project_id
    })
    background_tasks.add_task(process_request_async, request_id)
    return {"request_id": request_id}

@router.post("/evaluate-project")
def evaluate_project(req: EvaluateProjectRequest):
    """Evaluate project answers against ground truth"""
    from ..services.evaluation_service import evaluate_project_answers, get_evaluation_summary
    
    try:
        evaluation_results = evaluate_project_answers(req.project_id)
        summary = get_evaluation_summary(req.project_id)
        
        return {
            "evaluation_results": [result.model_dump() for result in evaluation_results],
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@router.get("/evaluation-results/{project_id}")
def get_evaluation_results(project_id: str):
    """Get evaluation results for a project"""
    from ..services.evaluation_service import get_evaluation_results, get_evaluation_summary
    
    try:
        results = get_evaluation_results(project_id)
        summary = get_evaluation_summary(project_id)
        
        return {
            "evaluation_results": [result.model_dump() for result in results],
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get evaluation results: {str(e)}")

@router.post("/add-ground-truth")
def add_ground_truth(question_id: str, answer_text: str, source: str = "manual"):
    """Add ground truth answer for evaluation"""
    from ..services.evaluation_service import add_ground_truth_answer
    
    try:
        ground_truth = add_ground_truth_answer(question_id, answer_text, source)
        return {"ground_truth_id": ground_truth.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add ground truth: {str(e)}")

@router.get("/stream-answers/{project_id}")
def stream_project_answers(project_id: str):
    """Stream answers as they are generated in real-time"""
    return StreamingResponse(
        stream_answers(project_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )