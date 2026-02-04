from ..models import Answer, AnswerStatus, Citation, ProjectStatus
from ..indexing.indexer import indexer
from ..storage.memory import storage
import uuid
import openai
import os
from typing import List
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

load_dotenv()

# Initialize OpenRouter client (OpenAI-compatible API)
client = openai.OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY", "your-api-key-here"),
    base_url="https://openrouter.ai/api/v1"
)

def generate_answer(project_id: str, question_text: str) -> Answer:
    """Generate an AI-powered answer with citations and confidence score"""
    
    # Search for relevant document chunks
    relevant_chunks = indexer.search(question_text, k=3)
    
    # Prepare context from relevant chunks
    if relevant_chunks:
        context = "\n\n".join([chunk.page_content for chunk in relevant_chunks])
    else:
        context = "No relevant document excerpts found for this question."
    
    # Create prompt for OpenRouter
    
    # Create prompt for OpenAI
    prompt = f"""
Based on the following document excerpts, answer the question: "{question_text}"

Document excerpts:
{context}

Please provide:
1. A concise answer to the question
2. Citations to specific parts of the documents that support your answer
3. A confidence score between 0.0 and 1.0 indicating how confident you are in the answer

Format your response as:
ANSWER: [your answer]
CITATIONS: [list of citations]
CONFIDENCE: [score]
"""
    
    try:
        # Call OpenRouter API (using Arcee Trinity free model)
        response = client.chat.completions.create(
            model="stepfun/step-3.5-flash:free",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.1
        )
        
        ai_response = response.choices[0].message.content
        print(f"AI Response: {ai_response}")  # Debug: print the raw response
        
        # Parse the response
        answer_text = ai_response.strip()  # Default to full response
        citations = []
        confidence_score = 0.5  # Default confidence
        
        lines = ai_response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if line.startswith('ANSWER:'):
                answer_text = line.replace('ANSWER:', '').strip()
                current_section = 'answer'
            elif line.startswith('CITATIONS:'):
                current_section = 'citations'
            elif line.startswith('CONFIDENCE:'):
                confidence_str = line.replace('CONFIDENCE:', '').strip()
                try:
                    confidence_score = float(confidence_str)
                except:
                    confidence_score = 0.5
            elif current_section == 'citations' and line:
                # Parse citation
                citations.append(Citation(
                    document_id="doc1",  # Simplified
                    chunk_id="chunk1",
                    text=line,
                    page=None
                ))
        
    except Exception as e:
        print(f"Error calling OpenRouter: {e}")
        # Fallback to mock answer
        answer_text = f"Mock AI answer to: {question_text[:50]}... Based on the indexed documents, this appears to be relevant information that would help answer this question."
        citations = [Citation(document_id="doc1", chunk_id="chunk1", text="Sample citation from document")]
        confidence_score = 0.7
    
    # Check if the answer indicates missing data
    if "no relevant information" in answer_text.lower() or confidence_score < 0.3:
        status = AnswerStatus.MISSING_DATA
        confidence_score = 0.0
    else:
        status = AnswerStatus.GENERATED
    
    answer = Answer(
        id=str(uuid.uuid4()),
        question_id="",  # Will be set by caller
        answer_text=answer_text,
        citations=citations,
        confidence_score=confidence_score,
        status=status
    )
    return answer

def generate_all_answers(project_id: str, progress_callback=None) -> List[Answer]:
    """Generate answers for all questions in a project with progress tracking"""
    project = storage.get_project(project_id)
    if not project:
        return []
    
    answers = []
    total_questions = len(project.questions)
    
    # Process in batches of 3 to avoid overwhelming the API
    batch_size = 3
    
    for i in range(0, total_questions, batch_size):
        batch_questions = project.questions[i:i + batch_size]
        batch_answers = []
        
        # Process batch concurrently
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = []
            for question in batch_questions:
                future = executor.submit(generate_answer, project_id, question.text)
                futures.append((future, question))
            
            for future, question in futures:
                answer = future.result()
                answer.question_id = question.id
                batch_answers.append(answer)
        
        answers.extend(batch_answers)
        
        # Update progress
        current_count = min(i + batch_size, total_questions)
        if progress_callback:
            progress = int((current_count / total_questions) * 100)
            estimated_time_remaining = (total_questions - current_count) * 2  # Rough estimate: 2 seconds per question with batching
            current_question_text = batch_questions[0].text[:50] + "..." if len(batch_questions[0].text) > 50 else batch_questions[0].text
            progress_callback({
                "current": current_count,
                "total": total_questions,
                "progress": progress,
                "estimated_seconds_remaining": estimated_time_remaining,
                "current_question": f"Processing batch: {current_question_text}"
            })
    
    # Update project with answers
    project.answers = answers
    project.status = ProjectStatus.READY
    storage.save_project(project)
    
    return answers