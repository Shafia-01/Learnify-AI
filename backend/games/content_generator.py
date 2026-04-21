import logging
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate
from models.schemas import QuizQuestion, MemoryPair, FlashcardCard, QuestionType
from rag.llm_provider import get_llm
import json

logger = logging.getLogger(__name__)

async def get_user_content_sample(db: AsyncIOMotorDatabase, user_id: str, sample_size: int = 10) -> str:
    """Fetches a random sample of user material to use as context."""
    cursor = db["chunks"].aggregate([
        {"$match": {"user_id": user_id}},
        {"$sample": {"size": sample_size}}
    ])
    texts = []
    async for chunk in cursor:
        texts.append(chunk.get("text", ""))
    return "\n\n".join(texts)

async def generate_game_questions(db: AsyncIOMotorDatabase, user_id: str, count: int = 5) -> List[QuizQuestion]:
    """Generates MCQ questions for Snake and Falling Quiz."""
    context = await get_user_content_sample(db, user_id)
    if not context:
        return []

    prompt = PromptTemplate.from_template(
        "Generate {count} multiple choice questions (MCQ) based on this text:\n{context}\n\n"
        "Return a JSON array of objects with: question_text, options (list of 4), correct_answer, difficulty (1-5)."
        "Output ONLY raw JSON."
    )
    
    try:
        llm = get_llm()
        response = await (prompt | llm).ainvoke({"count": count, "context": context})
        content = response.content.strip()
        # Clean markdown
        content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        questions = []
        for item in data:
            questions.append(QuizQuestion(
                question_text=item["question_text"],
                question_type=QuestionType.MCQ,
                options=item["options"],
                correct_answer=item["correct_answer"],
                difficulty=item.get("difficulty", 3)
            ))
        return questions
    except Exception as e:
        logger.error(f"Error generating game questions: {e}")
        return []

async def generate_memory_pairs(db: AsyncIOMotorDatabase, user_id: str, count: int = 6) -> List[MemoryPair]:
    """Generates Term-Match pairs for Memory Match."""
    context = await get_user_content_sample(db, user_id)
    if not context:
        return []

    prompt = PromptTemplate.from_template(
        "Extract {count} key terms and their brief (1-5 words) definitions/matches from this text:\n{context}\n\n"
        "Return a JSON array of objects with: term, match."
        "Output ONLY raw JSON."
    )
    
    try:
        llm = get_llm()
        response = await (prompt | llm).ainvoke({"count": count, "context": context})
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return [MemoryPair(**item) for item in data]
    except Exception as e:
        logger.error(f"Error generating memory pairs: {e}")
        return []

async def generate_flashcards(db: AsyncIOMotorDatabase, user_id: str, count: int = 8) -> List[FlashcardCard]:
    """Generates Flashcards for the Flashcard Flip game."""
    context = await get_user_content_sample(db, user_id)
    if not context:
        return []

    prompt = PromptTemplate.from_template(
        "Generate {count} flashcards (concept/question on front, explanation on back) from this text:\n{context}\n\n"
        "Return a JSON array of objects with: front, back, hint (optional)."
        "Output ONLY raw JSON."
    )
    
    try:
        llm = get_llm()
        response = await (prompt | llm).ainvoke({"count": count, "context": context})
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return [FlashcardCard(**item) for item in data]
    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        return []
