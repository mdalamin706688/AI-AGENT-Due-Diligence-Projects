#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.services.answer_service import generate_answer

# Index document
data_dir = '../data'
pdf_file = '20260110_MiniMax_Accountants_Report.pdf'
file_path = os.path.join(data_dir, pdf_file)

text_content = indexer.extract_text_from_pdf(file_path)
doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
indexer.index_document(doc)

print('=== Testing Improved Search ===')
results = indexer.search('company name', k=3)
print(f'Found {len(results)} results for "company name"')
for i, result in enumerate(results):
    has_minimax = 'MINIMAX' in result.page_content.upper()
    print(f'Result {i+1}: Contains MiniMax = {has_minimax}, length = {len(result.page_content)}')
    if has_minimax:
        pos = result.page_content.upper().find('MINIMAX')
        context = result.page_content[pos-50:pos+100]
        print(f'  Context: ...{context}...')

print('\n=== Testing AI Answer ===')
answer = generate_answer('test-project', 'What is the company name?')
print('Question: What is the company name?')
print('Answer:', answer.answer_text)
print('Confidence:', answer.confidence_score)