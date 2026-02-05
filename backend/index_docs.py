#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document

data_dir = '../data'
pdf_files = [f for f in os.listdir(data_dir) if f.endswith('.pdf')]
print(f'Found {len(pdf_files)} PDF files')

for pdf_file in pdf_files:
    file_path = os.path.join(data_dir, pdf_file)
    text_content = indexer.extract_text_from_pdf(file_path)
    doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
    print(f'Indexing: {pdf_file} ({len(text_content)} chars)')
    indexer.index_document(doc)

print(f'Total indexed: {len(indexer.documents_indexed)}')