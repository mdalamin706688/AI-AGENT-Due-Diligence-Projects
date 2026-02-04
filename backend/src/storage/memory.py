from typing import Dict, List
from ..models import Project, Document, Answer, Request

class InMemoryStorage:
    def __init__(self):
        self.projects: Dict[str, Project] = {}
        self.documents: Dict[str, Document] = {}
        self.requests: Dict[str, Request] = {}

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

storage = InMemoryStorage()