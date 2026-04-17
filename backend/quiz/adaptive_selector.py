from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.schemas import QuizQuestion
from quiz.difficulty_engine import get_difficulty_level
from quiz.generator import generate_questions

async def select_next_questions(db: AsyncIOMotorDatabase, user_id: str, n: int = 5, topic: str = "overall") -> List[QuizQuestion]:
    """
    Gets current difficulty level for user. Fetches questions from
    MongoDB filtered by difficulty == current_level. If fewer than n
    available, generate new ones by calling generator.generate_questions.
    Return n questions.
    """
    user = await db["users"].find_one({"user_id": user_id})
    score = 50
    if user and "quiz_scores" in user:
        score = user["quiz_scores"].get(topic, 50)
        
    current_level = get_difficulty_level(score)
    
    # Fetch questions from DB
    cursor = db["quiz_questions"].find({"difficulty": current_level}).limit(n)
    db_questions_docs = await cursor.to_list(length=n)
    
    questions = [QuizQuestion(**doc) for doc in db_questions_docs]
    
    if len(questions) < n:
        shortfall = n - len(questions)
        
        # Get random chunks
        pipeline = [{"$sample": {"size": max(shortfall, 3)}}] # Fetch a few chunks
        chunk_docs = await db["chunks"].aggregate(pipeline).to_list(length=max(shortfall, 3))
        
        chunk_texts = [doc["text"] for doc in chunk_docs]
        if not chunk_texts:
            chunk_texts = [
                "Machine learning is a subfield of artificial intelligence, which is broadly defined as the capability of a machine to imitate intelligent human behavior.",
                "Reinforcement learning is an area of machine learning concerned with how intelligent agents ought to take actions in an environment in order to maximize the notion of cumulative reward."
            ]
            
        new_questions = await generate_questions(
            db=db,
            chunk_texts=chunk_texts,
            n=shortfall,
            question_types=["mcq", "short"]
        )
        
        questions.extend(new_questions)
        
        # Take exactly n if we somehow got more
        questions = questions[:n]
        
    return questions
