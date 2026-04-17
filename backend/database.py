"""
Learnify AI — Async MongoDB Connection.

Uses Motor (async driver for MongoDB) to provide a non-blocking database
layer.  The module exposes:

  • `get_db()`  — FastAPI dependency that yields the database handle.
  • `init_db()` — Creates all required collections (idempotent).
  • `close_db()` — Gracefully closes the Motor client.
"""

from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings

# ── Module-level client (initialised lazily at app startup) ──────────────
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None

# Collections that the platform requires
_REQUIRED_COLLECTIONS = [
    "users",
    "chunks",
    "sessions",
    "quiz_questions",
    "quiz_attempts",
    "knowledge_nodes",
    "emotion_events",
]


async def init_db() -> None:
    """
    Initialise the Motor client and ensure every required collection exists.

    This function is called once during FastAPI's ``lifespan`` startup
    event.  Creating a collection that already exists is a no-op in
    MongoDB, so this is safe to call multiple times.
    """
    global _client, _db  # noqa: PLW0603

    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Extract the database name from the URI; fall back to 'learnify'
    db_name = settings.MONGODB_URI.rsplit("/", 1)[-1].split("?")[0] or "learnify"
    _db = _client[db_name]

    existing = await _db.list_collection_names()
    for collection_name in _REQUIRED_COLLECTIONS:
        if collection_name not in existing:
            await _db.create_collection(collection_name)


async def close_db() -> None:
    """Close the Motor client connection pool."""
    global _client, _db  # noqa: PLW0603
    if _client is not None:
        _client.close()
        _client = None
        _db = None


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    FastAPI dependency that yields the database handle.

    Usage::

        @router.get("/items")
        async def list_items(db=Depends(get_db)):
            items = await db["items"].find().to_list(100)
            return items
    """
    if _db is None:
        raise RuntimeError(
            "Database not initialised. Ensure init_db() is called during app startup."
        )
    yield _db
