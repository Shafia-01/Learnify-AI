from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.schemas import UserProfile
from gamification.badge_system import check_and_award_badges

XP_TABLE = {
    "quiz_correct": 10,
    "quiz_bonus_streak": 5,
    "topic_completed": 25,
    "daily_login": 5,
    "summary_read": 3,
}

async def award_xp(db: AsyncIOMotorDatabase, user_id: str, event_type: str) -> dict:
    """
    Adds XP to user.xp in MongoDB based on the event type.
    Checks for newly unlocked badges and returns the results.
    
    Args:
        db (AsyncIOMotorDatabase): Database handle.
        user_id (str): User identifier.
        event_type (str): Key from XP_TABLE (e.g., 'quiz_correct').
        
    Returns:
        dict: Summary of XP awarded and badge status.
    """
    xp_to_add = XP_TABLE.get(event_type, 0)
    
    user_doc = await db["users"].find_one({"user_id": user_id})
    if not user_doc:
        # Create a default profile if user doesn't exist
        user_profile = UserProfile(user_id=user_id, name=f"Learner_{user_id[:4]}")
        user_doc = user_profile.dict()
        await db["users"].insert_one(user_doc)
    else:
        # Use Pydantic to validate and handle the document
        user_profile = UserProfile(**user_doc)
        
    new_total = user_profile.xp + xp_to_add
    
    # Persist the new XP
    await db["users"].update_one(
        {"user_id": user_id},
        {"$set": {"xp": new_total}}
    )
    
    # Update local profile for badge evaluation
    user_profile.xp = new_total
    
    # Check for new badges
    newly_unlocked = await check_and_award_badges(db, user_id, user_profile)
    
    # If the event is quiz related and first time, we might want to trigger 'quiz_complete_1'
    # But for simplicity, we focus on XP-based badges here.
    
    return {
        "xp_awarded": xp_to_add,
        "new_total": new_total,
        "badge_unlocked": newly_unlocked[0] if newly_unlocked else None
    }
