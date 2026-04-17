from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging

async def update_streak(db: AsyncIOMotorDatabase, user_id: str) -> int:
    """
    Updates the learning streak for a user.
    
    If the user was active yesterday, increment streak.
    If active today, do nothing (streak already recorded).
    If last active > 1 day ago, reset streak to 1.
    
    Args:
        db (AsyncIOMotorDatabase): Database handle.
        user_id (str): User identifier.
        
    Returns:
        int: The updated streak length.
    """
    user_doc = await db["users"].find_one({"user_id": user_id})
    if not user_doc:
        # If user doesn't exist, we can't really update streak.
        # But for robust testing, we'll create a default one.
        now = datetime.utcnow()
        await db["users"].insert_one({
            "user_id": user_id,
            "name": f"Learner_{user_id[:4]}",
            "streak_days": 1,
            "last_active_date": now,
            "xp": 0,
            "badges": []
        })
        return 1
    
    last_active = user_doc.get("last_active_date")
    streak_days = user_doc.get("streak_days", 0)
    now = datetime.utcnow()
    today = now.date()
    
    if last_active:
        if isinstance(last_active, datetime):
            last_date = last_active.date()
        else:
            # Handle potential string or other types if necessary
            last_date = today # Fallback
            
        if last_date == today:
            # Already active today, no change
            return streak_days
        
        yesterday = today - timedelta(days=1)
        if last_date == yesterday:
            # Consecutive day!
            streak_days += 1
        else:
            # Gap of more than one day
            streak_days = 1
    else:
        # First time activity
        streak_days = 1
        
    await db["users"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "streak_days": streak_days,
                "last_active_date": now
            }
        }
    )
    
    return streak_days
