import json
import logging
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate
from pydantic import ValidationError

from models.schemas import QuizQuestion, QuestionType
from rag.llm_provider import get_llm

logger = logging.getLogger(__name__)

async def generate_questions(
    db: AsyncIOMotorDatabase,
    chunk_texts: List[str],
    n: int,
    question_types: List[str]
) -> List[QuizQuestion]:
    """
    Generates n questions from the provided text chunks.
    Uses LLM to produce JSON-formatted questions.
    """
    prompt = PromptTemplate.from_template(
        "Generate {n} quiz questions based on the following text.\n"
        "Question types should be chosen from: {question_types}\n"
        "Output MUST be a valid JSON array of objects, with each object having exactly these keys:\n"
        "- question_text (string)\n"
        "- question_type (string, one of {question_types})\n"
        "- options (list of strings for MCQ, null for others)\n"
        "- correct_answer (string)\n"
        "- difficulty (integer 1-5)\n\n"
        "Text chunks:\n{chunks}\n\n"
        "Only output the raw JSON array. DO NOT INCLUDE ANY MARKDOWN formatting like ```json ... ```. Do not give any introductory text."
    )
    
    llm = get_llm()
    chain = prompt | llm
    
    combined_text = "\n\n".join(chunk_texts)
    
    for attempt in range(2):
        try:
            response = await chain.ainvoke({
                "n": n,
                "question_types": ", ".join(question_types),
                "chunks": combined_text
            })
            
            content = response.content.strip()
            # Strip markdown block if present
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            parsed_json = json.loads(content)
            if not isinstance(parsed_json, list):
                raise ValueError("Expected a JSON array.")
            
            questions = []
            for item in parsed_json:
                q_type_str = item.get("question_type", "mcq").lower()
                q_type = QuestionType.MCQ
                try:
                    q_type = QuestionType(q_type_str)
                except ValueError:
                    q_type = QuestionType.MCQ
                
                # Default MCQ options if empty
                options = item.get("options")
                if q_type == QuestionType.MCQ and not options:
                    options = [item.get("correct_answer")]
                
                q = QuizQuestion(
                    question_text=item.get("question_text", "Unknown"),
                    question_type=q_type,
                    options=options,
                    correct_answer=item.get("correct_answer", ""),
                    difficulty=item.get("difficulty", 3)
                )
                questions.append(q)
            
            # Store in DB
            if questions:
                # Convert to dict for MongoDB
                docs = [q.model_dump() for q in questions]
                await db["quiz_questions"].insert_many(docs)
                
            return questions
            
        except (json.JSONDecodeError, ValueError, ValidationError) as e:
            logger.warning("Attempt %d failed to parse LLM output: %s", attempt + 1, e)
            if attempt == 1:
                return []
        except Exception as e:
            logger.error("Error generating questions: %s", e)
            return []
    
    return []
