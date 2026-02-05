#!/usr/bin/env python3
"""
Complete test of improved document search and AI answering
"""
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.services.answer_service import generate_answer

def main():
    print("🔍 Testing Improved Document Search & AI")
    print("=" * 50)

    # Step 1: Index document
    print("\n📄 Step 1: Indexing Document")
    data_dir = '../data'
    pdf_file = '20260110_MiniMax_Accountants_Report.pdf'
    file_path = os.path.join(data_dir, pdf_file)

    if os.path.exists(file_path):
        text_content = indexer.extract_text_from_pdf(file_path)
        doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
        indexer.index_document(doc)
        print(f"✓ Indexed {pdf_file}: {len(text_content)} chars, {len(doc.chunks)} chunks")
    else:
        print(f"✗ File not found: {pdf_file}")
        return

    # Step 2: Test search with different queries
    print("\n🔍 Step 2: Testing Search Queries")

    test_queries = [
        'company name',
        'MiniMax',
        'company',
        'financial report'
    ]

    for query in test_queries:
        results = indexer.search(query, k=2)
        print(f"\nQuery: '{query}' -> {len(results)} results")

        for i, result in enumerate(results):
            has_relevant = any(term in result.page_content.upper() for term in ['MINIMAX', 'COMPANY', 'INC'])
            print(f"  Result {i+1}: {len(result.page_content)} chars, Relevant: {has_relevant}")
            if has_relevant:
                # Show context around relevant terms
                text_upper = result.page_content.upper()
                for term in ['MINIMAX', 'COMPANY', 'INC']:
                    if term in text_upper:
                        pos = text_upper.find(term)
                        context = result.page_content[max(0, pos-50):pos+100]
                        print(f"    Found '{term}': ...{context}...")

    # Step 3: Test AI with the improved search
    print("\n🤖 Step 3: Testing AI Answers")

    questions = [
        "What is the company name?",
        "What type of document is this?"
    ]

    for question in questions:
        print(f"\n❓ {question}")
        answer = generate_answer('test-project', question)
        print(f"📝 Answer: {answer.answer_text[:100]}{'...' if len(answer.answer_text) > 100 else ''}")
        print(f"🎯 Confidence: {answer.confidence_score}")

    print("\n✅ Test Complete!")

if __name__ == "__main__":
    main()