#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.services.answer_service import generate_answer

# Index one document in this session
data_dir = '../data'
pdf_file = '20260110_MiniMax_Global_Offering_Prospectus.pdf'
file_path = os.path.join(data_dir, pdf_file)

text_content = indexer.extract_text_from_pdf(file_path)
doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
print(f'Indexing: {pdf_file} ({len(text_content)} chars)')
indexer.index_document(doc)

# Now test search
results = indexer.search('company name', k=3)
print(f'\nFound {len(results)} search results for "company name"')
for i, result in enumerate(results):
    print(f'Result {i+1}: {result.page_content[:200]}...')

# Test AI answer generation
print('\n--- Testing AI Answer ---')
answer = generate_answer('test-project', 'What is the company name?')
print('Answer:', answer.answer_text)
print('Confidence:', answer.confidence_score)