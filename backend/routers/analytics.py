from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from database import get_db
from models.schemas import SessionEvent

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
async def get_stats(user_id: str, days: int = Query(7), db: AsyncIOMotorDatabase = Depends(get_db)):
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
    weak_topics = [topic for topic, score in quiz_scores.items() if score < 50]
    
    # 2. Aggregate session data
    days_ago = datetime.utcnow() - timedelta(days=days)
    
    # Count unique sessions in last N days
    pipeline_sessions = [
        {"$match": {
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": days_ago}},
                {"$expr": {"$gte": [{"$toDate": "$timestamp"}, days_ago]}}
            ]
        }},
        {"$group": {"_id": "$session_id"}},
        {"$count": "count"}
    ]
    sessions_res = await db["sessions"].aggregate(pipeline_sessions).to_list(1)
    sessions_last_7_days = sessions_res[0]["count"] if sessions_res else 0
    
    # Estimate total time spent by taking (max - min) timestamp per session within selected days
    pipeline_time = [
        {"$match": {
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": days_ago}},
                {"$expr": {"$gte": [{"$toDate": "$timestamp"}, days_ago]}}
            ]
        }},
        {"$addFields": {
            "timestamp_date": {"$toDate": "$timestamp"}
        }},
        {"$group": {
            "_id": "$session_id",
            "start": {"$min": "$timestamp_date"},
            "end": {"$max": "$timestamp_date"}
        }}
    ]
    time_res = await db["sessions"].aggregate(pipeline_time).to_list(None)
    total_seconds = 0
    for session in time_res:
        if session["start"] and session["end"]:
            duration = (session["end"] - session["start"]).total_seconds()
            # We assume a minimum of 1 minute per session if there's only one event or tiny gap
            total_seconds += max(60, duration)
            
    # Calculate average quiz score from quiz_attempts in the last N days
    pipeline_quiz = [
        {"$match": {
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": days_ago}},
                {"$expr": {"$gte": [{"$toDate": "$timestamp"}, days_ago]}}
            ]
        }},
        {"$group": {
            "_id": None,
            "avg_accuracy": {"$avg": {"$cond": [{"$eq": ["$is_correct", True]}, 100.0, 0.0]}}
        }}
    ]
    quiz_res = await db["quiz_attempts"].aggregate(pipeline_quiz).to_list(1)
    if quiz_res and quiz_res[0]["avg_accuracy"] is not None:
        avg_score = quiz_res[0]["avg_accuracy"]
    else:
        avg_score = sum(quiz_scores.values()) / len(quiz_scores) if quiz_scores else 0
            
    return {
        "total_time_spent_minutes": round(total_seconds / 60, 2),
        "topics_covered": len(quiz_scores),
        "avg_quiz_score": round(avg_score, 2),
        "weak_topics": weak_topics,
        "sessions_last_7_days": sessions_last_7_days,
        "study_time_velocity": await _get_study_time_velocity(user_id, db, days),
        "knowledge_retention": await _get_knowledge_retention(user_id, db, days)
    }

async def _get_study_time_velocity(user_id: str, db: AsyncIOMotorDatabase, days: int):
    """Calculates minutes studied per day for the last N days."""
    days_ago = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": days_ago}},
                {"$expr": {"$gte": [{"$toDate": "$timestamp"}, days_ago]}}
            ]
        }},
        {"$addFields": {
            "timestamp_date": {"$toDate": "$timestamp"}
        }},
        {"$group": {
            "_id": {
                "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp_date"}},
                "session": "$session_id"
            },
            "start": {"$min": "$timestamp_date"},
            "end": {"$max": "$timestamp_date"}
        }},
        {"$group": {
            "_id": "$_id.day",
            "minutes": {"$sum": {
                "$max": [
                    1,
                    {"$divide": [{"$subtract": ["$end", "$start"]}, 60000]}
                ]
            }}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db["sessions"].aggregate(pipeline).to_list(None)
    
    # Fill in missing days
    data = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=(days-1)-i)).strftime("%Y-%m-%d")
        found = next((r for r in results if r["_id"] == day), None)
        data.append({"date": day, "minutes": round(found["minutes"], 1) if found else 0})
    return data

async def _get_knowledge_retention(user_id: str, db: AsyncIOMotorDatabase, days: int):
    """Calculates average quiz accuracy per day for the last N days."""
    days_ago = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": days_ago}},
                {"$expr": {"$gte": [{"$toDate": "$timestamp"}, days_ago]}}
            ]
        }},
        {"$addFields": {
            "timestamp_date": {"$toDate": "$timestamp"}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp_date"}},
            "accuracy": {"$avg": {"$cond": [{"$eq": ["$is_correct", True]}, 100, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db["quiz_attempts"].aggregate(pipeline).to_list(None)
    
    # Fill in missing days
    data = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=(days-1)-i)).strftime("%Y-%m-%d")
        found = next((r for r in results if r["_id"] == day), None)
        data.append({"date": day, "score": round(found["accuracy"], 1) if found else 0})
    return data

@router.get("/ml-telemetry/{user_id}")
async def get_ml_telemetry(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Get aggregated real-time ML telemetry stats for a user.
    """
    # Find all sessions associated with user_id
    sessions_cursor = db["sessions"].find({"user_id": user_id}, {"session_id": 1})
    session_ids = list(set([s["session_id"] async for s in sessions_cursor if "session_id" in s]))
    
    # Always include global/demo sessions to capture live UI feeds
    if "session1" not in session_ids:
        session_ids.append("session1")
    if "global-session" not in session_ids:
        session_ids.append("global-session")
        
    # Query all emotion events for these session ids
    pipeline = [
        {"$match": {"session_id": {"$in": session_ids}}},
        {"$group": {
            "_id": None,
            "total_events": {"$sum": 1},
            "attention_count": {"$sum": {"$cond": [{"$eq": ["$emotion_state", "attention"]}, 1, 0]}},
            "neutral_count": {"$sum": {"$cond": [{"$eq": ["$emotion_state", "neutral"]}, 1, 0]}},
            "fatigue_count": {"$sum": {"$cond": [{"$eq": ["$emotion_state", "fatigue"]}, 1, 0]}},
            "interventions": {"$sum": {"$cond": [{"$eq": ["$intervention_triggered", True]}, 1, 0]}}
        }}
    ]
    
    results = await db["emotion_events"].aggregate(pipeline).to_list(1)
    
    if not results or results[0]["total_events"] == 0:
        return {
            "focus_score": 92,
            "deep_work_minutes": 42,
            "interventions": 2,
            "fatigue_alerts": 0,
            "is_demo": True
        }
        
    res = results[0]
    total = res["total_events"]
    focus_score = round(((res["attention_count"] + res["neutral_count"]) / total) * 100, 1)
    
    # Each emotion frame is captured every 2 seconds
    deep_work_minutes = round((res["attention_count"] + res["neutral_count"]) * 2 / 60, 1)
    
    return {
        "focus_score": focus_score,
        "deep_work_minutes": deep_work_minutes,
        "interventions": res["interventions"],
        "fatigue_alerts": res["fatigue_count"],
        "is_demo": False
    }
