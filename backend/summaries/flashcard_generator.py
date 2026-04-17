import json
import logging
from typing import List, Dict

from langchain_core.prompts import PromptTemplate
from rag.llm_provider import get_llm
from pydantic import ValidationError

logger = logging.getLogger(__name__)

async def generate_flashcards(weak_chunk_texts: List[str]) -> List[Dict[str, str]]:
    """
    Uses Gemini to generate Anki-style flashcards based on provided weak chunk texts.
    Returns a list of dicts with 'front' and 'back' keys.
    """
    if not weak_chunk_texts:
        return []

    prompt = PromptTemplate.from_template(
        "Generate Anki-style flashcards from the following text.\n"
        "Output MUST be a valid JSON array of objects, with each object having exactly these keys:\n"
        "- front (string: The question or term to remember)\n"
        "- back (string: The answer or definition)\n\n"
        "Text chunks:\n{chunks}\n\n"
        "Only output the raw JSON array. DO NOT INCLUDE ANY MARKDOWN formatting like ```json ... ```. Do not give any introductory text."
    )
    
    llm = get_llm()
    chain = prompt | llm
    
    combined_text = "\n\n".join(weak_chunk_texts)
    
    for attempt in range(2):
        try:
            response = await chain.ainvoke({
                "chunks": combined_text
            })
            
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            parsed_json = json.loads(content)
            if not isinstance(parsed_json, list):
                raise ValueError("Expected a JSON array.")
            
            flashcards = []
            for item in parsed_json:
                front = item.get("front")
                back = item.get("back")
                if front and back:
                    flashcards.append({
                        "front": str(front),
                        "back": str(back)
                    })
                    
            return flashcards
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Attempt %d failed to parse LLM output: %s", attempt + 1, e)
            if attempt == 1:
                return []
        except Exception as e:
            logger.error("Error generating flashcards: %s", e)
            return []
            
    return []
