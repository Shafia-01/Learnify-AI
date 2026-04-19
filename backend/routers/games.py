"""
Learnify AI — Mini Games Router.

Handles score persistence, XP awards, leaderboards, and game content generation.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from games.word_extractor import get_scramble_words
from models.schemas import (
    GameLeaderboardEntry,
    GameName,
    GameScoreResponse,
    SubmitScoreRequest,
    WordScrambleWord,
)

router = APIRouter(prefix="/games", tags=["Games"])

# XP Award Constants
BASE_GAME_XP = 5
HIGH_SCORE_BONUS_XP = 20


async def _award_xp(db: AsyncIOMotorDatabase, user_id: str, amount: int) -> None:
    """
    Increments XP for a user in both the registration and legacy collections.
    """
    if amount <= 0:
        return
        
    await db["registered_users"].update_one(
        {"user_id": user_id},
        {"$inc": {"xp": amount}}
    )
    await db["users"].update_one(
        {"user_id": user_id},
        {"$inc": {"xp": amount}}
    )


@router.post("/score", response_model=GameScoreResponse)
async def submit_score(payload: SubmitScoreRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Submits a user's score for a game session.
    Persists the session, updates high scores, and awards XP.
    """
    user_id = payload.user_id
    game_key = payload.game_name.value
    score = payload.score

    # 1. Identify user (check registration first, then legacy)
    user = await db["registered_users"].find_one({"user_id": user_id})
    if not user:
        user = await db["users"].find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

    # 2. Determine if it's a new high score
    game_scores = user.get("game_scores", {})
    prev_high = game_scores.get(game_key, 0)
    
    is_new_record = score > prev_high
    new_high = max(score, prev_high)
    
    # 3. Calculate XP
    xp_to_award = BASE_GAME_XP
    if is_new_record:
        xp_to_award += HIGH_SCORE_BONUS_XP

    # 4. Database Updates
    now = datetime.utcnow()
    
    # Update high score maps
    await db["registered_users"].update_one(
        {"user_id": user_id},
        {"$set": {f"game_scores.{game_key}": new_high}}
    )
    await db["users"].update_one(
        {"user_id": user_id},
        {"$set": {f"game_scores.{game_key}": new_high}}
    )
    
    # Grant XP
    await _award_xp(db, user_id, xp_to_award)

    # Record the raw session event
    session_doc = {
        "user_id": user_id,
        "game_name": game_key,
        "score": score,
        "duration_seconds": payload.duration_seconds,
        "timestamp": now,
        "xp_awarded": xp_to_award,
        "is_high_score": is_new_record
    }
    await db["game_sessions"].insert_one(session_doc)

    message = f"Gained {xp_to_award} XP!"
    if is_new_record:
        message += " New High Score achieved! 🏆"

    return GameScoreResponse(
        game_name=payload.game_name,
        submitted_score=score,
        previous_high_score=prev_high,
        new_high_score=new_high,
        is_new_record=is_new_record,
        xp_awarded=xp_to_award,
        message=message
    )


@router.get("/scores/{user_id}")
async def get_user_scores(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns high scores for all games for a specific user.
    """
    user = await db["registered_users"].find_one({"user_id": user_id})
    if not user:
        user = await db["users"].find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

    stored_scores = user.get("game_scores", {})
    
    # Ensure all game keys exist in the output for frontend consistency
    normalized = {}
    for game in GameName:
        normalized[game.value] = stored_scores.get(game.value, 0)
        
    total_played = await db["game_sessions"].count_documents({"user_id": user_id})

    return {
        "user_id": user_id,
        "scores": normalized,
        "total_games_played": total_played
    }


@router.get("/word-scramble/{user_id}", response_model=List[WordScrambleWord])
async def get_word_scramble(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Generates tailored word scramble content using the user's uploaded material.
    """
    # Cap at 10 words per request
    return await get_scramble_words(db, user_id, count=10)


@router.get("/leaderboard/{game_name}", response_model=List[GameLeaderboardEntry])
async def get_leaderboard(game_name: GameName, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns the top 10 scores for a given game.
    """
    game_key = game_name.value
    
    # Query users with high scores > 0, sorted descending
    cursor = db["registered_users"].find(
        {f"game_scores.{game_key}": {"$gt": 0}}
    ).sort(f"game_scores.{game_key}", -1).limit(10)
    
    results = []
    rank = 1
    async for entry in cursor:
        results.append(GameLeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            username=entry["username"],
            name=entry["name"],
            score=entry["game_scores"][game_key],
            avatar_emoji=entry.get("avatar_emoji", "🎓")
        ))
        rank += 1
        
    return results


@router.get("/status")
async def status_check():
    """Service status health check."""
    return {"service": "mini-games", "status": "active"}
