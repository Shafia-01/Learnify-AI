"""
Learnify AI — LLM Chain.

Provides the core logic to formulate a context-aware prompt, interact with
LangChain's LLM implementations (Gemini, Groq, Ollama), and parse out
the citations from the final generated response.
"""

import logging
import re
from typing import Any, Dict, List

from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from config import settings
from models.schemas import ContentChunk
from rag.prompts import (
    ADVANCED_PROMPT,
    BEGINNER_PROMPT,
    INTERMEDIATE_PROMPT,
    LANGUAGE_INSTRUCTION,
)

logger = logging.getLogger(__name__)

# ── LLM Client Initialization ─────────────────────────────────────────────

# Primary: Google Gemini (Free tier)
_gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.7,
)

# Fallback: Groq LLaMA 3.1 (Free tier)
_groq_llm = ChatGroq(
    model_name="llama-3.1-8b-instant",
    groq_api_key=settings.GROQ_API_KEY,
    temperature=0.7,
)

# Privacy Mode: Local Ollama Model
_ollama_llm = ChatOllama(
    model="llama3",
    base_url=settings.OLLAMA_BASE_URL,
    temperature=0.7,
)


def _get_active_llms() -> tuple[Any, Any]:
    """Retrieve the primary and fallback LLMs depending on app configuration."""
    if settings.PRIVACY_MODE:
        # Fully offline — no fallback
        return _ollama_llm, None
    return _gemini_llm, _groq_llm


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
    # Split specifically on a "Sources:" heading at the bottom of the response.
    # regex accommodates markdown boldness on the word Sources.
    split_text = re.split(r"\n(?:\*\*?)?Sources:(?:\*\*?)?\s*\n", text, flags=re.IGNORECASE)

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
    primary_llm, fallback_llm = _get_active_llms()
    output_parser = StrOutputParser()

    chain = prompt | primary_llm | output_parser

    # 5. Execute with explicit fallback routing
    try:
        raw_response = await chain.ainvoke(
            {
                "context": context_str,
                "question": question,
                "language_instruction": lang_inst,
            }
        )
    except Exception as primary_exc:
        logger.warning("Primary LLM generation failed: %s", primary_exc)

        if fallback_llm is None:
            # i.e., in Privacy Mode with Ollama failing
            logger.error("No fallback LLM available (Privacy Mode active).")
            return {
                "answer": "Error: Local LLM is unreachable. Ensure Ollama is running.",
                "citations": [],
                "level_used": level,
            }

        logger.info("Falling back to secondary LLM (Groq LLaMA 3).")
        fallback_chain = prompt | fallback_llm | output_parser

        try:
            raw_response = await fallback_chain.ainvoke(
                {
                    "context": context_str,
                    "question": question,
                    "language_instruction": lang_inst,
                }
            )
        except Exception as fallback_exc:
            logger.error("Fallback LLM generation also failed: %s", fallback_exc)
            return {
                "answer": "Error: Both primary and fallback LLMs are unable to process the request.",
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
