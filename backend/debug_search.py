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

print(f"Indexed document with {len(doc.chunks)} chunks")

# Find which chunk contains MiniMax
for i, chunk in enumerate(doc.chunks):
    if 'MINIMAX' in chunk['text'].upper():
        print(f'Found MiniMax in chunk {i}')
        pos = chunk['text'].upper().find('MINIMAX')
        context = chunk['text'][max(0, pos-100):pos+200]
        print(f'Context: ...{context}...')
        print(f'Chunk length: {len(chunk["text"])} chars')
        break

# Test search
print("\nTesting search for 'company name':")
results = indexer.search('company name', k=5)
print(f"Found {len(results)} results")
for i, result in enumerate(results):
    has_minimax = 'MINIMAX' in result.page_content.upper()
    print(f"Result {i+1}: Contains MiniMax = {has_minimax}, Length = {len(result.page_content)}")