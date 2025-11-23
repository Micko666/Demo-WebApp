"""
Generisanje vektorskih embeddinga za sve LabGuard analite
koristeći OpenAI API + FAISS za brzu semantičku pretragu.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from local_storage_vector import build_vector_index

if __name__ == "__main__":
    print("=" * 70)
    print("BUILDING VECTOR INDEX FOR LABGUARD ANALITI")
    print("=" * 70)
    print()
    print("This will:")
    print("  1. Load all documents from data/knowledge_analiti.json")
    print("  2. Generate OpenAI embeddings for each analit")
    print("  3. Build FAISS index for fast semantic search over analiti")
    print()

    build_vector_index()

    print()
    print("=" * 70)
    print("✓ Vector index built successfully!")
    print("=" * 70)
    print()
    print("You can now use semantic search in your LabGuard chatbot!")
    print()
