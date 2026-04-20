"""
Learnify AI — LLM Chain.

Provides the core logic to formulate a context-aware prompt, interact with
LangChain's LLM implementations (Gemini, Groq, Ollama), and parse out
the citations from the final generated response.
"""

import logging
import re
from typing import Any, Dict, List

from langchain_core.output_parsers import StrOutputParser
from rag.llm_provider import get_llm

from config import settings
from models.schemas import ContentChunk
from rag.prompts import (
    ADVANCED_PROMPT,
    BEGINNER_PROMPT,
    INTERMEDIATE_PROMPT,
    LANGUAGE_INSTRUCTION,
)

logger = logging.getLogger(__name__)


def _parse_citations(text: str) -> tuple[str, List[Dict[str, str]]]:
    """
    Parse the LLM response to split the answer and extract structured citations.

    Expects the LLM to end its response with "\nSources:\n- [file.pdf, Page 1]"
    or similar format as instructed by the prompts.

    Args:
        text: Raw output string from the LLM.

    Returns:
        A tuple of (clean_answer, list_of_citation_dicts).
    """
    # Split specifically on a "Sources:" or "Source:" heading at the bottom of the response.
    # regex accommodates markdown boldness and singular/plural.
    split_text = re.split(r"\n(?:\*\*?)?Sources?:(?:\*\*?)?\s*\n", text, flags=re.IGNORECASE)

    if len(split_text) == 1:
        # If the LLM failed to include a sources block, return the whole text.
        return text.strip(), []

    answer = split_text[0].strip()
    sources_text = split_text[-1].strip()

    citations: List[Dict[str, str]] = []
    # Find all bracketed citations e.g. [some_file.pdf, 14]
    matches = re.findall(r"\[([^\]]+)\]", sources_text)

    for match in matches:
        parts = [p.strip() for p in match.split(",")]
        source_file = parts[0]
        # Some citations may not have a page number
        page_or_timestamp = parts[1] if len(parts) > 1 else ""
        citations.append(
            {
                "source_file": source_file,
                "page_or_timestamp": page_or_timestamp,
            }
        )

    # Deduplicate citations while preserving order
    unique_citations = []
    seen = set()
    for citation in citations:
        tup = (citation["source_file"], citation["page_or_timestamp"])
        if tup not in seen:
            seen.add(tup)
            unique_citations.append(citation)

    return answer, unique_citations


async def generate_answer(
    question: str,
    chunks: List[ContentChunk],
    level: str,
    language: str = "English",
) -> Dict[str, Any]:
    """
    Generate an answer using RAG context arrays, respecting the user's
    proficiency level and target language.

    Args:
        question: User's query string.
        chunks: List of relevant database chunks mapped to ContentChunk schemas.
        level: "beginner", "intermediate", or "advanced".
        language: E.g. "English", "Hindi", "French". Defaults to English.

    Returns:
        A dict containing the final "answer" text, the parsed "citations" list,
        and the "level_used".
    """
    # 1. Select the correct level prompt
    if level == "beginner":
        prompt = BEGINNER_PROMPT
    elif level == "advanced":
        prompt = ADVANCED_PROMPT
    else:
        prompt = INTERMEDIATE_PROMPT

    # 2. Extract specific language instruction (or empty string if English)
    lang_inst = LANGUAGE_INSTRUCTION.get(language, "")

    # 3. Serialize chunks into a single unified context string
    context_blocks = []
    for chunk in chunks:
        loc = f", {chunk.page_or_timestamp}" if chunk.page_or_timestamp else ""
        context_blocks.append(f"[Source: {chunk.source_file}{loc}]\n{chunk.text}")

    context_str = "\n\n".join(context_blocks)

    # 4. Construct the chain
    llm = get_llm()
    output_parser = StrOutputParser()

    chain = prompt | llm | output_parser

    # 5. Execute 
    try:
        raw_response = await chain.ainvoke(
            {
                "context": context_str,
                "question": question,
                "language_instruction": lang_inst,
            }
        )
    except Exception as exc:
        logger.error("LLM generation failed: %s", exc)
        return {
            "answer": "Error: The selected LLM provider was unable to process the request.",
            "citations": [],
            "level_used": level,
        }

    # 6. Parse unstructured output down to clean text and metadata
    answer_text, citations_list = _parse_citations(raw_response)

    return {
        "answer": answer_text,
        "citations": citations_list,
        "level_used": level,
    }
