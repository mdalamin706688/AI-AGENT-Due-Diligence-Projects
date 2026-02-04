Due Diligence Questionnaire Agent

A full-stack AI system to automate due diligence questionnaires. It indexes company documents, parses questionnaire files, generates AI-powered answers with citations and confidence scores, and supports human review workflows plus evaluation against ground-truth answers.

## Features

- **Document Indexing**: Automatically indexes PDF documents using FAISS vector search
- **Questionnaire Parsing**: Parses ILPA Due Diligence Questionnaire into structured questions
- **AI Answer Generation**: Uses OpenAI GPT to generate answers with citations and confidence scores
- **Human Review**: Web interface for reviewing, confirming, rejecting, or manually editing answers
- **Evaluation**: Compares AI answers against ground truth for accuracy metrics
- **Async Processing**: Background processing for long-running tasks

## Tech Stack

- **Backend**: FastAPI (Python) with async endpoints
- **Frontend**: React + TypeScript + Vite
- **AI**: OpenAI GPT-3.5-turbo for answer generation and evaluation
- **Vector Search**: FAISS for document indexing
- **Storage**: In-memory (demo), easily extensible to databases

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- OpenAI API key

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set your OpenAI API key:
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Frontend Setup
```bash
cd frontend
npm install
```

## Running the Application

### Start Backend
```bash
cd backend
source venv/bin/activate
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend
```bash
cd frontend
npm run dev
```

Access the application at http://localhost:5173

## Usage Workflow

1. **Create Project**: Enter a project name and select the questionnaire file
2. **Index Documents**: Click "Index Documents" to process all reference PDFs
3. **Generate Answers**: Click "Generate All Answers" to create AI responses
4. **Review Answers**: Click on individual questions to review, confirm, or edit answers
5. **Evaluate**: Use the evaluation endpoint to compare against ground truth

## API Endpoints

- `POST /create-project-async` - Create a new project
- `POST /update-project-async` - Index documents for a project
- `POST /generate-all-answers` - Generate answers for all questions
- `POST /update-answer` - Update answer status/review
- `GET /get-project-info` - Get project details
- `GET /get-request-status` - Check async task status
- `POST /evaluate-project` - Evaluate answers against ground truth

## Data Files

- `data/ILPA_Due_Diligence_Questionnaire_v1.2.pdf` - The questionnaire to parse
- `data/*.pdf` - Reference documents for answering questions

## Architecture

- **Backend Services**: Project management, answer generation, document indexing, evaluation
- **Async Workers**: Background processing for long-running tasks
- **Vector Store**: FAISS for semantic search of documents
- **Frontend**: React SPA with routing for different views

## Demo Notes

- Uses in-memory storage (resets on restart)
- Mock AI responses if OpenAI key not configured
- Sample PDFs provided for testing
- Evaluation uses mock ground truth for demonstration

## Production Considerations

- Replace in-memory storage with database (PostgreSQL + SQLAlchemy)
- Add authentication and authorization
- Implement proper error handling and logging
- Add document upload functionality
- Configure proper environment variables
- Add rate limiting and caching
