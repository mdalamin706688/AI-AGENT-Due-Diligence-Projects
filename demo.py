#!/usr/bin/env python3
"""
Demo script for the Due Diligence Questionnaire Agent
This script demonstrates the full workflow of the system.
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def wait_for_request(request_id):
    """Wait for an async request to complete"""
    while True:
        response = requests.get(f"{BASE_URL}/get-request-status?request_id={request_id}")
        status = response.json()
        print(f"Request status: {status['status']}")
        if status['status'] in ['COMPLETED', 'FAILED']:
            return status
        time.sleep(2)

def demo():
    print("🚀 Starting Due Diligence Questionnaire Agent Demo")
    print("=" * 50)

    # Step 1: Create a project
    print("\n1. Creating project...")
    response = requests.post(f"{BASE_URL}/create-project-async", json={
        "name": "Demo Due Diligence Project",
        "questionnaire_file": "ILPA_Due_Diligence_Questionnaire_v1.2.pdf",
        "scope": "ALL_DOCS"
    })
    result = response.json()
    request_id = result['request_id']
    print(f"Project creation request ID: {request_id}")

    # Wait for project creation
    status = wait_for_request(request_id)
    if status['status'] == 'FAILED':
        print(f"❌ Project creation failed: {status.get('error')}")
        return

    project_id = status['result']['project_id']
    print(f"✅ Project created with ID: {project_id}")

    # Step 2: Get project info
    print("\n2. Getting project info...")
    response = requests.get(f"{BASE_URL}/get-project-info?project_id={project_id}")
    project = response.json()
    print(f"Project has {len(project['questions'])} questions")

    # Step 3: Index documents
    print("\n3. Indexing documents...")
    response = requests.post(f"{BASE_URL}/update-project-async", json={
        "project_id": project_id
    })
    result = response.json()
    request_id = result['request_id']
    print(f"Document indexing request ID: {request_id}")

    # Wait for indexing
    status = wait_for_request(request_id)
    if status['status'] == 'FAILED':
        print(f"❌ Document indexing failed: {status.get('error')}")
        return

    print("✅ Documents indexed successfully")

    # Step 4: Generate answers
    print("\n4. Generating answers...")
    response = requests.post(f"{BASE_URL}/generate-all-answers", json={
        "project_id": project_id
    })
    result = response.json()
    request_id = result['request_id']
    print(f"Answer generation request ID: {request_id}")

    # Wait for answer generation
    status = wait_for_request(request_id)
    if status['status'] == 'FAILED':
        print(f"❌ Answer generation failed: {status.get('error')}")
        return

    print("✅ Answers generated successfully")

    # Step 5: Get updated project info
    print("\n5. Getting final project status...")
    response = requests.get(f"{BASE_URL}/get-project-info?project_id={project_id}")
    project = response.json()
    print(f"Project status: {project['status']}")
    print(f"Generated {len(project['answers'])} answers")

    # Show sample answers
    print("\n6. Sample answers:")
    for i, answer in enumerate(project['answers'][:3]):
        question = next((q for q in project['questions'] if q['id'] == answer['question_id']), None)
        if question:
            print(f"\nQ{i+1}: {question['text'][:80]}...")
            print(f"A{i+1}: {answer['answer_text'][:100]}...")
            print(f"Confidence: {answer['confidence_score']:.2f}")
            print(f"Citations: {len(answer['citations'])}")

    # Step 6: Evaluate answers
    print("\n7. Evaluating answers...")
    response = requests.post(f"{BASE_URL}/evaluate-project", json={
        "project_id": project_id
    })
    evaluation = response.json()
    print("Evaluation results:")
    print(f"- Total questions evaluated: {evaluation['total_questions_evaluated']}")
    print(".2%")
    print(".2%")
    print(".2%")
    print(".2%")

    print("\n🎉 Demo completed successfully!")
    print("\nYou can now:")
    print("- Open http://localhost:5173 to use the web interface")
    print("- Review and edit answers through the UI")
    print(f"- View project details at: http://localhost:5173/project/{project_id}")

if __name__ == "__main__":
    try:
        demo()
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        print("Make sure both backend (port 8000) and frontend (port 5173) are running.")