#!/usr/bin/env python3
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.storage.memory import storage

# Index document
data_dir = '../data'
pdf_file = '20260110_MiniMax_Accountants_Report.pdf'
file_path = os.path.join(data_dir, pdf_file)

text_content = indexer.extract_text_from_pdf(file_path)
doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
indexer.index_document(doc)

# Check the first few chunks
stored_doc = storage.get_document(pdf_file)
if stored_doc and stored_doc.chunks:
    print(f'Document has {len(stored_doc.chunks)} chunks')
    for i, chunk in enumerate(stored_doc.chunks[:3]):
        text = chunk['text']
        has_minimax = 'MINIMAX' in text.upper()
        print(f'\nChunk {i+1} ({len(text)} chars) - Contains MiniMax: {has_minimax}')
        if has_minimax:
            pos = text.upper().find('MINIMAX')
            print(f'MiniMax at position {pos} in chunk')
            print(f'Context: {text[pos-50:pos+100]}')
        else:
            print(f'Preview: {text[:200]}...')
else:
    print('No chunks found')