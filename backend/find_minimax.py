#!/usr/bin/env python3
import sys
sys.path.append('.')
from src.storage.memory import storage

# Find which chunk contains MiniMax
for doc_id in storage.documents:
    doc = storage.get_document(doc_id)
    if doc and doc.chunks:
        for i, chunk in enumerate(doc.chunks):
            if 'MINIMAX' in chunk['text'].upper():
                print(f'Found MiniMax in chunk {i} of {doc_id}')
                print(f'Chunk text (first 300 chars): {chunk["text"][:300]}...')
                print(f'Chunk length: {len(chunk["text"])} chars')
                break