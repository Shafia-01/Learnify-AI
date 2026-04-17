"""
Learnify AI — Pydantic Schemas.

Defines every data model used across the platform.  All models inherit from
BaseModel and use strict typing so that FastAPI auto-generates accurate
OpenAPI documentation and validates payloads at the boundary.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────


class SourceType(str, Enum):
    """Supported content source types for ingestion."""

    PDF = "pdf"
    PPT = "ppt"
    TXT = "txt"
    YOUTUBE = "youtube"


class UserLevel(str, Enum):
    """Learner proficiency levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class QuestionType(str, Enum):
    """Supported quiz question formats."""

    MCQ = "mcq"
    FILL = "fill"
    SHORT = "short"


class EmotionState(str, Enum):
    """Detectable learner emotion states."""

    ATTENTION = "attention"
    CONFUSION = "confusion"
    FATIGUE = "fatigue"
    FRUSTRATION = "frustration"
    NEUTRAL = "neutral"


# ── Core Schemas ─────────────────────────────────────────────────────────


class ContentChunk(BaseModel):
    """A single chunk of ingested learning content with its embedding reference."""

    chunk_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique chunk identifier")
    source_file: str = Field(..., description="Original filename or URL of the source")
    source_type: SourceType = Field(..., description="Type of the source content")
    page_or_timestamp: str = Field(
        default="",
        description="Page number (for documents) or timestamp (for videos)",
    )
    text: str = Field(..., description="The actual text content of this chunk")
    embedding_id: str = Field(
        default="",
        description="Reference ID in the FAISS vector store",
    )


class UserProfile(BaseModel):
    """Learner profile with gamification state."""

    user_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique user identifier")
    name: str = Field(..., description="Display name of the learner")
    level: UserLevel = Field(default=UserLevel.BEGINNER, description="Current proficiency level")
    language: str = Field(default="en", description="Preferred language code (ISO 639-1)")
    xp: int = Field(default=0, ge=0, description="Total experience points earned")
    badges: List[str] = Field(default_factory=list, description="List of earned badge identifiers")
    streak_days: int = Field(default=0, ge=0, description="Current consecutive-day learning streak")
    last_active_date: Optional[datetime] = Field(default=None, description="Last date the user was active")


class SessionEvent(BaseModel):
    """A timestamped event within a learning session for analytics."""

    session_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique session identifier")
    user_id: str = Field(..., description="ID of the user who owns this session")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the event")
    event_type: str = Field(..., description="Type of event (e.g. 'query', 'quiz_start', 'upload')")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary key-value metadata attached to the event",
    )


class QuizQuestion(BaseModel):
    """An auto-generated quiz question linked to a source chunk."""

    question_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique question identifier")
    question_text: str = Field(..., description="The question prompt shown to the learner")
    question_type: QuestionType = Field(..., description="Format of the question")
    options: Optional[List[str]] = Field(
        default=None,
        description="Answer options (only for MCQ type questions)",
    )
    correct_answer: str = Field(..., description="The correct answer string")
    difficulty: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Difficulty rating from 1 (easy) to 5 (hard)",
    )
    source_chunk_id: str = Field(
        default="",
        description="ID of the content chunk this question was generated from",
    )


class QuizAttempt(BaseModel):
    """Records a single answer attempt by a learner."""

    attempt_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique attempt identifier")
    user_id: str = Field(..., description="ID of the learner who attempted this question")
    question_id: str = Field(..., description="ID of the question being answered")
    user_answer: str = Field(..., description="The answer provided by the learner")
    is_correct: bool = Field(..., description="Whether the answer was correct")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC time of the attempt")


class KnowledgeNode(BaseModel):
    """A node in the knowledge graph representing a concept or topic."""

    node_id: str = Field(default_factory=lambda: uuid4().hex, description="Unique node identifier")
    label: str = Field(..., description="Short display label for the concept")
    description: str = Field(default="", description="Longer description of the concept")
    related_node_ids: List[str] = Field(
        default_factory=list,
        description="IDs of nodes related to this concept",
    )


class EmotionEvent(BaseModel):
    """A detected emotion state during a learning session."""

    session_id: str = Field(..., description="ID of the learning session")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC time of detection")
    emotion_state: EmotionState = Field(..., description="Detected learner emotion")
    intervention_triggered: bool = Field(
        default=False,
        description="Whether an adaptive intervention was triggered by this detection",
    )
