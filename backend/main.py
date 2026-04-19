"""
Learnify AI — FastAPI Application Entry Point.

Registers all route modules, configures CORS for development, wires up the
async MongoDB lifecycle, and exposes a /health endpoint for readiness checks.
"""

import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import warnings
# Silence TensorFlow deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*The name tf.losses.sparse_softmax_cross_entropy is deprecated.*")

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
from routers.quiz import router as quiz_router
from routers.settings import router as settings_router
from routers.voice import router as voice_router
from routers.websocket import router as websocket_router
from routers.gamification import router as gamification_router
from routers.analytics import router as analytics_router
from routers.auth import router as auth_router
from routers.games import router as games_router

graph_router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])


# ── Placeholder endpoints ────────────────────────────────────────────────
# These give downstream agents concrete routes to replace with real logic.


# The query router and its status endpoint are provided by routers.query


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

app.include_router(ingest_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(gamification_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(games_router, prefix="/api")
app.include_router(websocket_router)


# ── Health check ─────────────────────────────────────────────────────────

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
async def root_redirect():
    """Redirect root to /docs for easier navigation."""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, str]:
    """
    Readiness probe.

    Returns a simple JSON payload confirming the API is running.
    Used by orchestrators, load balancers, and CI pipelines.
    """
    return {"status": "ok"}
