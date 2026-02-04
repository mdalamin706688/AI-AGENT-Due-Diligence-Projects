# Functional Design

## User Flows
1. Create Project: Upload questionnaire, select scope.
2. Index Documents: Upload PDFs, index asynchronously.
3. Generate Answers: Auto-generate answers for all questions.
4. Review Answers: Approve, reject, or edit manually.
5. Evaluate: Compare AI answers to ground truth.

## API Behaviors
- Async operations return request IDs, status can be polled.
- Answers include answerability, citations, confidence.
- Projects become OUTDATED when new docs added.

## Status Transitions
- Project: CREATED -> INDEXING -> READY -> OUTDATED
- Answer: GENERATED -> CONFIRMED/REJECTED/MANUAL_UPDATED/MISSING_DATA
- Request: PENDING -> IN_PROGRESS -> COMPLETED/FAILED