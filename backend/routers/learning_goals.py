"""
Learnify AI — Learning Goal Tracker Router.

Manages goal creation, concept tracking, and AI-powered study plan generation.
"""

import math
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from database import get_db
from models.schemas import (
    ConceptItem,
    CreateGoalRequest,
    GoalStatus,
    GoalSummary,
    LearningGoal,
    UpdateConceptRequest,
)
from rag.llm_provider import get_llm

router = APIRouter(prefix="/goals", tags=["Learning Goals"])

# Plan cache duration (24 hours)
PLAN_CACHE_LIMIT_HOURS = 24


# ── Internal Helpers ─────────────────────────────────────────────────────

def _compute_days_remaining(deadline_date: datetime) -> int:
    """
    Returns whole days remaining until deadline, clamped to 0.
    Handles naive datetimes by treating 'now' as naive as well.
    """
    now = datetime.utcnow()
    if deadline_date.tzinfo is None:
        now = now.replace(tzinfo=None)
    
    delta = deadline_date - now
    # Round up to the nearest whole day
    days = math.ceil(delta.total_seconds() / 86400)
    return max(0, days)


def _compute_on_track(goal_doc: dict) -> bool:
    """
    Compares progress against elapsed time.
    Calculates if the user is keeping pace with the deadline.
    """
    total = goal_doc.get("total_concepts", 0)
    completed = goal_doc.get("completed_concepts", 0)
    deadline_days = goal_doc.get("deadline_days", 1)
    created_at = goal_doc.get("created_at")
    status_str = goal_doc.get("status")

    if status_str == GoalStatus.COMPLETED or completed >= total:
        return True

    now = datetime.utcnow()
    # Handle naive comparison
    if created_at.tzinfo is None:
        now = now.replace(tzinfo=None)
        
    elapsed_days = (now - created_at).total_seconds() / 86400
    
    if elapsed_days <= 0:
        return True
        
    progress_ratio = completed / total
    time_ratio = min(1.0, elapsed_days / deadline_days)
    
    # User is on track if their progress ratio is greater than or equal to time ratio
    return progress_ratio >= time_ratio


def _doc_to_goal_summary(doc: dict) -> GoalSummary:
    """
    Converts a raw MongoDB goal document into a GoalSummary model with computed fields.
    """
    return GoalSummary(
        goal_id=doc["goal_id"],
        topic_name=doc["topic_name"],
        total_concepts=doc["total_concepts"],
        completed_concepts=doc["completed_concepts"],
        progress_percent=doc["progress_percent"],
        deadline_date=doc["deadline_date"],
        status=GoalStatus(doc["status"]),
        days_remaining=_compute_days_remaining(doc["deadline_date"]),
        on_track=_compute_on_track(doc)
    )


async def _generate_daily_plan(
    topic_name: str, 
    concepts: List[str], 
    days_remaining: int, 
    daily_minutes: int
) -> str:
    """
    Generates a Study Plan using LLM, distributing concepts over remaining days.
    Provides a fallback distribution if LLM service is unavailable.
    """
    if not concepts:
        return "All concepts are marked as complete. Great job!"
        
    days = max(1, days_remaining)
    
    try:
        llm = get_llm()
        prompt = PromptTemplate.from_template(
            "Topic: {topic}\n"
            "Remaining Days: {days}\n"
            "Daily Time: {mins} minutes\n"
            "Concepts to Cover: {concepts}\n\n"
            "As an expert study coach, provide a day-by-day structured study plan. "
            "Distribute the concepts reasonably across the available days. "
            "Output the plan strictly as a formatted Markdown list."
        )
        chain = prompt | llm | StrOutputParser()
        
        plan = await chain.ainvoke({
            "topic": topic_name,
            "days": days,
            "mins": daily_minutes,
            "concepts": ", ".join(concepts)
        })
        return plan
    except Exception:
        # Fallback programmatic plan
        plan_header = f"### Study Plan: {topic_name}\n"
        avg_concepts = math.ceil(len(concepts) / days)
        
        lines = [plan_header]
        for i in range(days):
            daily_set = concepts[i * avg_concepts : (i + 1) * avg_concepts]
            if not daily_set:
                break
            lines.append(f"- **Day {i+1}**: {', '.join(daily_set)} ({daily_minutes} mins)")
            
        return "\n".join(lines)


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/create", response_model=LearningGoal, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: CreateGoalRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Initialize a new deadline-driven learning goal.
    """
    now = datetime.utcnow()
    deadline_date = now + timedelta(days=payload.deadline_days)
    
    concept_items = [
        ConceptItem(name=name, completed=False, notes="") 
        for name in payload.concepts
    ]
    
    goal = LearningGoal(
        user_id=payload.user_id,
        topic_name=payload.topic_name,
        concepts=concept_items,
        total_concepts=len(concept_items),
        completed_concepts=0,
        deadline_days=payload.deadline_days,
        daily_time_minutes=payload.daily_time_minutes,
        created_at=now,
        deadline_date=deadline_date,
        status=GoalStatus.ACTIVE,
        progress_percent=0.0
    )
    
    goal_doc = goal.model_dump()
    await db["learning_goals"].insert_one(goal_doc)
    return goal


@router.get("/{user_id}", response_model=List[GoalSummary])
async def list_goals(
    user_id: str, 
    status_filter: Optional[GoalStatus] = None, 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all study goals for a user with status-based filtering.
    """
    query = {"user_id": user_id}
    if status_filter:
        query["status"] = status_filter.value
        
    cursor = db["learning_goals"].find(query).sort("created_at", -1)
    
    summaries = []
    async for doc in cursor:
        summaries.append(_doc_to_goal_summary(doc))
        
    return summaries


