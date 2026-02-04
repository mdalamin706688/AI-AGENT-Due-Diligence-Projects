from typing import Dict, List
import openai
import os

class EvaluationService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "your-api-key-here")
    
    def evaluate_answer(self, question: str, ai_answer: str, ground_truth: str) -> Dict:
        """Evaluate AI answer against ground truth"""
        
        prompt = f"""
Compare the AI-generated answer to the ground truth answer for the question: "{question}"

AI Answer: {ai_answer}
Ground Truth: {ground_truth}

Please evaluate:
1. Accuracy (0.0-1.0): How accurate is the AI answer compared to ground truth?
2. Completeness (0.0-1.0): How complete is the AI answer?
3. Relevance (0.0-1.0): How relevant is the AI answer to the question?
4. Overall similarity score (0.0-1.0)

Format your response as:
ACCURACY: [score]
COMPLETENESS: [score]
RELEVANCE: [score]
SIMILARITY: [score]
"""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert evaluator comparing AI answers to ground truth. Provide numerical scores."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            evaluation_text = response.choices[0].message.content
            
            # Parse scores
            scores = {
                "accuracy": 0.5,
                "completeness": 0.5,
                "relevance": 0.5,
                "similarity": 0.5
            }
            
            for line in evaluation_text.split('\n'):
                line = line.strip().upper()
                if line.startswith('ACCURACY:'):
                    try:
                        scores["accuracy"] = float(line.split(':')[1].strip())
                    except:
                        pass
                elif line.startswith('COMPLETENESS:'):
                    try:
                        scores["completeness"] = float(line.split(':')[1].strip())
                    except:
                        pass
                elif line.startswith('RELEVANCE:'):
                    try:
                        scores["relevance"] = float(line.split(':')[1].strip())
                    except:
                        pass
                elif line.startswith('SIMILARITY:'):
                    try:
                        scores["similarity"] = float(line.split(':')[1].strip())
                    except:
                        pass
            
            return scores
            
        except Exception as e:
            print(f"Error evaluating answer: {e}")
            return {
                "accuracy": 0.5,
                "completeness": 0.5,
                "relevance": 0.5,
                "similarity": 0.5
            }
    
    def evaluate_project_answers(self, project_answers: List[Dict], ground_truth_answers: Dict[str, str]) -> Dict:
        """Evaluate all answers in a project against ground truth"""
        
        evaluations = []
        total_scores = {
            "accuracy": 0.0,
            "completeness": 0.0,
            "relevance": 0.0,
            "similarity": 0.0
        }
        
        for answer_data in project_answers:
            question_text = answer_data.get("question_text", "")
            ai_answer = answer_data.get("answer_text", "")
            question_id = answer_data.get("question_id", "")
            
            ground_truth = ground_truth_answers.get(question_id, "")
            
            if ground_truth:
                scores = self.evaluate_answer(question_text, ai_answer, ground_truth)
                evaluations.append({
                    "question_id": question_id,
                    "scores": scores
                })
                
                for key in total_scores:
                    total_scores[key] += scores[key]
        
        # Calculate averages
        if evaluations:
            for key in total_scores:
                total_scores[key] /= len(evaluations)
        
        return {
            "individual_evaluations": evaluations,
            "average_scores": total_scores,
            "total_questions_evaluated": len(evaluations)
        }

evaluation_service = EvaluationService()