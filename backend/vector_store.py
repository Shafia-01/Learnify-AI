"""
Learnify AI — FAISS Vector Store.

Manages a persistent FAISS flat-L2 index for nearest-neighbour retrieval.
The index is stored on disk at ``FAISS_INDEX_PATH`` (configured via
config.py).  A parallel JSON sidecar at ``<FAISS_INDEX_PATH>.json`` maps
sequential FAISS integer positions to human-readable chunk_ids so callers
always receive chunk_ids rather than raw array indices.

Design notes:
  - IndexFlatL2 is used for simplicity and exact search.  Swap for
    IndexIVFFlat if the corpus grows beyond ~100k chunks.
  - The sidecar list is append-only and written atomically after the index.
  - All public functions are thread-safe for read; writes should be
    serialised by the calling layer (the ingest router uses async, so there
    is effectively one writer at a time in the single-worker dev setup).
"""

import json
import logging
from pathlib import Path
from typing import List

import faiss
import numpy as np

from config import settings

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────
_INDEX_PATH = Path(settings.FAISS_INDEX_PATH)
_SIDECAR_PATH = Path(str(settings.FAISS_INDEX_PATH) + ".json")

# Embedding dimension produced by models/text-embedding-004
_EMBEDDING_DIM: int = 768


# ── Internal helpers ──────────────────────────────────────────────────────

def _load_index() -> faiss.Index:
    """
    Load the FAISS index from disk if it exists, otherwise create a new one.

    Returns:
        A FAISS ``IndexFlatL2`` — either restored from disk or freshly
        initialised with dimension 768.
    """
    if _INDEX_PATH.exists():
        logger.info("Loading existing FAISS index from '%s'.", _INDEX_PATH)
        return faiss.read_index(str(_INDEX_PATH))

    logger.info("No existing FAISS index found — creating new IndexFlatL2.")
    return faiss.IndexFlatL2(_EMBEDDING_DIM)


def _load_sidecar() -> List[str]:
    """
    Load the chunk_id lookup list from the JSON sidecar file.

    Returns:
        A list of chunk_id strings, ordered by FAISS integer position.
    """
    if _SIDECAR_PATH.exists():
        with _SIDECAR_PATH.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    return []


def _save_sidecar(chunk_ids: List[str]) -> None:
    """
    Persist the chunk_id lookup list to the JSON sidecar file.

    Args:
        chunk_ids: Complete ordered list of chunk_id strings.
    """
    with _SIDECAR_PATH.open("w", encoding="utf-8") as fh:
        json.dump(chunk_ids, fh)


# ── Public API ────────────────────────────────────────────────────────────

def build_or_update_index(
    embeddings: np.ndarray,
    chunk_ids: List[str],
) -> None:
    """
    Add new embeddings to the FAISS index and persist both index and sidecar.

    If an existing index is found on disk it is loaded and the new vectors
    are appended.  The function then writes both the updated index and the
    updated chunk_id sidecar back to disk atomically.

    Args:
        embeddings: A NumPy array of shape ``(N, 768)`` with dtype
                    ``float32`` containing the new embedding vectors.
        chunk_ids:  List of ``N`` chunk_id strings corresponding row-for-row
                    to ``embeddings``.

    Raises:
        ValueError: If the embedding array has the wrong shape or dtype.
    """
    if embeddings.ndim != 2 or embeddings.shape[1] != _EMBEDDING_DIM:
        raise ValueError(
            f"Expected embeddings of shape (N, {_EMBEDDING_DIM}), "
            f"got {embeddings.shape}."
        )

    embeddings = embeddings.astype(np.float32)

    index = _load_index()
    existing_ids = _load_sidecar()

    index.add(embeddings)
    existing_ids.extend(chunk_ids)

    # Ensure the parent directory exists
    _INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(_INDEX_PATH))
    _save_sidecar(existing_ids)

    logger.info(
        "FAISS index updated — total vectors: %d, new vectors added: %d.",
        index.ntotal,
        len(chunk_ids),
    )


def search_index(
    query_embedding: np.ndarray,
    top_k: int = 5,
) -> List[str]:
    """
    Retrieve the chunk_ids of the top-k nearest neighbours for a query vector.

    Args:
        query_embedding: A 1-D NumPy array of shape ``(768,)`` or a 2-D
                         array of shape ``(1, 768)``.
        top_k:           Number of nearest neighbours to return.  Defaults
                         to 5.

    Returns:
        A list of up to ``top_k`` chunk_id strings, ordered by ascending
        L2 distance (closest first).  Returns fewer than ``top_k`` results
        if the index contains fewer vectors.

    Raises:
        RuntimeError: If no FAISS index exists on disk yet.
    """
    if not _INDEX_PATH.exists():
        raise RuntimeError(
            "FAISS index has not been built yet.  Ingest at least one document first."
        )

    index = _load_index()
    chunk_ids = _load_sidecar()

    # Normalise shape to (1, 768) float32
    query = np.array(query_embedding, dtype=np.float32)
    if query.ndim == 1:
        query = query.reshape(1, -1)

    actual_k = min(top_k, index.ntotal)
    if actual_k == 0:
        logger.warning("search_index called on an empty FAISS index.")
        return []

    _distances, indices = index.search(query, actual_k)

    result_ids: List[str] = []
    for idx in indices[0]:
        if idx == -1:
            # FAISS returns -1 for padded results when fewer than k exist
            continue
        if idx < len(chunk_ids):
            result_ids.append(chunk_ids[idx])
        else:
            logger.warning(
                "FAISS returned index %d but sidecar only has %d entries.",
                idx,
                len(chunk_ids),
            )

    return result_ids
