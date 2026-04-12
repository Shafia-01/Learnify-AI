"""
Learnify AI — Embedding Generator.

Loads the ``all-MiniLM-L6-v2`` sentence-transformers model once at module
level (singleton pattern) and exposes a function to embed a batch of text
chunks.  The model produces 384-dimensional normalised vectors and is
lightweight enough to run on CPU.
"""

import logging
from typing import Any, Dict, List, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ── Singleton model ──────────────────────────────────────────────────────
# Loaded once on first import; subsequent imports reuse the same instance.
_model: SentenceTransformer = SentenceTransformer("all-MiniLM-L6-v2")

# Embedding dimension for this model (used for empty-input fallback)
_EMBEDDING_DIM: int = 384


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
            - A NumPy 2-D array of shape ``(N, 384)`` — for FAISS indexing.
    """
    texts = [chunk.get("text", "") for chunk in chunks]

    if not texts:
        logger.warning("embed_chunks called with empty chunk list.")
        return [], np.empty((0, _EMBEDDING_DIM), dtype=np.float32)

    # SentenceTransformer.encode returns ndarray of shape (N, 384)
    embeddings_array: np.ndarray = _model.encode(
        texts,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)

    embeddings_list: List[List[float]] = embeddings_array.tolist()

    logger.info(
        "Generated %d embeddings of dimension %d.",
        len(embeddings_list),
        embeddings_array.shape[1],
    )

    return embeddings_list, embeddings_array
