from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
import numpy as np
import hashlib
from ..models import Document
from ..storage.memory import storage
import uuid
from pypdf import PdfReader
import os

class MockEmbeddings(Embeddings):
    """Mock embeddings for demo purposes"""
    
    def embed_query(self, text: str) -> list:
        # Create a deterministic hash-based embedding
        hash_obj = hashlib.md5(text.encode())
        hash_bytes = hash_obj.digest()
        # Convert to float array and normalize
        embedding = np.array([b / 255.0 for b in hash_bytes])
        # Pad to 1536 dimensions (OpenAI ada-002 dimension)
        embedding = np.pad(embedding, (0, 1536 - len(embedding)), 'constant')
        return embedding.tolist()
    
    def embed_documents(self, texts: list) -> list:
        return [self.embed_query(text) for text in texts]

class DocumentIndexer:
    def __init__(self):
        # Use mock embeddings for demo
        self.embeddings = MockEmbeddings()
        self.vectorstore = None
        self.documents_indexed = set()

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text.strip():  # Only add non-empty pages
                    text += page_text + "\n"
        except Exception as e:
            print(f"Error extracting text from {file_path}: {e}")
        return text

    def index_document(self, doc: Document):
        """Index a document into the vector store"""
        if doc.id in self.documents_indexed:
            return  # Already indexed
        
        # Extract text if not already done
        if not doc.content.strip():
            if os.path.exists(doc.filename):
                doc.content = self.extract_text_from_pdf(doc.filename)
            else:
                print(f"Document file not found: {doc.filename}")
                return
        
        if not doc.content.strip():
            print(f"No content extracted from {doc.filename}")
            return
        
        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_text(doc.content)
        
        # Create chunks with metadata
        doc.chunks = []
        for i, chunk in enumerate(chunks):
            if chunk.strip():  # Only add non-empty chunks
                chunk_id = str(uuid.uuid4())
                doc.chunks.append({
                    "id": chunk_id,
                    "text": chunk,
                    "metadata": {
                        "doc_id": doc.id,
                        "chunk_index": i,
                        "filename": doc.filename
                    }
                })
        
        if not doc.chunks:
            print(f"No chunks created for {doc.filename}")
            return
        
        # Add to vector store
        texts = [c["text"] for c in doc.chunks]
        metadatas = [c["metadata"] for c in doc.chunks]
        
        if self.vectorstore is None:
            self.vectorstore = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
        else:
            self.vectorstore.add_texts(texts, metadatas=metadatas)
        
        self.documents_indexed.add(doc.id)
        storage.save_document(doc)
        print(f"Indexed document {doc.filename} with {len(doc.chunks)} chunks")

    def search(self, query: str, k=5):
        """Search the vector store for relevant chunks"""
        if self.vectorstore:
            return self.vectorstore.similarity_search(query, k=k)
        return []

indexer = DocumentIndexer()