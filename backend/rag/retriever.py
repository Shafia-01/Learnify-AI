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


async def retrieve_chunks(query: str, user_id: str = None, top_k: int = 5) -> List[ContentChunk]:
    # 1. Embed query
    query_vector = embed_query(query)
    
    if query_vector.size == 0:
        logger.warning("Query embedding failed or query is empty.")
        return []

    # 2. Search FAISS index for candidate IDs (fetch more to allow for filtering)
    search_k = 50 if user_id else top_k
    try:
        chunk_ids = search_index(query_vector, top_k=search_k)
    except RuntimeError as exc:
        logger.error("FAISS search failed: %s", exc)
        return []

    if not chunk_ids:
        logger.info("No matching chunks found in FAISS for query: '%s'", query)
        return []

    if database._db is None:
        logger.error("Database handle is None. Ensure init_db() was called.")
        raise RuntimeError("Database not initialised.")

    collection = database._db["chunks"]
    
    # 3. Fetch full chunks from MongoDB, filtering by user_id if provided
    query_filter = {"chunk_id": {"$in": chunk_ids}}
    if user_id:
        query_filter["user_id"] = user_id
        
    cursor = collection.find(query_filter)
    docs = await cursor.to_list(length=search_k)

    # 4. Map back to ContentChunk objects, maintaining FAISS distance order
    doc_map = {doc["chunk_id"]: doc for doc in docs}
    
    ordered_chunks: List[ContentChunk] = []
    for cid in chunk_ids:
        if cid in doc_map:
            # Pydantic validates the DB dict into a ContentChunk object
            ordered_chunks.append(ContentChunk(**doc_map[cid]))

    logger.info("Retrieved %d relevant chunks for query.", min(len(ordered_chunks), top_k))
    return ordered_chunks[:top_k]
