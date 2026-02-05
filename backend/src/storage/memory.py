from typing import Dict, List
from ..models import Project, Document, Answer, Request, GroundTruthAnswer, EvaluationResult

class InMemoryStorage:
    def __init__(self):
        self.projects: Dict[str, Project] = {}
        self.documents: Dict[str, Document] = {}
        self.requests: Dict[str, Request] = {}
        self.ground_truth_answers: Dict[str, GroundTruthAnswer] = {}
        self.evaluation_results: Dict[str, EvaluationResult] = {}

    def save_project(self, project: Project):
        self.projects[project.id] = project

    def get_project(self, project_id: str) -> Optional[Project]:
        return self.projects.get(project_id)

    def list_projects(self) -> List[Project]:
        return list(self.projects.values())

    def save_document(self, document: Document):
        self.documents[document.id] = document

    def get_document(self, doc_id: str) -> Optional[Document]:
        return self.documents.get(doc_id)

    def list_documents(self) -> List[Document]:
        return list(self.documents.values())

    def save_request(self, request: Request):
        self.requests[request.id] = request

    def get_request(self, request_id: str) -> Optional[Request]:
        return self.requests.get(request_id)

    def list_requests(self) -> List[Request]:
        return list(self.requests.values())

    def save_ground_truth_answer(self, ground_truth: GroundTruthAnswer):
        self.ground_truth_answers[ground_truth.id] = ground_truth

    def get_ground_truth_answer(self, question_id: str) -> Optional[GroundTruthAnswer]:
        for gt in self.ground_truth_answers.values():
            if gt.question_id == question_id:
                return gt
        return None

    def list_ground_truth_answers(self) -> List[GroundTruthAnswer]:
        return list(self.ground_truth_answers.values())

    def save_evaluation_result(self, evaluation: EvaluationResult):
        self.evaluation_results[evaluation.id] = evaluation

    def get_evaluation_result(self, evaluation_id: str) -> Optional[EvaluationResult]:
        return self.evaluation_results.get(evaluation_id)

    def list_evaluation_results(self, project_id: str = None) -> List[EvaluationResult]:
        results = list(self.evaluation_results.values())
        if project_id:
            results = [r for r in results if r.project_id == project_id]
        return results

storage = InMemoryStorage()