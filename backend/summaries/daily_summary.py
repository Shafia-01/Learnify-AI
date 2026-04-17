from typing import List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate
from rag.llm_provider import get_llm
import logging

logger = logging.getLogger(__name__)

async def generate_daily_summary(db: AsyncIOMotorDatabase, user_id: str, session_chunks: List[str]) -> str:
    """
    Uses Gemini to produce a concise summary (max 200 words) of everything studied
    in the current session.
    Stores the summary in MongoDB under sessions collection.
    """
    if not session_chunks:
        return "No content to summarize."
        
    llm = get_llm()
    
    combined_text = "\n\n".join(session_chunks)
    # Using a simple chain instead of load_summarize_chain to reduce dependency issues
    prompt = PromptTemplate.from_template(
        "Summarize the following text concisely in a maximum of 200 words.\n\n"
        "Text to summarize:\n{text}\n\n"
        "Summary:"
    )
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"text": combined_text})
        summary = result.content.strip()
        
        doc = {
            "user_id": user_id,
            "summary": summary,
            "created_at": datetime.utcnow()
        }
        await db["sessions"].insert_one(doc)
        
        return summary
    except Exception as e:
        logger.error("Failed to generate daily summary: %s", e)
        return "Error generating summary."
