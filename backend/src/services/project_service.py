from ..models import Project, ProjectStatus, Question
from ..storage.memory import storage
import uuid
from pypdf import PdfReader
import re
from typing import List
import os

def parse_questionnaire(file_path: str) -> List[Question]:
    """Parse questions from the ILPA Due Diligence Questionnaire PDF or TXT"""
    questions = []
    
    # If it's just a filename, look in the data directory relative to this script
    if not file_path.startswith('/'):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(script_dir)  # backend/src/services -> backend/src
        root_dir = os.path.dirname(backend_dir)    # backend/src -> backend
        project_root = os.path.dirname(root_dir)   # backend -> DueDiligence (project root)
        data_dir = os.path.join(project_root, 'data')
        file_path = os.path.join(data_dir, file_path)
    
    print(f"Looking for questionnaire at: {file_path}")
    
    try:
        if file_path.endswith('.txt'):
            # Handle text files
            with open(file_path, 'r') as f:
                text = f.read()
        else:
            # Handle PDF files
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        
        print(f"Extracted {len(text)} characters from file")
        
        # Extract questions using regex patterns
        # Look for numbered questions like "1.", "2.", etc.
        question_pattern = r'(\d+)\.\s*([^\n]+)'
        matches = re.findall(question_pattern, text)
        
        print(f"Found {len(matches)} potential question matches")
        
        order = 1
        for match in matches[:20]:  # Limit to first 20 questions for demo
            question_text = match[1].strip()
            if len(question_text) > 10:  # Filter out very short matches
                # Determine section based on content
                section = "General"
                if any(word in question_text.lower() for word in ['financial', 'revenue', 'profit', 'balance']):
                    section = "Financial"
                elif any(word in question_text.lower() for word in ['legal', 'lawsuit', 'litigation', 'contract']):
                    section = "Legal"
                elif any(word in question_text.lower() for word in ['operation', 'business', 'market']):
                    section = "Operations"
                
                questions.append(Question(
                    id=str(uuid.uuid4()),
                    section=section,
                    text=question_text,
                    order=order
                ))
                order += 1
                
    except Exception as e:
        print(f"Error parsing questionnaire: {e}")
        # Fallback to mock questions
        questions = [
            Question(id=str(uuid.uuid4()), section="General", text="What is the company name?", order=1),
            Question(id=str(uuid.uuid4()), section="Financial", text="What is the revenue?", order=2),
            Question(id=str(uuid.uuid4()), section="Legal", text="Are there any pending lawsuits?", order=3),
            Question(id=str(uuid.uuid4()), section="Operations", text="What is the business model?", order=4),
            Question(id=str(uuid.uuid4()), section="Financial", text="What are the key financial metrics?", order=5),
        ]
    
    return questions

def create_project(name: str, questionnaire_file: str, scope: str) -> Project:
    questions = parse_questionnaire(questionnaire_file)
    project = Project(
        id=str(uuid.uuid4()),
        name=name,
        status=ProjectStatus.CREATED,
        scope=scope,
        questions=questions,
        answers=[],
        documents=[]
    )
    storage.save_project(project)
    return project

def get_project(project_id: str) -> Optional[Project]:
    return storage.get_project(project_id)

def update_project_status(project_id: str, status: ProjectStatus):
    project = storage.get_project(project_id)
    if project:
        project.status = status
        storage.save_project(project)