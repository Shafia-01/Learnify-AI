from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from main import limiter
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate

from database import get_db
from models.schemas import QuizQuestion, QuizAttempt, QuestionType, AuthUserResponse
from auth_utils import get_current_user
from quiz.adaptive_selector import select_next_questions
from quiz.difficulty_engine import update_score
from rag.llm_provider import get_llm
from summaries.daily_summary import generate_daily_summary
from summaries.flashcard_generator import generate_flashcards

router = APIRouter(prefix="/quiz", tags=["Quiz"])

class GenerateRequest(BaseModel):
    user_id: Optional[str] = None
    n: int = 5
    topic: str = "overall"
    subject: str = None
    source_file: str = None

class SubmitRequest(BaseModel):
    user_id: Optional[str] = None
    question_id: str
    user_answer: str
    topic: str = "overall"

@router.post("/generate", response_model=List[QuizQuestion])
@limiter.limit("10/minute")
async def generate_quiz(
    request: Request,
    req: GenerateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: AuthUserResponse = Depends(get_current_user)
):
    user_id = current_user.user_id
    sub = req.subject.strip().title() if req.subject else None
    questions = await select_next_questions(db, user_id, req.n, req.topic, sub, req.source_file)
    return questions

@router.post("/submit")
@limiter.limit("30/minute")
async def submit_answer(
    request: Request,
    req: SubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: AuthUserResponse = Depends(get_current_user)
):
    user_id = current_user.user_id
    question_doc = await db["quiz_questions"].find_one({"question_id": req.question_id})
    if not question_doc:
        raise HTTPException(status_code=404, detail="Question not found")
        
    question = QuizQuestion(**question_doc)
    is_correct = False
    explanation = ""
    
    if question.question_type in (QuestionType.MCQ, QuestionType.FILL):
        is_correct = req.user_answer.strip().lower() == question.correct_answer.strip().lower()
        explanation = "Exact match" if is_correct else f"Correct answer is {question.correct_answer}"
    else:
        # Short answer
        llm = get_llm()
        prompt = PromptTemplate.from_template(
            "Question: {question}\n"
            "Correct Answer: {correct_answer}\n"
            "User Answer: {user_answer}\n\n"
            "Is this user answer substantially correct? Reply only YES or NO and then one sentence explanation."
        )
        chain = prompt | llm
        try:
            response = await chain.ainvoke({
                "question": question.question_text,
                "correct_answer": question.correct_answer,
                "user_answer": req.user_answer
            })
            content = response.content.strip()
            if content.upper().startswith("YES"):
                is_correct = True
            explanation = content
        except Exception as e:
            is_correct = False
            explanation = "Failed to grade answer automatically."
            
    # Update score
    await update_score(db, user_id, is_correct, req.topic)
    
    # Store Attempt
    attempt = QuizAttempt(
        user_id=user_id,
        question_id=req.question_id,
        user_answer=req.user_answer,
        is_correct=is_correct
    )
    attempt_dict = attempt.model_dump()
    if isinstance(attempt_dict.get("timestamp"), str):
        from datetime import datetime
        attempt_dict["timestamp"] = datetime.fromisoformat(attempt_dict["timestamp"].replace("Z", "+00:00"))
    elif attempt_dict.get("timestamp") is None:
        from datetime import datetime
        attempt_dict["timestamp"] = datetime.utcnow()
    await db["quiz_attempts"].insert_one(attempt_dict)
    
    # Update XP and check badges via gamification engine
    from gamification.xp_engine import award_xp
    xp_result = await award_xp(db, user_id, "quiz_correct" if is_correct else "quiz_wrong")
    
    return {
        "is_correct": is_correct,
        "explanation": explanation,
        "xp_awarded": xp_result["xp_awarded"],
        "badge_unlocked": xp_result["badge_unlocked"],
        "new_total_xp": xp_result["new_total"]
    }

@router.get("/summary/{user_id}")
async def get_summary(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    pipeline = [{"$match": {"user_id": user_id}}, {"$sample": {"size": 3}}]
    chunk_docs = await db["chunks"].aggregate(pipeline).to_list(length=3)
    chunk_texts = [doc["text"] for doc in chunk_docs]
    if not chunk_texts:
        chunk_texts = ["No recent content available for summary."]
    summary = await generate_daily_summary(db, user_id, chunk_texts)
    return {"summary": summary}

@router.get("/flashcards/{user_id}")
async def get_flashcards(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one({"user_id": user_id})
    weak_topics = ["overall"]
    if user and "quiz_scores" in user:
        weak_topics = [t for t, s in user["quiz_scores"].items() if s < 50]
        
    if not weak_topics:
        weak_topics = ["overall"]
        
    pipeline = [{"$match": {"user_id": user_id}}, {"$sample": {"size": 3}}]
    chunk_docs = await db["chunks"].aggregate(pipeline).to_list(length=3)
    chunk_texts = [doc["text"] for doc in chunk_docs]
    if not chunk_texts:
        chunk_texts = ["Machine learning is great.", "Deep learning uses neural networks."]
        
    flashcards = await generate_flashcards(chunk_texts)
    return flashcards

