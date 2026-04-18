import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Tuple

logger = logging.getLogger(__name__)

# Load model once at module level — cached after first load
_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Sentence transformer embedding model loaded successfully.")


def embed_chunks(chunks: List[dict]) -> Tuple[List[List[float]], np.ndarray]:
    """
    Generate embeddings for a list of chunk dicts.
    Returns both a Python list (for MongoDB) and numpy array (for FAISS).
    """
    texts = [chunk.get("text", "") for chunk in chunks]
    
    logger.info(f"Generating embeddings for {len(texts)} chunks...")
    embeddings_array = _model.encode(texts, show_progress_bar=False)
    embeddings_list = embeddings_array.tolist()
    
    logger.info("Embeddings generated successfully.")
    return embeddings_list, embeddings_array


def embed_query(query: str) -> np.ndarray:
    """
    Generate embedding for a single query string.
    Returns numpy array for FAISS similarity search.
    """
    return _model.encode([query])[0]