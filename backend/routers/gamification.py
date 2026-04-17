from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from database import get_db
from models.schemas import UserProfile
from gamification.xp_engine import award_xp
from gamification.streak_tracker import update_streak
from gamification.badge_system import check_and_award_badges

router = APIRouter(prefix="/gamification", tags=["Gamification"])

@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_profile(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns the full user profile including XP, badges, and streak.
    """
    user_doc = await db["users"].find_one({"user_id": user_id})
    if not user_doc:
        # Instead of 404, we'll create a default profile for new users
        new_profile = UserProfile(user_id=user_id, name=f"Learner_{user_id[:4]}")
        await db["users"].insert_one(new_profile.dict())
        return new_profile
    return UserProfile(**user_doc)

@router.post("/award/{user_id}")
async def award_user(user_id: str, payload: Dict[str, Any], db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Awards XP for an event, updates streaks, and checks for badges.
    Returns the update delta.
    """
    event_type = payload.get("event_type")
    if not event_type:
        raise HTTPException(status_code=400, detail="event_type is required")
        
    # 1. Update streak
    new_streak = await update_streak(db, user_id)
    
    # 2. Award XP and check badges
    xp_result = await award_xp(db, user_id, event_type)
    
    # 3. Retrieve final state
    user_doc = await db["users"].find_one({"user_id": user_id})
    
    return {
        "event_processed": event_type,
        "xp_awarded": xp_result["xp_awarded"],
        "new_total_xp": xp_result["new_total"],
        "badge_unlocked": xp_result["badge_unlocked"],
        "streak_days": new_streak,
        "profile": UserProfile(**user_doc)
    }

@router.get("/leaderboard", response_model=List[UserProfile])
async def get_leaderboard(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns the top 10 users sorted by XP descending.
    """
    cursor = db["users"].find().sort("xp", -1).limit(10)
    users = await cursor.to_list(length=10)
    return [UserProfile(**u) for u in users]
