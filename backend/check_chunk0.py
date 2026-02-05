#!/usr/bin/env python3
import sys
sys.path.append('.')
from src.storage.memory import storage

# Check chunk 0 content
doc = storage.get_document('20260110_MiniMax_Accountants_Report.pdf')
if doc and doc.chunks:
    chunk0 = doc.chunks[0]['text'].lower()
    print(f'Chunk 0 contains "company": {"company" in chunk0}')
    print(f'Chunk 0 contains "inc": {"inc" in chunk0}')
    print(f'Chunk 0 contains "group": {"group" in chunk0}')
    print(f'Chunk 0 contains "minimax": {"minimax" in chunk0}')

    # Show the relevant part
    if 'inc' in chunk0:
        pos = chunk0.find('inc')
        context = chunk0[max(0, pos-50):pos+50]
        print(f'Context around "inc": ...{context}...')