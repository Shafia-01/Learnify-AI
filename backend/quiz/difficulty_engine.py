from motor.motor_asyncio import AsyncIOMotorDatabase

async def update_score(db: AsyncIOMotorDatabase, user_id: str, is_correct: bool, topic: str = "overall") -> int:
    """
    Updates the running score for a user's topic.
    On correct: score += 10 (capped at 100). On wrong: score -= 10 (floor 0).
    Running score starts at 50 if not present.
    Persists score in MongoDB users collection under quiz_scores dict.
    Returns the new score.
    """
    user = await db["users"].find_one({"user_id": user_id})
    if not user:
        # If user doesn't exist, we'll create a minimal document for them
        user = {"user_id": user_id, "quiz_scores": {}}
        await db["users"].insert_one(user)
    
    quiz_scores = user.get("quiz_scores", {})
    current_score = quiz_scores.get(topic, 50)
    
    if is_correct:
        current_score = min(100, current_score + 10)
    else:
        current_score = max(0, current_score - 10)
        
    quiz_scores[topic] = current_score
    
    await db["users"].update_one(
        {"user_id": user_id},
        {"$set": {"quiz_scores": quiz_scores}}
    )
    
    return current_score

def get_difficulty_level(score: int) -> int:
    """
    Maps score to difficulty level.
    0-30 -> difficulty 1
    31-50 -> difficulty 2
    51-70 -> difficulty 3
    71-85 -> difficulty 4
    86-100 -> difficulty 5
    """
    if score <= 30:
        return 1
    elif score <= 50:
        return 2
    elif score <= 70:
        return 3
    elif score <= 85:
        return 4
    else:
        return 5
