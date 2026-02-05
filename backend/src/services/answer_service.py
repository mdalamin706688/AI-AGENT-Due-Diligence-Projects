from ..models import Answer, AnswerStatus, Citation, ProjectStatus
from ..indexing.indexer import indexer
from ..storage.memory import storage
import uuid
import requests
import json
import os
from typing import List
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

load_dotenv()

# AI Service Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")  # "ollama", "openrouter", "grok", "together", "zai"

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Cloud AI configurations
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
ZAI_API_KEY = os.getenv("ZAI_API_KEY")

def generate_answer(project_id: str, question_text: str) -> Answer:
    """Generate an AI-powered answer with citations and confidence score"""
    
    # Get the project to access its documents
    project = storage.get_project(project_id)
    if not project:
        return Answer(
            id=str(uuid.uuid4()),
            question_id="",
            answer_text="Project not found.",
            citations=[],
            confidence_score=0.0,
            status=AnswerStatus.MISSING_DATA
        )
    
    # Search for relevant document chunks within the project's documents
    document_ids = project.documents if project.documents else None
    relevant_chunks = indexer.search(question_text, k=3, document_ids=document_ids)
    
    # Prepare context from relevant chunks
    if relevant_chunks:
        context = "\n\n".join([chunk.page_content for chunk in relevant_chunks])
    else:
        context = "No relevant document excerpts found for this question."
    
    # Create prompt for OpenRouter (structured format)
    prompt = f"""Based on the following document excerpts, answer the question: "{question_text}"

Document excerpts:
{context}

CRITICAL FORMATTING INSTRUCTIONS:
- Provide your answer in EXACTLY this format with NO deviations:
- First line: ANSWER: [your complete answer here]
- Second line: CITATIONS: [brief citations or "No citations available"]  
- Third line: CONFIDENCE: [decimal between 0.0 and 1.0, e.g., 0.8]

EXAMPLE:
ANSWER: The company has been profitable for the last 3 years.
CITATIONS: Annual Report 2022, Page 15
CONFIDENCE: 0.9

Do NOT include confidence scores or citations within the ANSWER section.
Do NOT use markdown formatting like **bold** in your response."""
    
    try:
        if AI_PROVIDER == "ollama":
            # Call Ollama API
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 500
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["message"]["content"]
                print(f"✅ Ollama API success: '{ai_response[:100] if ai_response else 'None'}...'")
                if not ai_response:
                    ai_response = "I apologize, but I couldn't generate a response for this question."
            else:
                print(f"❌ Ollama API error: {response.status_code} - {response.text}")
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
        elif AI_PROVIDER == "openrouter":
            # Call OpenRouter API using requests
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "stepfun/step-3.5-flash:free",
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]
                print(f"✅ OpenRouter API success: '{ai_response[:100] if ai_response else 'None'}...'")
                if not ai_response:
                    ai_response = "I apologize, but I couldn't generate a response for this question."
            else:
                print(f"❌ OpenRouter API error: {response.status_code} - {response.text}")
                raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
            
        elif AI_PROVIDER == "grok":
            # Call Grok API (xAI)
            response = requests.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-beta",
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Grok API error: {response.status_code} - {response.text}")
                
        elif AI_PROVIDER == "together":
            # Call Together AI
            response = requests.post(
                "https://api.together.xyz/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {TOGETHER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/Llama-2-70b-chat-hf",
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Together AI error: {response.status_code} - {response.text}")
                
        elif AI_PROVIDER == "zai":
            # Call Z.AI API (using free GLM-4.7-Flash model) with retry logic
            max_retries = 3
            retry_delay = 5  # seconds
            
            for attempt in range(max_retries):
                try:
                    response = requests.post(
                        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                        headers={
                            "Authorization": f"Bearer {ZAI_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "glm-4.5",  # GLM-4.5 Flash model
                            "messages": [
                                {"role": "system", "content": "You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.1,
                            "max_tokens": 500
                        },
                        timeout=15
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        ai_response = result["choices"][0]["message"]["content"]
                        print(f"✅ Z.AI API success: '{ai_response}' (length: {len(ai_response)})")
                        if not ai_response or ai_response.strip() == "":
                            print("⚠️ Empty response from Z.AI, using fallback")
                            ai_response = f"Based on the available documents, I cannot provide a specific answer to: {question_text[:50]}..."
                        break  # Success, exit retry loop
                    elif response.status_code == 429:
                        # Rate limit exceeded, wait and retry
                        if attempt < max_retries - 1:
                            print(f"Z.AI rate limit hit, waiting {retry_delay} seconds before retry {attempt + 1}/{max_retries}")
                            import time
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                            continue
                        else:
                            raise Exception(f"Z.AI API rate limit exceeded after {max_retries} attempts")
                    else:
                        print(f"❌ Z.AI API error: {response.status_code} - {response.text}")
                        raise Exception(f"Z.AI API error: {response.status_code} - {response.text}")
                        
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        print(f"Z.AI timeout, retrying {attempt + 1}/{max_retries}")
                        import time
                        time.sleep(2)
                        continue
                    else:
                        raise Exception(f"Z.AI API timeout after {max_retries} attempts")
            
            # If we get here without breaking, it means all retries failed
            else:
                raise Exception(f"Z.AI API failed after {max_retries} attempts")
        
        else:
            raise Exception(f"Unknown AI provider: {AI_PROVIDER}")
        
        print(f"AI Response from {AI_PROVIDER}: {ai_response[:100]}...")  # Debug: print the raw response
        
        # Parse the response - more robust parsing
        answer_text = ai_response.strip()
        citations = []
        confidence_score = 0.5  # Default confidence

        # Try to extract structured information from the response
        lines = ai_response.split('\n')
        current_section = None
        extracted_answer = ""
        extracted_citations = []
        extracted_confidence = None

        for line in lines:
            line = line.strip()
            lower_line = line.lower()

            # Check for structured format
            if line.startswith('ANSWER:'):
                extracted_answer = line.replace('ANSWER:', '').strip()
                current_section = 'answer'
            elif line.startswith('CITATIONS:'):
                citation_text = line.replace('CITATIONS:', '').strip()
                if citation_text and citation_text not in ['No citations available', 'None', '']:
                    extracted_citations.append(citation_text)
                current_section = 'citations'
            elif line.startswith('CONFIDENCE:'):
                confidence_str = line.replace('CONFIDENCE:', '').strip()
                try:
                    # Extract number from confidence string
                    import re
                    confidence_match = re.search(r'(\d*\.?\d+)', confidence_str)
                    if confidence_match:
                        extracted_confidence = float(confidence_match.group(1))
                        if extracted_confidence > 1:  # Convert percentage to decimal
                            extracted_confidence /= 100
                except:
                    pass
            elif current_section == 'citations' and line and not line.startswith(('ANSWER:', 'CITATIONS:', 'CONFIDENCE:')):
                if line not in ['No citations available', 'None', '']:
                    extracted_citations.append(line)
            elif current_section == 'answer' and not line.startswith(('CITATIONS:', 'CONFIDENCE:')):
                extracted_answer += line + " "

        # If we successfully parsed structured format, use it
        if extracted_answer:
            answer_text = extracted_answer.strip()

        if extracted_citations:
            for citation_text in extracted_citations:
                citations.append(Citation(
                    document_id="doc1",
                    chunk_id="chunk1",
                    text=citation_text,
                    page=None
                ))

        if extracted_confidence is not None:
            confidence_score = extracted_confidence

        # Fallback: Try to extract confidence from text if not found in structured format
        if extracted_confidence is None:
            import re
            confidence_patterns = [
                r'confidence[:\s]*score[:\s]*(\d+(?:\.\d+)?)%?',  # confidence score: 85%
                r'confidence[:\s]*(\d+(?:\.\d+)?)%?',  # confidence: 0.8
                r'(\d+(?:\.\d+)?)%?\s*confidence',  # 85% confidence
                r'confidence[:\s]*score[:\s]*(\d+)/(\d+)',  # confidence score: 0/10
                r'(\d+)/(\d+)\s*confidence',  # 0/10 confidence
                r'low\s*\((\d+)/(\d+)\)',  # Low (0/10)
                r'high\s*\((\d+)/(\d+)\)',  # High (8/10)
                r'medium\s*\((\d+)/(\d+)\)',  # Medium (5/10)
            ]
            
            for pattern in confidence_patterns:
                match = re.search(pattern, ai_response, re.IGNORECASE)
                if match:
                    if len(match.groups()) == 1:
                        # Single number (percentage or decimal)
                        conf_val = float(match.group(1))
                        if conf_val > 1:  # Convert percentage to decimal
                            conf_val /= 100
                    else:
                        # Fraction like 0/10
                        numerator = float(match.group(1))
                        denominator = float(match.group(2))
                        conf_val = numerator / denominator if denominator != 0 else 0.0
                    
                    confidence_score = conf_val
                    break

        # Remove confidence score mentions from answer text - more comprehensive patterns
        confidence_removal_patterns = [
            r'[*]*confidence[:\s]*score[:\s]*[^\n]*[*]*',  # **Confidence Score:** anything
            r'[*]*confidence[:\s]*[^\n]*[*]*',  # **Confidence:** anything
            r'[*]*citation[:\s]*[^\n]*[*]*',  # **Citation:** anything
            r'[*]*citations[:\s]*[^\n]*[*]*',  # **Citations:** anything
        ]
        
        for pattern in confidence_removal_patterns:
            answer_text = re.sub(pattern, '', answer_text, flags=re.IGNORECASE)
        
        # Clean up extra whitespace and newlines
        answer_text = re.sub(r'\n\s*\n', '\n\n', answer_text)  # Multiple newlines to double newline
        answer_text = answer_text.strip()
        
    except Exception as e:
        print(f"❌ Error calling {AI_PROVIDER}: {str(e)}")
        print(f"❌ Exception type: {type(e).__name__}")
        # For production, provide a helpful error message instead of mock answers
        answer_text = f"I apologize, but I encountered an error while processing this question: {question_text[:50]}... The AI service may be temporarily unavailable. Please try again later."
        citations = []
        confidence_score = 0.0
        status = AnswerStatus.MISSING_DATA
    
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
    
    # Check if using Z.AI (which has low concurrency limits)
    ai_provider = os.getenv("AI_PROVIDER", "ollama").lower()
    use_sequential = ai_provider == "zai"  # Z.AI has strict concurrency limits
    
    if use_sequential:
        # Process questions sequentially for Z.AI to avoid rate limits
        batch_size = 1
        print("Using sequential processing for Z.AI to avoid concurrency limits")
    else:
        # Process in batches for other providers
        batch_size = 3
    
    for i in range(0, total_questions, batch_size):
        batch_questions = project.questions[i:i + batch_size]
        batch_answers = []
        
        if use_sequential:
            # Process sequentially for Z.AI with delays to avoid rate limits
            for question in batch_questions:
                try:
                    answer = generate_answer(project_id, question.text)
                    answer.question_id = question.id
                    batch_answers.append(answer)
                    # Add delay between requests to avoid rate limiting
                    import time
                    time.sleep(2)  # 2 second delay between requests
                except Exception as e:
                    print(f"Failed to generate answer for question: {question.text[:50]}... Error: {e}")
                    # Create a fallback answer
                    answer = Answer(
                        id=str(uuid.uuid4()),
                        question_id=question.id,
                        answer_text=f"Unable to generate answer due to API limitations. Question: {question.text}",
                        citations=[],
                        confidence_score=0.0,
                        status=AnswerStatus.MISSING_DATA
                    )
                    batch_answers.append(answer)
        else:
            # Process batch concurrently for other providers
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
                "current_question": f"Processing: {current_question_text}"
            })
    
    # Update project with answers
    project.answers = answers
    project.status = ProjectStatus.READY
    storage.save_project(project)
    
    return answers

def stream_answers(project_id: str):
    """Stream answers as they are generated in real-time using Server-Sent Events"""
    project = storage.get_project(project_id)
    if not project:
        yield f"data: {json.dumps({'error': 'Project not found'})}\n\n"
        return
    
    answers = []
    total_questions = len(project.questions)
    
    # Send initial progress update
    yield f"data: {json.dumps({'type': 'progress', 'current': 0, 'total': total_questions, 'message': 'Starting AI analysis...'})}\n\n"
    
    # Check if using Z.AI (which has low concurrency limits)
    ai_provider = os.getenv("AI_PROVIDER", "ollama").lower()
    use_sequential = ai_provider == "zai"
    
    if use_sequential:
        batch_size = 1
    else:
        batch_size = 3
    
    for i in range(0, total_questions, batch_size):
        batch_questions = project.questions[i:i + batch_size]
        batch_answers = []
        
        if use_sequential:
            # Process sequentially for Z.AI with delays
            for question in batch_questions:
                try:
                    answer = generate_answer(project_id, question.text)
                    answer.question_id = question.id
                    batch_answers.append(answer)
                    
                    # Send this answer immediately
                    answer_data = {
                        "type": "answer",
                        "question_id": question.id,
                        "question_text": question.text,
                        "answer_text": answer.answer_text,
                        "citations": [c.dict() for c in answer.citations],
                        "confidence_score": answer.confidence_score,
                        "status": answer.status.value
                    }
                    yield f"data: {json.dumps(answer_data)}\n\n"
                    
                    # Send progress update
                    current_count = min(i + len(batch_answers), total_questions)
                    progress = int((current_count / total_questions) * 100)
                    yield f"data: {json.dumps({'type': 'progress', 'current': current_count, 'total': total_questions, 'progress': progress})}\n\n"
                    
                    # Add delay between requests for Z.AI
                    import time
                    time.sleep(2)
                    
                except Exception as e:
                    print(f"Failed to generate answer for question: {question.text[:50]}... Error: {e}")
                    # Create fallback answer and send it
                    answer = Answer(
                        id=str(uuid.uuid4()),
                        question_id=question.id,
                        answer_text=f"Unable to generate answer due to API limitations. Question: {question.text}",
                        citations=[],
                        confidence_score=0.0,
                        status=AnswerStatus.MISSING_DATA
                    )
                    answer_data = {
                        "type": "answer",
                        "question_id": question.id,
                        "question_text": question.text,
                        "answer_text": answer.answer_text,
                        "citations": [],
                        "confidence_score": 0.0,
                        "status": "MISSING_DATA"
                    }
                    yield f"data: {json.dumps(answer_data)}\n\n"
        else:
            # Process batch concurrently for other providers
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = []
                for question in batch_questions:
                    future = executor.submit(generate_answer, project_id, question.text)
                    futures.append((future, question))
                
                for future, question in futures:
                    try:
                        answer = future.result()
                        answer.question_id = question.id
                        batch_answers.append(answer)
                        
                        # Send this answer immediately
                        answer_data = {
                            "type": "answer",
                            "question_id": question.id,
                            "question_text": question.text,
                            "answer_text": answer.answer_text,
                            "citations": [c.dict() for c in answer.citations],
                            "confidence_score": answer.confidence_score,
                            "status": answer.status.value
                        }
                        yield f"data: {json.dumps(answer_data)}\n\n"
                        
                    except Exception as e:
                        print(f"Failed to generate answer for question: {question.text[:50]}... Error: {e}")
                        answer = Answer(
                            id=str(uuid.uuid4()),
                            question_id=question.id,
                            answer_text=f"Unable to generate answer due to API limitations. Question: {question.text}",
                            citations=[],
                            confidence_score=0.0,
                            status=AnswerStatus.MISSING_DATA
                        )
                        answer_data = {
                            "type": "answer",
                            "question_id": question.id,
                            "question_text": question.text,
                            "answer_text": answer.answer_text,
                            "citations": [],
                            "confidence_score": 0.0,
                            "status": "MISSING_DATA"
                        }
                        yield f"data: {json.dumps(answer_data)}\n\n"
        
        answers.extend(batch_answers)
        
        # Update progress
        current_count = min(i + batch_size, total_questions)
        if current_count < total_questions:
            progress = int((current_count / total_questions) * 100)
            yield f"data: {json.dumps({'type': 'progress', 'current': current_count, 'total': total_questions, 'progress': progress, 'message': f'Processed {current_count} of {total_questions} questions...'})}\n\n"
    
    # Send completion message
    yield f"data: {json.dumps({'type': 'complete', 'total_answers': len(answers), 'message': f'✅ Analysis complete! {len(answers)} AI-powered answers ready.'})}\n\n"
    
    # Update project with all answers
    project.answers = answers
    project.status = ProjectStatus.READY
    storage.save_project(project)