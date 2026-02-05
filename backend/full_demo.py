#!/usr/bin/env python3
"""
Complete Due Diligence AI Demo
Shows the full workflow: document indexing, search, and AI-powered Q&A
"""
import sys, os
sys.path.append('.')

from src.indexing.indexer import indexer
from src.models import Document
from src.services.answer_service import generate_answer

def main():
    print("🚀 Due Diligence AI Demo")
    print("=" * 50)

    # Step 1: Index documents
    print("\n📄 Step 1: Indexing Documents")
    data_dir = '../data'
    pdf_files = [
        '20260110_MiniMax_Accountants_Report.pdf',
        'ILPA_Due_Diligence_Questionnaire_v1.2.pdf'
    ]

    for pdf_file in pdf_files:
        file_path = os.path.join(data_dir, pdf_file)
        if os.path.exists(file_path):
            text_content = indexer.extract_text_from_pdf(file_path)
            doc = Document(id=pdf_file, filename=pdf_file, content=text_content, chunks=[])
            print(f'  ✓ Indexing: {pdf_file} ({len(text_content)} chars)')
            indexer.index_document(doc)
        else:
            print(f'  ✗ File not found: {pdf_file}')

    print(f"  📊 Total indexed: {len(indexer.documents_indexed)} documents")

    # Step 2: Test search
    print("\n🔍 Step 2: Testing Document Search")
    test_queries = ['company', 'MiniMax', 'financial', 'report']
    for query in test_queries:
        results = indexer.search(query, k=1)
        status = "✓" if results else "✗"
        print(f"  {status} '{query}': {len(results)} results")

    # Step 3: AI Q&A Demo
    print("\n🤖 Step 3: AI-Powered Answers")
    questions = [
        "What is the company name?",
        "What type of report is this?",
        "Are there any financial statements mentioned?"
    ]

    for question in questions:
        print(f"\n❓ Question: {question}")
        answer = generate_answer('demo-project', question)
        print(f"📝 Answer: {answer.answer_text[:100]}{'...' if len(answer.answer_text) > 100 else ''}")
        print(f"🎯 Confidence: {answer.confidence_score}")
        print(f"📎 Citations: {len(answer.citations)}")

    print("\n✅ Demo Complete!")
    print("The AI is now using Ollama (free, unlimited) instead of OpenRouter!")

if __name__ == "__main__":
    main()