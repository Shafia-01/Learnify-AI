"""
Learnify AI — Embedding Generator.

Loads the `GoogleGenerativeAIEmbeddings` using `models/text-embedding-004`
to embed a batch of text chunks. The model produces 768-dimensional normalised vectors.
"""

import logging
from typing import Any, Dict, List, Tuple

import numpy as np
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import settings

logger = logging.getLogger(__name__)

# ── Singleton model ──────────────────────────────────────────────────────
# Loaded once on first import; subsequent imports reuse the same instance.
_model: GoogleGenerativeAIEmbeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.GEMINI_API_KEY
)

# Embedding dimension for this model (used for empty-input fallback)
_EMBEDDING_DIM: int = 768


def embed_chunks(
    chunks: List[Dict[str, Any]],
) -> Tuple[List[List[float]], np.ndarray]:
    """
    Generate embeddings for a list of content chunks.

    Each chunk dict must contain at least a ``text`` key.  The function
    returns both a Python-native list of lists (suitable for MongoDB
    storage) and a NumPy array (suitable for FAISS indexing).

    Args:
        chunks: A list of dicts, each containing at least a ``"text"`` key.

    Returns:
        A tuple of:
            - A Python list of embedding vectors (``list[list[float]]``) —
              one per chunk, for MongoDB storage.
            - A NumPy 2-D array of shape ``(N, 768)`` — for FAISS indexing.
    """
    texts = [chunk.get("text", "") for chunk in chunks]

    if not texts:
        logger.warning("embed_chunks called with empty chunk list.")
        return [], np.empty((0, _EMBEDDING_DIM), dtype=np.float32)

    # GoogleGenerativeAIEmbeddings.embed_documents returns List[List[float]]
    embeddings_list: List[List[float]] = _model.embed_documents(texts)
    
    # Needs to be a float32 ndarray for FAISS
    embeddings_array: np.ndarray = np.array(embeddings_list, dtype=np.float32)

    logger.info(
        "Generated %d embeddings of dimension %d.",
        len(embeddings_list),
        embeddings_array.shape[1],
    )

    return embeddings_list, embeddings_array
