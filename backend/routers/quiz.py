from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate

from database import get_db
from models.schemas import QuizQuestion, QuizAttempt, QuestionType
from quiz.adaptive_selector import select_next_questions
from quiz.difficulty_engine import update_score
from rag.llm_provider import get_llm

router = APIRouter(prefix="/quiz", tags=["Quiz"])

class GenerateRequest(BaseModel):
    user_id: str
    n: int = 5
    topic: str = "overall"

class SubmitRequest(BaseModel):
    user_id: str
    question_id: str
    user_answer: str
    topic: str = "overall"

@router.post("/generate", response_model=List[QuizQuestion])
async def generate_quiz(req: GenerateRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    questions = await select_next_questions(db, req.user_id, req.n, req.topic)
    return questions

@router.post("/submit")
async def submit_answer(req: SubmitRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
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
    await update_score(db, req.user_id, is_correct, req.topic)
    
    # Calculate XP
    xp_awarded = 10 if is_correct else 0
    
    # Store Attempt
    attempt = QuizAttempt(
        user_id=req.user_id,
        question_id=req.question_id,
        user_answer=req.user_answer,
        is_correct=is_correct
    )
    await db["quiz_attempts"].insert_one(attempt.model_dump())
    
    # Update user XP
    if xp_awarded > 0:
        await db["users"].update_one(
            {"user_id": req.user_id},
            {"$inc": {"xp": xp_awarded}}
        )
        
    return {
        "is_correct": is_correct,
        "explanation": explanation,
        "xp_awarded": xp_awarded
    }
