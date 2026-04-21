"""
Learnify AI — Application Configuration.

Centralised Pydantic Settings class that loads every environment variable
from a .env file located at the project root (one level above /backend).
All other modules import `settings` from this file instead of reading
os.environ directly.
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# The backend directory (where this config.py lives) — .env is here
_BACKEND_DIR = Path(__file__).resolve().parent
# The project root (one level up) — faiss_index lives here
_PROJECT_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),  # .env is in backend/, not project root
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM / AI service keys ────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # ── Database ─────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017/learnify"

    # ── Ollama (local LLM for privacy mode) ──────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # ── FAISS vector store ───────────────────────────────────────────
    FAISS_INDEX_PATH: str = str(_PROJECT_ROOT / "faiss_index")

    # ── Feature flags ────────────────────────────────────────────────
    PRIVACY_MODE: bool = False

    # ── Optional overrides ───────────────────────────────────────────
    APP_NAME: str = "Learnify AI"
    DEBUG: bool = True

    # ── JWT Authentication ───────────────────────────────────────────
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7


# Singleton instance — import this everywhere
settings = Settings()
