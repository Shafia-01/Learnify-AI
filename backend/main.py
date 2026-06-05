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

# ── Rate Limiter ────────────────────────────────────────────────────────
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address  
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# ── Router imports ──────────────────────────────────────────────────────

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
from routers.learning_goals import router as learning_goals_router
from routers.documents import router as documents_router



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
        # Automatically sync/rebuild the FAISS index if missing
        import database
        from vector_store import sync_faiss_with_db
        await sync_faiss_with_db(database._db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not initialize MongoDB or sync FAISS. Running without DB/FAISS sync: %s", e)
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS Configuration ──────────────────────────────────────────────────

if settings.DEBUG:
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
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
app.include_router(auth_router, prefix="/api")
app.include_router(games_router, prefix="/api")
app.include_router(learning_goals_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(websocket_router)


# ── Health check ─────────────────────────────────────────────────────────

from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# Serve React frontend if 'static' directory exists
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    # Mount the assets directory explicitly
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{full_path:path}", include_in_schema=False)
    async def catch_all(full_path: str):
        # Don't intercept API or WS routes
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html for React Router
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend build not found"}
else:
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
