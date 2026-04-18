"""
Learnify AI — RAG Retrieval Engine.

Handles query embedding using SentenceTransformers and similarity search
against the FAISS index, followed by result hydration from MongoDB.
"""

import logging
from typing import List

from models.schemas import ContentChunk
from embedder import embed_query
from vector_store import search_index
import database

logger = logging.getLogger(__name__)


async def retrieve_chunks(query: str, top_k: int = 5) -> List[ContentChunk]:
    """
    Retrieve the most relevant content chunks for a given query.

    The process follows these steps:
    1. Embed the query string using the local embedder module.
    2. Search the FAISS index for the top-k nearest neighbour's chunk IDs.
    3. Fetch the full chunk documents (metadata + text) from MongoDB.
    4. Re-sort the documents to match the distance-based order from FAISS.

    Args:
        query: User-provided query or prompt.
        top_k: Number of chunks to retrieve. Defaults to 5.

    Returns:
        A list of ContentChunk Pydantic models.
        Returns an empty list if no chunks are found or the index is empty.
    """
    # 1. Embed query
    query_vector = embed_query(query)
    
    if query_vector.size == 0:
        logger.warning("Query embedding failed or query is empty.")
        return []

    # 2. Search FAISS index for candidate IDs
    try:
        chunk_ids = search_index(query_vector, top_k=top_k)
    except RuntimeError as exc:
        # search_index raises RuntimeError if index doesn't exist
        logger.error("FAISS search failed: %s", exc)
        return []

    if not chunk_ids:
        logger.info("No matching chunks found in FAISS for query: '%s'", query)
        return []

    # 3. Fetch full chunks from MongoDB
    # Note: database.init_db() must have been called for database._db to be set.
    if database._db is None:
        logger.error("Database handle is None. Ensure init_db() was called.")
        raise RuntimeError("Database not initialised.")

    collection = database._db["chunks"]
    cursor = collection.find({"chunk_id": {"$in": chunk_ids}})
    docs = await cursor.to_list(length=top_k)

    # 4. Map back to ContentChunk objects, maintaining FAISS distance order
    doc_map = {doc["chunk_id"]: doc for doc in docs}
    
    ordered_chunks: List[ContentChunk] = []
    for cid in chunk_ids:
        if cid in doc_map:
            # Pydantic validates the DB dict into a ContentChunk object
            ordered_chunks.append(ContentChunk(**doc_map[cid]))

    logger.info("Retrieved %d relevant chunks for query.", len(ordered_chunks))
    return ordered_chunks
