"""
Learnify AI — Learning Path Generator.

Extracts key concepts from a collection of document text chunks and sequences
them into a logical learning progression (foundational to advanced).
"""

import json
import logging
from typing import List
import re

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

# Reuse the LLM routing logic from llm_chain
from rag.llm_chain import _get_active_llms

logger = logging.getLogger(__name__)

_LEARNING_PATH_TEMPLATE = """You are an expert curriculum designer.
Analyze the following text fragments and extract the main concepts.
Order these concepts logically from the most foundational to the most advanced.

You MUST respond strictly with a valid JSON array of strings. 
Do not include any markdown, explanation, or code block backticks.
Just the plain JSON array. Example: ["Concept A", "Concept B"]

Text fragments:
{texts}
"""

_prompt = PromptTemplate(
    input_variables=["texts"],
    template=_LEARNING_PATH_TEMPLATE,
)

async def generate_learning_path(chunk_texts: List[str]) -> List[str]:
    """
    Extract key concepts from texts and order them logically.

    Args:
        chunk_texts: A list of text strings extracted from uploaded documents.

    Returns:
        An ordered list of concept strings (the learning path).
    """
    if not chunk_texts:
        return []

    combined_texts = "\n\n---\n\n".join(chunk_texts)
    
    primary_llm, fallback_llm = _get_active_llms()
    output_parser = StrOutputParser()
    chain = _prompt | primary_llm | output_parser

    try:
        raw_output = await chain.ainvoke({"texts": combined_texts})
    except Exception as exc:
        logger.warning("Primary LLM learning path generation failed: %s", exc)
        if fallback_llm is None:
            return []
        
        fallback_chain = _prompt | fallback_llm | output_parser
        try:
            raw_output = await fallback_chain.ainvoke({"texts": combined_texts})
        except Exception as fallback_exc:
            logger.error("Fallback LLM learning path generation failed: %s", fallback_exc)
            return []

    # Clean the raw output in case the LLM ignored instructions and used markdown
    clean_output = raw_output.strip()
    if clean_output.startswith("```json"):
        clean_output = clean_output[7:]
    elif clean_output.startswith("```"):
        clean_output = clean_output[3:]
    
    if clean_output.endswith("```"):
        clean_output = clean_output[:-3]
    
    clean_output = clean_output.strip()

    # Attempt to parse as JSON array
    try:
        concepts = json.loads(clean_output)
        if isinstance(concepts, list):
            # Ensure all elements are strings
            return [str(c) for c in concepts]
        return []
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM output as JSON. Raw output: %s", clean_output)
        # Fallback heuristic: Try to find a list format in text
        lines = clean_output.split('\n')
        fallback_concepts = []
        for line in lines:
            line = line.strip()
            # Strip bullets or numbers
            line = re.sub(r'^(\d+\.|\-|\*|\+)\s+', '', line)
            if line and len(line) > 2 and not line.startswith('['):
                # Clean quotes and commas
                line = line.strip('",\'')
                fallback_concepts.append(line)
        return fallback_concepts

