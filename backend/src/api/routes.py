from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from ..models import CreateProjectRequest, GenerateAnswerRequest, UpdateAnswerRequest
from ..services.project_service import create_project, get_project, update_project_status
from ..services.answer_service import generate_answer
from ..workers.async_worker import start_async_task, process_request_async
from ..storage.memory import storage

router = APIRouter()

@router.get("/projects")
def get_projects():
    return storage.list_projects()

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

@router.get("/requests")
def get_requests():
    return storage.list_requests()

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

@router.post("/create-project-with-upload-async")
def create_project_with_upload_async(
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
    
    # Create project asynchronously
    request_id = start_async_task("create_project", {
        "name": name,
        "questionnaire_file": questionnaire_file.filename,
        "scope": scope
    })
    background_tasks.add_task(process_request_async, request_id)
    return {"request_id": request_id}

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
    return project

@router.get("/get-project-status")
def get_project_status(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": project.status}

@router.post("/index-document-async")
def index_document_async(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    content = file.file.read()
    request_id = start_async_task("index_document", {
        "filename": file.filename,
        "content": content
    })
    background_tasks.add_task(process_request_async, request_id)
    return {"request_id": request_id}

@router.post("/evaluate-project")
def evaluate_project(project_id: str):
    """Evaluate project answers against ground truth"""
    from ..services.evaluation_service import evaluation_service
    
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # For demo purposes, create mock ground truth answers
    ground_truth = {}
    for answer in project.answers:
        question = next((q for q in project.questions if q.id == answer.question_id), None)
        if question:
            # Mock ground truth - in real implementation, this would come from a database or file
            ground_truth[answer.question_id] = f"Ground truth answer for: {question.text[:50]}..."
    
    evaluation_data = []
    for answer in project.answers:
        question = next((q for q in project.questions if q.id == answer.question_id), None)
        if question:
            evaluation_data.append({
                "question_text": question.text,
                "answer_text": answer.manual_answer or answer.answer_text,
                "question_id": answer.question_id
            })
    
    results = evaluation_service.evaluate_project_answers(evaluation_data, ground_truth)
    return results