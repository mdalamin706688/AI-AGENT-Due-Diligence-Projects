#!/usr/bin/env python3
import requests

OLLAMA_BASE_URL = 'http://localhost:11434'
OLLAMA_MODEL = 'llama3.2:3b'

# Manually provide context that contains the company name
context = '''ACCOUNTANTS' REPORT ON HISTORICAL FINANCIAL INFORMATION TO THE DIRECTORS OF MINIMAX GROUP INC. AND CHINA INTERNATIONAL CAPITAL CORPORATION HONG KONG SECURITIES LIMITED AND UBS SECURITIES HONG KONG LIMITED

Introduction
We report on the historical financial information of MINIMAX GROUP INC. (the "Company") and its subsidiaries'''

prompt = f'''Based on the following document excerpts, answer the question: "What is the company name?"

Document excerpts:
{context}

Please provide:
1. A concise answer to the question
2. Citations to specific parts of the documents that support your answer
3. A confidence score between 0.0 and 1.0 indicating how confident you are in the answer

Format your response as:
ANSWER: [your answer]
CITATIONS: [list of citations]
CONFIDENCE: [score]'''

try:
    response = requests.post(
        f'{OLLAMA_BASE_URL}/api/chat',
        json={
            'model': OLLAMA_MODEL,
            'messages': [
                {'role': 'system', 'content': 'You are a helpful assistant that answers questions based on provided documents. Always cite your sources and provide confidence scores.'},
                {'role': 'user', 'content': prompt}
            ],
            'stream': False,
            'options': {
                'temperature': 0.1,
                'num_predict': 500
            }
        }
    )

    if response.status_code == 200:
        result = response.json()
        ai_response = result['message']['content']
        print('AI Response with correct context:')
        print(ai_response)
    else:
        print(f'Error: {response.status_code}')

except Exception as e:
    print(f'Error: {e}')