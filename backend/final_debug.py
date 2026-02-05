#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document

# Index document
data_dir = '../data'
pdf_file = '20260110_MiniMax_Accountants_Report.pdf'
file_path = os.path.join(data_dir, pdf_file)

text_content = indexer.extract_text_from_pdf(file_path)
doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
indexer.index_document(doc)

print("=== Chunk 0 Analysis ===")
chunk0 = doc.chunks[0]['text'].lower()
print(f'Contains "company": {"company" in chunk0}')
print(f'Contains "inc": {"inc" in chunk0}')
print(f'Contains "group": {"group" in chunk0}')
print(f'Contains "minimax": {"minimax" in chunk0}')

# Show context around keywords
for keyword in ['company', 'inc', 'group', 'minimax']:
    if keyword in chunk0:
        pos = chunk0.find(keyword)
        context = chunk0[max(0, pos-30):pos+50]
        print(f'Context around "{keyword}": ...{context}...')

print("\n=== Search Test ===")
# Test the search logic manually
query = 'company name'
query_lower = query.lower()

keyword_mappings = {
    'company name': ['company', 'corporation', 'inc', 'ltd', 'group', 'incorporated'],
}

search_keywords = set()
for question_pattern, content_keywords in keyword_mappings.items():
    if question_pattern in query_lower:
        search_keywords.update(content_keywords)
search_keywords.update(query_lower.split())

print(f'Search keywords: {search_keywords}')

# Calculate score for chunk 0
score = 0
for keyword in search_keywords:
    if keyword in chunk0:
        weight = 2 if keyword in ['company', 'corporation', 'inc', 'group'] else 1
        score += weight
        print(f'Found "{keyword}" with weight {weight}')

print(f'Chunk 0 score: {score}')

# Now test actual search
results = indexer.search('company name', k=5)
print(f'\\nActual search returned {len(results)} results')
for i, result in enumerate(results[:3]):
    has_minimax = 'minimax' in result.page_content.lower()
    print(f'Result {i+1}: Contains MiniMax = {has_minimax}')