@router.get("/detail/{goal_id}", response_model=LearningGoal)
async def get_goal_detail(goal_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Fetch the complete details, including nested concepts, for a specific goal.
    """
    doc = await db["learning_goals"].find_one({"goal_id": goal_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return LearningGoal(**doc)


@router.patch("/{goal_id}/concept", response_model=LearningGoal)
async def update_concept_completion(
    goal_id: str, 
    payload: UpdateConceptRequest, 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update completion status for a specific concept within a goal.
    Awards bonus XP if the entire goal is completed.
    """
    goal_doc = await db["learning_goals"].find_one({"goal_id": goal_id})
    if not goal_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    concepts = goal_doc["concepts"]
    updated = False
    completed_val = 0
    
    for c in concepts:
        if c["name"] == payload.concept_name:
            c["completed"] = payload.completed
            c["notes"] = payload.notes if payload.notes is not None else c.get("notes", "")
            c["completed_at"] = datetime.utcnow() if payload.completed else None
            updated = True
            
        if c["completed"]:
            completed_val += 1
            
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept name match failed")

    total = goal_doc["total_concepts"]
    progress = (completed_val / total) * 100
    
    update_data = {
        "concepts": concepts,
        "completed_concepts": completed_val,
        "progress_percent": progress
    }
    
    # Auto-complete goal logic
    if completed_val == total:
        update_data["status"] = GoalStatus.COMPLETED.value
        # Award 50 bonus XP for completing a learning topic
        await db["registered_users"].update_one(
            {"user_id": goal_doc["user_id"]},
            {"$inc": {"xp": 50}}
        )
        await db["users"].update_one(
            {"user_id": goal_doc["user_id"]},
            {"$inc": {"xp": 50}}
        )

    await db["learning_goals"].update_one(
        {"goal_id": goal_id},
        {"$set": update_data}
    )
    
    new_doc = await db["learning_goals"].find_one({"goal_id": goal_id})
    return LearningGoal(**new_doc)


@router.delete("/{goal_id}")
async def archive_goal(goal_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Soft-delete a goal by marking it as archived.
    """
    result = await db["learning_goals"].update_one(
        {"goal_id": goal_id},
        {"$set": {"status": GoalStatus.ARCHIVED.value, "archived_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        
    return {"message": "Goal archived successfully"}


@router.get("/{goal_id}/daily-plan")
async def get_goal_daily_plan(
    goal_id: str, 
    force_regenerate: bool = False, 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve an AI-generated study plan.
    Uses cached result for 24 hours unless force_regenerate is requested.
    """
    goal = await db["learning_goals"].find_one({"goal_id": goal_id})
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    last_gen = goal.get("daily_plan_generated_at")
    cached_plan = goal.get("daily_plan")
    
    use_cache = False
    if cached_plan and last_gen and not force_regenerate:
        age_hours = (datetime.utcnow() - last_gen).total_seconds() / 3600
        if age_hours < PLAN_CACHE_LIMIT_HOURS:
            use_cache = True

    if use_cache:
        return {
            "goal_id": goal_id,
            "topic_name": goal["topic_name"],
            "plan": cached_plan,
            "generated_at": last_gen,
            "from_cache": True
        }

    # Generate fresh plan from LLM (or fallback)
    remaining_concepts = [c["name"] for c in goal["concepts"] if not c["completed"]]
    days_left = _compute_days_remaining(goal["deadline_date"])
    
    plan = await _generate_daily_plan(
        goal["topic_name"],
        remaining_concepts,
        days_left,
        goal["daily_time_minutes"]
    )
    
    now = datetime.utcnow()
    await db["learning_goals"].update_one(
        {"goal_id": goal_id},
        {"$set": {
            "daily_plan": plan,
            "daily_plan_generated_at": now
        }}
    )
    
    return {
        "goal_id": goal_id,
        "topic_name": goal["topic_name"],
        "plan": plan,
        "generated_at": now,
        "from_cache": False
    }
