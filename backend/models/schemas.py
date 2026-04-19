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

    user_id: str = Field(default_factory=lambda: uuid4().hex)
    name: str = "Learner"
    level: UserLevel = UserLevel.BEGINNER
    language: str = "en"
    xp: int = 0
    badges: List[str] = Field(default_factory=list)
    streak_days: int = 0
    quiz_scores: Dict[str, int] = Field(default_factory=dict)
    last_active_date: Optional[datetime] = None


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


# ── Authentication Schemas ───────────────────────────────────────


class RegisterRequest(BaseModel):
    """Request schema for new user registration."""

    username: str = Field(..., min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")
    email: str
    password: str = Field(..., min_length=8)
    name: str = "Learner"
    level: UserLevel = UserLevel.BEGINNER
    language: str = "en"


class LoginRequest(BaseModel):
    """Request schema for user login via email or username."""

    identifier: str = Field(..., description="Email or Username")
    password: str


class AuthUserResponse(BaseModel):
    """User profile data safe for public/frontend consumption."""

    user_id: str
    username: str
    name: str
    email: str
    level: UserLevel
    language: str
    xp: int
    badges: List[str]
    streak_days: int
    avatar_emoji: str = "🎓"
    created_at: datetime


class AuthResponse(BaseModel):
    """Response containing JWT and user profile details."""

    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class ProfileUpdateRequest(BaseModel):
    """Request schema for partial profile updates."""

    name: Optional[str] = None
    level: Optional[UserLevel] = None
    language: Optional[str] = None
    avatar_emoji: Optional[str] = None


class UsernameCheckResponse(BaseModel):
    """Response schema for username availability check."""

    username: str
    available: bool
    message: str


# ── Game Schemas ─────────────────────────────────────────────────


class GameName(str, Enum):
    """Supported mini games on the platform."""

    SNAKE = "snake"
    TIC_TAC_TOE = "tic_tac_toe"
    MEMORY_MATCH = "memory_match"
    WORD_SCRAMBLE = "word_scramble"
    FALLING_QUIZ = "falling_quiz"


class SubmitScoreRequest(BaseModel):
    """Payload for submitting a completed game session score."""

    user_id: str
    game_name: GameName
    score: int = Field(..., ge=0)
    duration_seconds: int = Field(..., ge=0)


class GameScoreResponse(BaseModel):
    """Response returned after a score submission, detailing XP gains and records."""

    game_name: GameName
    submitted_score: int
    previous_high_score: int
    new_high_score: int
    is_new_record: bool
    xp_awarded: int
    message: str


class GameLeaderboardEntry(BaseModel):
    """Represents a ranked user on a specific game leaderboard."""

    rank: int
    user_id: str
    username: str
    name: str
    score: int
    avatar_emoji: str


class WordScrambleWord(BaseModel):
    """Data for a single word in the Word Scramble game."""

    original: str
    scrambled: str
    hint: str
