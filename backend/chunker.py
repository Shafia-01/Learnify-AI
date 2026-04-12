"""
Learnify AI — Content Chunker.

Uses LangChain's RecursiveCharacterTextSplitter to break parsed content
items into smaller, overlapping chunks suitable for embedding and retrieval.
All source metadata (file name, page/slide/timestamp) is preserved through
the splitting process.
"""

from typing import Any, Dict, List
from uuid import uuid4

from langchain_text_splitters import RecursiveCharacterTextSplitter

# ── Shared splitter instance ─────────────────────────────────────────────
# 500-character chunks with 50-character overlap balances retrieval
# precision against context window usage downstream.
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_content(
    raw_items: List[Dict[str, Any]],
    source_type: str,
) -> List[Dict[str, Any]]:
    """
    Split parsed content items into smaller chunks for embedding.

    Each output chunk is a dict aligned with the ``ContentChunk`` schema
    fields: ``chunk_id``, ``source_file``, ``source_type``,
    ``page_or_timestamp``, ``text``, and ``embedding_id``.

    The ``embedding_id`` is left empty at this stage and will be populated
    by the embedder after vectors are generated.

    Args:
        raw_items: List of dicts from a parser.  Each must contain at
                   minimum a ``text`` key and a ``source_file`` key.
                   May also contain ``page``, ``slide``, or
                   ``timestamp_start`` depending on source type.
        source_type: One of ``"pdf"``, ``"ppt"``, ``"txt"``, ``"youtube"``.

    Returns:
        A list of dicts matching the ``ContentChunk`` schema shape.
    """
    results: List[Dict[str, Any]] = []

    for item in raw_items:
        text = item.get("text", "")
        source_file = item.get("source_file", "")

        # Determine the page / slide / timestamp label for this item
        if source_type == "pdf":
            page_or_timestamp = str(item.get("page", ""))
        elif source_type == "ppt":
            page_or_timestamp = str(item.get("slide", ""))
        elif source_type == "youtube":
            page_or_timestamp = str(item.get("timestamp_start", ""))
        else:
            # For plain text and any unknown types, no positional info
            page_or_timestamp = ""

        # Split text into sub-chunks
        sub_chunks = _splitter.split_text(text)

        for sub_text in sub_chunks:
            results.append(
                {
                    "chunk_id": uuid4().hex,
                    "source_file": source_file,
                    "source_type": source_type,
                    "page_or_timestamp": page_or_timestamp,
                    "text": sub_text,
                    "embedding_id": "",  # Populated after embedding
                }
            )

    return results
