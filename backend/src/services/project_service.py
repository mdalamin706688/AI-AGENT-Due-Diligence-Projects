from ..models import Project, ProjectStatus, Question
from ..storage.memory import storage
import uuid
from pypdf import PdfReader
import fitz  # PyMuPDF
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
            # Handle PDF files - try PyMuPDF first, fallback to pypdf
            try:
                doc = fitz.open(file_path)
                text = ""
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
                print("Used PyMuPDF for PDF extraction")
            except Exception as e:
                print(f"PyMuPDF failed: {e}, falling back to pypdf")
                with open(file_path, 'rb') as f:
                    reader = PdfReader(f)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
        
        print(f"Extracted {len(text)} characters from file")
        
        # Extract questions using regex patterns
        # Look for numbered questions like "1.1", "2.0", or simple "1.", "2." etc.
        # Try the detailed format first (1.1, 2.0), then fallback to simple numbering (1., 2.)
        question_pattern_detailed = r'(\d+\.\d+)\s+(.+?)(?=\d+\.\d+|\n\n|\n$|$)'
        question_pattern_simple = r'(\d+)\.\s+(.+)'
        
        matches = re.findall(question_pattern_detailed, text, re.DOTALL)
        
        if not matches:
            # Try simple numbering format
            matches = re.findall(question_pattern_simple, text)
        
        print(f"Found {len(matches)} potential question matches")
        print("First 5 matches:", matches[:5])
        
        order = 1
        for match in matches[:50]:  # Limit to first 50 questions
            question_text = match[1].strip().replace('\n', ' ')
            if len(question_text) > 10 and ('?' in question_text or question_text.startswith(('Does', 'Has', 'What', 'Is', 'Are', 'How', 'Why', 'When', 'Where', 'Who'))):
                # Skip headers like "Firm: General Information"
                if ':' in question_text and not question_text.startswith(('Does', 'Has', 'What', 'Is', 'Are', 'How', 'Why', 'When', 'Where', 'Who')):
                    continue
                # Remove the ☐ ☐ at the end
                question_text = re.sub(r'\s*☐\s*☐\s*$', '', question_text)
                # Determine section based on content or number
                section = "General"
                if 'financial' in question_text.lower() or 'valuation' in question_text.lower() or 'accounting' in question_text.lower() or 'reporting' in question_text.lower():
                    section = "Financial"
                elif 'legal' in question_text.lower() or 'litigation' in question_text.lower() or 'contract' in question_text.lower() or 'administration' in question_text.lower():
                    section = "Legal"
                elif 'operation' in question_text.lower() or 'business' in question_text.lower() or 'market' in question_text.lower() or 'team' in question_text.lower() or 'fund terms' in question_text.lower():
                    section = "Operations"
                elif 'governance' in question_text.lower() or 'risk' in question_text.lower() or 'compliance' in question_text.lower():
                    section = "Governance"
                elif 'esg' in question_text.lower() or 'environmental' in question_text.lower() or 'social' in question_text.lower() or 'diversity' in question_text.lower() or 'inclusion' in question_text.lower():
                    section = "ESG"
                
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
    print(f"Creating project: {name}, questionnaire: {questionnaire_file}, scope: {scope}")
    questions = parse_questionnaire(questionnaire_file)
    print(f"Parsed {len(questions)} questions")
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
    print(f"Project created and saved: {project.id}")
    return project

def get_project(project_id: str) -> Optional[Project]:
    return storage.get_project(project_id)

def update_project_status(project_id: str, status: ProjectStatus):
    project = storage.get_project(project_id)
    if project:
        project.status = status
        storage.save_project(project)