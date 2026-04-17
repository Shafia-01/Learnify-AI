"""
Learnify AI — Ingestion Router.

Exposes two POST endpoints that drive the full content-ingestion pipeline:

  POST /ingest/upload  — accepts a multipart file (PDF, PPT, TXT)
  POST /ingest/youtube — accepts a JSON body with a YouTube URL

Both endpoints:
  1. Route to the correct parser.
  2. Chunk the parsed items with LangChain RecursiveCharacterTextSplitter.
  3. Generate 768-dimensional embeddings via Gemini.
  4. Store chunk dicts in MongoDB (``chunks`` collection).
  5. Add embedding vectors to the FAISS index on disk.
  6. Return {"message": "processed", "chunks_created": N}.

Temporary files uploaded via multipart are written to the system temp
directory and cleaned up after processing regardless of success or failure.
"""

import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from chunker import chunk_content
from database import get_db
from embedder import embed_chunks
from parsers.pdf_parser import parse_pdf
from parsers.ppt_parser import parse_ppt
from parsers.txt_parser import parse_txt
from parsers.youtube_parser import parse_youtube
from vector_store import build_or_update_index

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

# ── Supported MIME / extension maps ──────────────────────────────────────

_EXTENSION_TO_SOURCE_TYPE: Dict[str, str] = {
    ".pdf": "pdf",
    ".ppt": "ppt",
    ".pptx": "ppt",
    ".txt": "txt",
}


# ── Pydantic models ───────────────────────────────────────────────────────


class YouTubeIngestRequest(BaseModel):
    """Request body for the YouTube ingestion endpoint."""

    url: str


class IngestResponse(BaseModel):
    """Standard response returned by both ingestion endpoints."""

    message: str
    chunks_created: int


# ── Internal pipeline helper ─────────────────────────────────────────────


async def _run_pipeline(
    raw_items: list[dict[str, Any]],
    source_type: str,
    db: AsyncIOMotorDatabase,
) -> int:
    """
    Execute the shared chunking → embedding → storage pipeline.

    Args:
        raw_items:   Output list of dicts from any parser.
        source_type: One of ``"pdf"``, ``"ppt"``, ``"txt"``, ``"youtube"``.
        db:          MongoDB database handle (injected by FastAPI dependency).

    Returns:
        The number of chunks successfully stored.

    Raises:
        HTTPException: If the pipeline produces zero chunks (empty source).
    """
    # ── 1. Chunk ──────────────────────────────────────────────────────────
    chunks = chunk_content(raw_items, source_type)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="The uploaded content produced no processable text chunks.",
        )

    # ── 2. Embed ──────────────────────────────────────────────────────────
    embeddings_list, embeddings_array = embed_chunks(chunks)

    # ── 3. Attach embedding_id (positional index within this batch) ───────
    # We use chunk_id as the embedding_id since the FAISS sidecar maps
    # positions → chunk_ids.  The chunk_id is stable across restarts.
    for chunk in chunks:
        chunk["embedding_id"] = chunk["chunk_id"]

    # ── 4. Persist to MongoDB ─────────────────────────────────────────────
    await db["chunks"].insert_many(chunks)
    logger.info("Inserted %d chunks into MongoDB.", len(chunks))

    # ── 5. Add vectors to FAISS ───────────────────────────────────────────
    chunk_ids = [c["chunk_id"] for c in chunks]
    build_or_update_index(embeddings_array, chunk_ids)

    return len(chunks)


# ── Endpoints ─────────────────────────────────────────────────────────────


@router.post("/upload", response_model=IngestResponse, status_code=200)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """
    Ingest a document file (PDF, PPT, PPTX, or TXT) into the learning system.

    The file is temporarily saved to the OS temp directory, parsed, chunked,
    embedded, and stored.  The temp file is always cleaned up on exit.

    Args:
        file: The uploaded file (multipart/form-data).
        db:   Injected MongoDB database dependency.

    Returns:
        JSON with ``message`` and ``chunks_created`` fields.

    Raises:
        HTTPException 415: For unsupported file types.
        HTTPException 422: If the file yields no text.
    """
    suffix = Path(file.filename or "upload").suffix.lower()
    source_type = _EXTENSION_TO_SOURCE_TYPE.get(suffix)

    if source_type is None:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{suffix}'. "
                "Accepted types: .pdf, .ppt, .pptx, .txt"
            ),
        )

    # Write the upload to a temp file on disk so parsers can open it
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)

        # Route to the correct parser
        if source_type == "pdf":
            raw_items = parse_pdf(tmp_path)
        elif source_type == "ppt":
            raw_items = parse_ppt(tmp_path)
        else:
            raw_items = parse_txt(tmp_path)

        # Override source_file to use the original uploaded filename
        for item in raw_items:
            item["source_file"] = file.filename or item.get("source_file", "")

        chunks_created = await _run_pipeline(raw_items, source_type, db)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled error during file ingestion: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error while processing the file: {exc}",
        ) from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return {"message": "processed", "chunks_created": chunks_created}


@router.post("/youtube", response_model=IngestResponse, status_code=200)
async def ingest_youtube(
    body: YouTubeIngestRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """
    Ingest a YouTube video transcript into the learning system.

    Fetches the auto-generated or manual transcript, groups it into
    ~500-word chunks, embeds them, and stores them.

    Args:
        body: JSON body containing the YouTube video ``url``.
        db:   Injected MongoDB database dependency.

    Returns:
        JSON with ``message`` and ``chunks_created`` fields.

    Raises:
        HTTPException 404: If no captions are available for the video.
        HTTPException 400: If the URL cannot be parsed to a video ID.
    """
    try:
        raw_items = parse_youtube(body.url)
        chunks_created = await _run_pipeline(raw_items, "youtube", db)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled error during YouTube ingestion: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error while processing the YouTube URL: {exc}",
        ) from exc

    return {"message": "processed", "chunks_created": chunks_created}


@router.get("/status")
async def ingest_status() -> Dict[str, str]:
    """Return ingestion service readiness."""
    return {"service": "ingest", "status": "ready"}
