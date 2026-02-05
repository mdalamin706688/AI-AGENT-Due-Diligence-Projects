import re

# Test the parsing logic with sample AI responses
test_responses = [
    'Based on the provided documents, there is no information available to answer whether the Firm has any existing business lines unrelated to the Fund\'s investment strategy.\n\n**Confidence Score:** 0/10  \n**Citation:** No relevant document excerpts found for this question.',
    'Based on the provided documents, there is no information available to answer this question. The context explicitly states: "No relevant document excerpts found for this question."\n\n**Answer:** The provided documents do not contain information regarding whether the Firm or any affiliated entity has ever failed to make payments under secured or unsecured indebtedness.\n\n**Confidence Score:** Low (0/10) - The answer is based solely on the absence of relevant information in the provided context, not on affirmative evidence.',
    'Based on the provided documents, there is no information available to answer whether the Firm or any affiliated entity has ever filed for bankruptcy.\n\n**Confidence Score:** Low (The answer is based on the explicit absence of relevant information in the provided context, not on confirmed data).\n\n**Citation:** The context states: "No relevant document excerpts found for this question."'
]

for i, response in enumerate(test_responses):
    print(f'\n--- Test Response {i+1} ---')
    print(f'Original: {response[:150]}...')

    # Test confidence extraction
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

    confidence_score = 0.5  # default
    for pattern in confidence_patterns:
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            if len(match.groups()) == 1:
                conf_val = float(match.group(1))
                if conf_val > 1:
                    conf_val /= 100
            else:
                numerator = float(match.group(1))
                denominator = float(match.group(2))
                conf_val = numerator / denominator if denominator != 0 else 0.0
            confidence_score = conf_val
            print(f'Extracted confidence: {confidence_score}')
            break

    # Test text cleaning
    answer_text = response
    confidence_removal_patterns = [
        r'[*]*confidence[:\s]*score[:\s]*[^\n]*[*]*',  # **Confidence Score:** anything
        r'[*]*confidence[:\s]*[^\n]*[*]*',  # **Confidence:** anything
        r'[*]*citation[:\s]*[^\n]*[*]*',  # **Citation:** anything
        r'[*]*citations[:\s]*[^\n]*[*]*',  # **Citations:** anything
    ]

    for pattern in confidence_removal_patterns:
        answer_text = re.sub(pattern, '', answer_text, flags=re.IGNORECASE)

    answer_text = re.sub(r'\n\s*\n', '\n\n', answer_text)
    answer_text = answer_text.strip()

    print(f'Cleaned answer: {answer_text[:150]}...')