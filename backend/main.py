"""
Learnify AI — FastAPI Application Entry Point.

Registers all route modules, configures CORS for development, wires up the
async MongoDB lifecycle, and exposes a /health endpoint for readiness checks.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import close_db, init_db

# ── Router imports ───────────────────────────────────────────────────────
# Agent 2 provides the real ingestion router; all other feature routers
# remain as lightweight stubs until downstream agents replace them.

from fastapi import APIRouter

from routers.ingest import router as ingest_router
from routers.query import router as query_router

quiz_router = APIRouter(prefix="/quiz", tags=["Quiz"])
gamification_router = APIRouter(prefix="/gamification", tags=["Gamification"])
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])
voice_router = APIRouter(prefix="/voice", tags=["Voice"])
graph_router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])


# ── Placeholder endpoints ────────────────────────────────────────────────
# These give downstream agents concrete routes to replace with real logic.


# The query router and its status endpoint are provided by routers.query


@quiz_router.get("/status")
async def quiz_status() -> Dict[str, str]:
    """Return quiz service readiness."""
    return {"service": "quiz", "status": "ready"}


@gamification_router.get("/status")
async def gamification_status() -> Dict[str, str]:
    """Return gamification service readiness."""
    return {"service": "gamification", "status": "ready"}


@analytics_router.get("/status")
async def analytics_status() -> Dict[str, str]:
    """Return analytics service readiness."""
    return {"service": "analytics", "status": "ready"}


@voice_router.get("/status")
async def voice_status() -> Dict[str, str]:
    """Return voice service readiness."""
    return {"service": "voice", "status": "ready"}


@graph_router.get("/status")
async def graph_status() -> Dict[str, str]:
    """Return knowledge-graph service readiness."""
    return {"service": "graph", "status": "ready"}


# ── Application lifespan ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage startup and shutdown tasks.

    On startup: connect to MongoDB and ensure required collections exist.
    On shutdown: close the database connection pool.
    """
    try:
        await init_db()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not initialize MongoDB. Running without DB: %s", e)
    yield
    await close_db()


# ── FastAPI app ──────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Multimodal AI-powered learning platform with RAG, adaptive quizzes, "
        "emotion-aware tutoring, voice interaction, and gamification."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS (allow all origins during development) ─────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ────────────────────────────────────────────────────

app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(quiz_router)
app.include_router(gamification_router)
app.include_router(analytics_router)
app.include_router(voice_router)
app.include_router(graph_router)


# ── Health check ─────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, str]:
    """
    Readiness probe.

    Returns a simple JSON payload confirming the API is running.
    Used by orchestrators, load balancers, and CI pipelines.
    """
    return {"status": "ok"}
