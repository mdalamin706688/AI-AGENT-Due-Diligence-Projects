from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class ProjectStatus(str, Enum):
    CREATED = "CREATED"
    INDEXING = "INDEXING"
    READY = "READY"
    OUTDATED = "OUTDATED"

class AnswerStatus(str, Enum):
    GENERATED = "GENERATED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    MANUAL_UPDATED = "MANUAL_UPDATED"
    MISSING_DATA = "MISSING_DATA"

class RequestStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Citation(BaseModel):
    document_id: str
    chunk_id: str
    text: str
    page: Optional[int] = None
    bounding_box: Optional[Dict[str, float]] = None

class Answer(BaseModel):
    id: str
    question_id: str
    answer_text: str
    citations: List[Citation]
    confidence_score: float
    status: AnswerStatus
    manual_answer: Optional[str] = None

class Question(BaseModel):
    id: str
    section: str
    text: str
    order: int

class Document(BaseModel):
    id: str
    filename: str
    content: str
    chunks: List[Dict[str, Any]]  # For indexing

class Project(BaseModel):
    id: str
    name: str
    status: ProjectStatus
    scope: str  # "ALL_DOCS" or specific doc ids
    questions: List[Question]
    answers: List[Answer]
    documents: List[str]  # doc ids

class Request(BaseModel):
    id: str
    type: str  # e.g., "create_project", "index_document"
    status: RequestStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# API Models
class CreateProjectRequest(BaseModel):
    name: str
    questionnaire_file: str  # path or content
    scope: str

class GenerateAnswerRequest(BaseModel):
    project_id: str
    question_id: str

class UpdateAnswerRequest(BaseModel):
    project_id: str
    answer_id: str
    status: AnswerStatus
    manual_answer: Optional[str] = None

class IndexDocumentRequest(BaseModel):
    filename: str
    content: bytes

class GroundTruthAnswer(BaseModel):
    id: str
    question_id: str
    answer_text: str
    source: str  # e.g., "human_expert", "official_document"

class EvaluationResult(BaseModel):
    id: str
    project_id: str
    question_id: str
    ai_answer: str
    ground_truth_answer: str
    accuracy_score: float  # 0-1 scale
    citation_quality_score: float  # 0-1 scale
    confidence_correlation_score: float  # 0-1 scale
    overall_score: float  # 0-1 scale
    evaluation_details: Dict[str, Any]  # Additional metrics/details

class EvaluateProjectRequest(BaseModel):
    project_id: str