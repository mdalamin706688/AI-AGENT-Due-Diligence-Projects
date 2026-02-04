# Architecture Design

## System Overview
The Due Diligence Questionnaire Agent is a full-stack AI system that automates due diligence questionnaires. It indexes company documents, parses questionnaire files, generates AI-powered answers with citations and confidence scores, and supports human review workflows plus evaluation against ground-truth answers.

## Component Boundaries
- **Backend (FastAPI)**: Handles API endpoints, business logic, document indexing, answer generation, and storage.
- **Frontend (React + Vite)**: Provides UI for project management, question review, and status tracking.
- **Storage**: In-memory for demo, can be extended to database.
- **Indexing**: Uses FAISS for vector search.
- **AI**: Mock for demo, can integrate OpenAI.

## Data Flow
1. User uploads questionnaire and documents.
2. System parses questionnaire into questions.
3. Documents are indexed into vector store.
4. For each question, AI generates answer with citations.
5. User reviews and approves answers.
6. Evaluation compares AI vs human answers.

## Storage Layout
- Projects: Contain questions, answers, documents.
- Documents: Indexed with chunks.
- Answers: Linked to questions with citations.