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


# Resolve the project root (.env lives next to the /backend folder)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
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


# Singleton instance — import this everywhere
settings = Settings()
