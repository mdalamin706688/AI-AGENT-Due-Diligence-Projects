#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.storage.memory import storage
from src.services.answer_service import generate_answer
from src.services.project_service import create_project
from src.models import Document
from src.indexing.indexer import indexer
import uuid

# Create a project
print("Creating project...")
project = create_project("Test Project", "test_questionnaire.txt", "ALL_DOCS")
print(f"Created project: {project.id} with {len(project.questions)} questions")

# Index documents
print("Indexing documents...")
data_dir = '/Users/mdalaminhaque/Desktop/document/makebell/DueDiligence/data'
for file in os.listdir(data_dir):
    if file.endswith('.pdf') and file != 'ILPA_Due_Diligence_Questionnaire_v1.2.pdf':
        doc_path = os.path.join(data_dir, file)
        doc = Document(id=str(uuid.uuid4()), filename=doc_path, content='', chunks=[])
        indexer.index_document(doc)
        storage.save_document(doc)
        project.documents.append(doc.id)
        print(f'Indexed document: {file}, ID: {doc.id}, Chunks: {len(doc.chunks)}')

storage.save_project(project)
print(f'Project now has {len(project.documents)} documents')

# Generate answer for first question
if project.questions:
    question = project.questions[0]
    print(f'Generating answer for: {question.text}')
    answer = generate_answer(project.id, question.text)
    print(f'Answer: {answer.answer_text}')
    print(f'Citations: {len(answer.citations)}')
    for i, citation in enumerate(answer.citations):
        print(f'Citation {i+1}: {citation.text}')
    print(f'Confidence: {answer.confidence_score}')