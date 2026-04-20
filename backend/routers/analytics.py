from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from database import get_db
from models.schemas import SessionEvent
from typing import List, Dict, Any
import logging

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.post("/event")
async def log_event(event: SessionEvent, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Logs a session event to MongoDB for later analysis.
    
    Args:
        event (SessionEvent): The event data to log.
        db (AsyncIOMotorDatabase): Database handle.
    """
    # Ensure timestamp is datetime object if it comes as string
    event_dict = event.model_dump()
    if isinstance(event_dict["timestamp"], str):
        event_dict["timestamp"] = datetime.fromisoformat(event_dict["timestamp"].replace("Z", "+00:00"))
        
    await db["sessions"].insert_one(event_dict)
    return {"status": "event_logged", "event_type": event.event_type}

@router.get("/stats/{user_id}")
async def get_stats(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Aggregates learning statistics for a specific user based on logged events and profile data.
    
    Returns:
        dict: Aggregated stats including time spent, topics, and scores.
    """
    # 1. Fetch user profile for quiz scores and topics
    user_doc = await db["users"].find_one({"user_id": user_id})
    if not user_doc:
        # Return empty stats instead of erroring to handle new users gracefully
        return {
            "total_time_spent_minutes": 0,
            "topics_covered": 0,
            "avg_quiz_score": 0,
            "weak_topics": [],
            "sessions_last_7_days": 0
        }
    
    quiz_scores = user_doc.get("quiz_scores", {})
    avg_score = sum(quiz_scores.values()) / len(quiz_scores) if quiz_scores else 0
    weak_topics = [topic for topic, score in quiz_scores.items() if score < 50]
    
    # 2. Aggregate session data
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Count unique sessions in last 7 days
    pipeline_sessions = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": seven_days_ago}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "count"}
    ]
    sessions_res = await db["sessions"].aggregate(pipeline_sessions).to_list(1)
    sessions_last_7_days = sessions_res[0]["count"] if sessions_res else 0
    
    # Estimate total time spent by taking (max - min) timestamp per session
    pipeline_time = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$session_id",
            "start": {"$min": "$timestamp"},
            "end": {"$max": "$timestamp"}
        }}
    ]
    time_res = await db["sessions"].aggregate(pipeline_time).to_list(None)
    total_seconds = 0
    for session in time_res:
        if session["start"] and session["end"]:
            duration = (session["end"] - session["start"]).total_seconds()
            # We assume a minimum of 1 minute per session if there's only one event or tiny gap
            total_seconds += max(60, duration)
            
    return {
        "total_time_spent_minutes": round(total_seconds / 60, 2),
        "topics_covered": len(quiz_scores),
        "avg_quiz_score": round(avg_score, 2),
        "weak_topics": weak_topics,
        "sessions_last_7_days": sessions_last_7_days
    }
