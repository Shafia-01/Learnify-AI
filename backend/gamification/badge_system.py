from typing import List
from models.schemas import UserProfile
from motor.motor_asyncio import AsyncIOMotorDatabase

BADGE_DEFINITIONS = [
    {"id": "streak_7", "name": "Week Warrior", "description": "7-day learning streak", "xp_threshold": None, "trigger": "streak_7"},
    {"id": "xp_100", "name": "Century Scholar", "description": "Earn 100 XP", "xp_threshold": 100, "trigger": None},
    {"id": "xp_500", "name": "Knowledge Knight", "description": "Earn 500 XP", "xp_threshold": 500, "trigger": None},
    {"id": "xp_1000", "name": "Learning Legend", "description": "Earn 1000 XP", "xp_threshold": 1000, "trigger": None},
]

async def check_and_award_badges(db: AsyncIOMotorDatabase, user_id: str, user_profile: UserProfile) -> List[str]:
    """
    Checks all BADGE_DEFINITIONS against user's current state.
    Returns list of newly unlocked badge IDs.
    Updates user.badges in MongoDB.
    
    Args:
        db (AsyncIOMotorDatabase): Database handle.
        user_id (str): User identifier.
        user_profile (UserProfile): Current user profile data.
        
    Returns:
        List[str]: List of newly awarded badge IDs.
    """
    newly_unlocked = []
    current_badges = set(user_profile.badges)
    
    for badge in BADGE_DEFINITIONS:
        badge_id = badge["id"]
        if badge_id in current_badges:
            continue
            
        unlocked = False
        
        # Check XP threshold
        if badge["xp_threshold"] is not None:
            if user_profile.xp >= badge["xp_threshold"]:
                unlocked = True
        
        # Check trigger: streak_7 requires 7+ consecutive learning days
        if badge["trigger"] == "streak_7":
            if user_profile.streak_days >= 7:
                unlocked = True

        if unlocked:
            newly_unlocked.append(badge_id)
    
    if newly_unlocked:
        updated_badges = list(current_badges.union(newly_unlocked))
        await db["users"].update_one(
            {"user_id": user_id},
            {"$set": {"badges": updated_badges}}
        )
        
    return newly_unlocked
