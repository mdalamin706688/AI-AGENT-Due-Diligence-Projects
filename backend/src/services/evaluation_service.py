from ..models import EvaluationResult, GroundTruthAnswer, Project, Answer
from ..storage.memory import storage
import uuid
from typing import List, Dict, Any
import difflib
import re

def evaluate_project_answers(project_id: str) -> List[EvaluationResult]:
    """Evaluate AI-generated answers against ground truth for a project"""
    project = storage.get_project(project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    evaluation_results = []
    has_ground_truth = False

    for answer in project.answers:
        # Get ground truth for this question
        ground_truth = storage.get_ground_truth_answer(answer.question_id)
        if not ground_truth:
            # Create mock ground truth for demonstration
            mock_answer = f"Mock ground truth answer for question about: {answer.answer_text[:50]}..."
            ground_truth = add_ground_truth_answer(answer.question_id, mock_answer, "mock_auto_generated")
        
        has_ground_truth = True
        # Calculate evaluation metrics
        evaluation = evaluate_answer(
            project_id=project_id,
            question_id=answer.question_id,
            ai_answer=answer.answer_text,
            ground_truth_answer=ground_truth.answer_text,
            confidence_score=answer.confidence_score
        )

        evaluation_results.append(evaluation)
        storage.save_evaluation_result(evaluation)

    if not has_ground_truth and not project.answers:
        raise ValueError("No answers found in project to evaluate")

    return evaluation_results

def evaluate_answer(project_id: str, question_id: str, ai_answer: str, ground_truth_answer: str, confidence_score: float) -> EvaluationResult:
    """Evaluate a single AI answer against ground truth"""

    # Calculate accuracy score using text similarity
    accuracy_score = calculate_text_similarity(ai_answer, ground_truth_answer)

    # Calculate citation quality score (placeholder - would need citation analysis)
    citation_quality_score = 0.8  # Placeholder

    # Calculate confidence correlation score
    confidence_correlation_score = calculate_confidence_correlation(confidence_score, accuracy_score)

    # Calculate overall score as weighted average
    overall_score = (accuracy_score * 0.5 + citation_quality_score * 0.3 + confidence_correlation_score * 0.2)

    evaluation_details = {
        "similarity_method": "sequence_matcher",
        "confidence_accuracy_correlation": abs(confidence_score - accuracy_score),
        "ai_answer_length": len(ai_answer),
        "ground_truth_length": len(ground_truth_answer)
    }

    return EvaluationResult(
        id=str(uuid.uuid4()),
        project_id=project_id,
        question_id=question_id,
        ai_answer=ai_answer,
        ground_truth_answer=ground_truth_answer,
        accuracy_score=round(accuracy_score, 3),
        citation_quality_score=round(citation_quality_score, 3),
        confidence_correlation_score=round(confidence_correlation_score, 3),
        overall_score=round(overall_score, 3),
        evaluation_details=evaluation_details
    )

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity using difflib"""
    # Normalize texts
    text1 = normalize_text(text1)
    text2 = normalize_text(text2)

    # Use sequence matcher for similarity
    matcher = difflib.SequenceMatcher(None, text1, text2)
    return matcher.ratio()

def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    # Convert to lowercase
    text = text.lower()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove punctuation
    text = re.sub(r'[^\w\s]', '', text)
    return text

def calculate_confidence_correlation(confidence: float, accuracy: float) -> float:
    """Calculate how well confidence score correlates with accuracy"""
    # Perfect correlation would be confidence == accuracy
    # Score is 1 - |confidence - accuracy|
    correlation = 1.0 - abs(confidence - accuracy)
    return max(0.0, correlation)  # Ensure non-negative

def add_ground_truth_answer(question_id: str, answer_text: str, source: str) -> GroundTruthAnswer:
    """Add a ground truth answer for evaluation"""
    ground_truth = GroundTruthAnswer(
        id=str(uuid.uuid4()),
        question_id=question_id,
        answer_text=answer_text,
        source=source
    )
    storage.save_ground_truth_answer(ground_truth)
    return ground_truth

def get_evaluation_results(project_id: str) -> List[EvaluationResult]:
    """Get evaluation results for a project"""
    return storage.list_evaluation_results(project_id)

def get_evaluation_summary(project_id: str) -> Dict[str, Any]:
    """Get summary statistics for project evaluation"""
    results = get_evaluation_results(project_id)

    if not results:
        return {
            "total_questions": 0,
            "evaluated_questions": 0,
            "average_accuracy": 0,
            "average_citation_quality": 0,
            "average_confidence_correlation": 0,
            "average_overall_score": 0
        }

    return {
        "total_questions": len(results),
        "evaluated_questions": len(results),
        "average_accuracy": round(sum(r.accuracy_score for r in results) / len(results), 3),
        "average_citation_quality": round(sum(r.citation_quality_score for r in results) / len(results), 3),
        "average_confidence_correlation": round(sum(r.confidence_correlation_score for r in results) / len(results), 3),
        "average_overall_score": round(sum(r.overall_score for r in results) / len(results), 3)
    }