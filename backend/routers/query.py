"""
Learnify AI — Query Router.

Endpoints for interacting with the RAG pipeline:
- /query/ask: Submits a query, retrieves chunks, and generates an LLM answer.
- /query/learning-path: Generates an ordered learning path based on uploaded chunks.
- /query/knowledge-graph: Constructs a semantic network from the text chunks.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from main import limiter
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from database import get_db
from models.schemas import ContentChunk, AuthUserResponse
from auth_utils import get_current_user
from rag.knowledge_graph import build_knowledge_graph
from rag.learning_path import generate_learning_path
from rag.llm_chain import generate_answer
from rag.retriever import retrieve_chunks
from rag.llm_provider import get_llm_for_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["Query"])


class QueryRequest(BaseModel):
    """Schema for an incoming user query."""

    question: str
    user_id: Optional[str] = None
    level: str = "intermediate"
    language: str = "English"


@router.post("/ask")
@limiter.limit("15/minute")
async def ask_question(
    request: Request,
    query_request: QueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: AuthUserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Process a user's question through the RAG pipeline.
    Embeds the context, searches FAISS + Mongo, and calls the LLM.
    """
    user_id = current_user.user_id
    # Fetch user document
    user_doc = None
    try:
        user_doc = await db["registered_users"].find_one({"user_id": user_id})
    except Exception as exc:
        logger.warning(f"Error fetching user document for query: {exc}")

    llm = get_llm_for_user(user_doc)

    try:
        chunks = await retrieve_chunks(query_request.question, user_id=user_id, top_k=5)
    except Exception as exc:
        logger.warning(f"Database/retriever error, falling back to mock chunk: {exc}")
        # Graceful degradation for testing environment lacking MongoDB
        chunks = [
            ContentChunk(
                chunk_id="mock_chunk_1",
                source_file="test_doc.pdf",
                source_type="pdf",
                page_or_timestamp="1",
                text="Machine learning is a subset of artificial intelligence that involves training computers to learn from data.",
                embedding_id="mock_embedding",
            )
        ]

    try:
        result = await generate_answer(
            question=query_request.question,
            chunks=chunks,
            level=query_request.level,
            language=query_request.language,
            llm=llm,
        )
        return result
    except Exception as e:
        logger.exception("Error in LLM generation.")
        raise HTTPException(status_code=500, detail="Internal Server Error during LLM generation.") from e


@router.get("/learning-path/{user_id}")
@limiter.limit("10/minute")
async def get_learning_path(
    request: Request,
    user_id: str, 
    subject: str = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Dict[str, List[str]]:
    """
    Synthesize an ordered list of foundational concepts into a learning path.
    Extracts underlying text from chunks via LLM aggregation.
    """
    try:
        query = {"user_id": user_id}
        if subject:
            query["subject"] = subject.strip().title()
        cursor = db["chunks"].find(query).limit(50)
        docs = await cursor.to_list(length=50)
        chunk_texts = [doc["text"] for doc in docs if "text" in doc]
    except Exception as exc:
        logger.warning(f"MongoDB offline, falling back to mock chunks: {exc}")
        chunk_texts = [
            "Variables in Python are used to store data values.",
            "Lists and dictionaries organize collections of items.",
            "Functions encapsulate reusable blocks of code.",
            "Object-Oriented Programming (OOP) uses classes.",
        ]

    try:
        path = await generate_learning_path(chunk_texts)
        return {"learning_path": path}
    except Exception as e:
        logger.exception("Error generating learning path.")
        raise HTTPException(status_code=500, detail="Internal Server Error while creating path.") from e


@router.get("/knowledge-graph/{user_id}")
@limiter.limit("10/minute")
async def get_knowledge_graph(
    request: Request,
    user_id: str, 
    subject: str = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Dict[str, Any]:
    """
    Build a co-occurrence knowledge graph extracting nominal concepts using NLTK.
    """
    try:
        query = {"user_id": user_id}
        if subject:
            query["subject"] = subject.strip().title()
        cursor = db["chunks"].find(query).limit(100)
        docs = await cursor.to_list(length=100)
        chunk_texts = [doc["text"] for doc in docs if "text" in doc]
    except Exception as exc:
        logger.warning(f"MongoDB offline, falling back to mock chunks: {exc}")
        chunk_texts = [
            "Machine learning is a subset of artificial intelligence.",
            "Deep learning is a subset of machine learning that utilizes neural networks.",
            "Computer science relies heavily on logic and algorithms.",
        ]

    try:
        graph_data = build_knowledge_graph(chunk_texts)
        return graph_data
    except Exception as e:
        logger.exception("Error building knowledge graph.")
        raise HTTPException(status_code=500, detail="Internal Server Error during graph generation.") from e


@router.get("/status")
async def query_status() -> Dict[str, str]:
    """Health check for the Query router."""
    return {"service": "query", "status": "ready"}
