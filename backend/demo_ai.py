#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.services.answer_service import generate_answer

# Index the accountants report
data_dir = '../data'
pdf_file = '20260110_MiniMax_Accountants_Report.pdf'
file_path = os.path.join(data_dir, pdf_file)

text_content = indexer.extract_text_from_pdf(file_path)
doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
print(f'Indexing: {pdf_file} ({len(text_content)} chars)')
indexer.index_document(doc)

# Test search
results = indexer.search('company name', k=2)
print(f'\nFound {len(results)} search results for "company name"')
for i, result in enumerate(results):
    print(f'Result {i+1}: {result.page_content[:150]}...')

# Test AI answer
print('\n--- AI Answer Test ---')
answer = generate_answer('test-project', 'What is the company name?')
print('Question: What is the company name?')
print('Answer:', answer.answer_text)
print('Confidence:', answer.confidence_score)