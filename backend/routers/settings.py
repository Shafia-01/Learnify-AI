from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import httpx
import logging
from config import settings
from rag import llm_provider
from database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from jose import jwt

router = APIRouter(prefix="/settings", tags=["Settings"])
logger = logging.getLogger(__name__)

class PrivacyToggleRequest(BaseModel):
    """Request body for toggling privacy mode."""
    enabled: bool

class ProviderSwitchRequest(BaseModel):
    """Request body for switching LLM provider or model."""
    provider: str
    model: Optional[str] = None

@router.post("/privacy")
async def toggle_privacy(request: PrivacyToggleRequest):
    """
    Toggle Privacy Mode at runtime.
    In Privacy Mode, all LLM processing is routed through local Ollama.
    """
    enabled = llm_provider.set_privacy_mode(request.enabled)
    return {
        "privacy_mode": enabled, 
        "message": f"Privacy Mode {'ACTIVE — all processing is local' if enabled else 'disabled'}"
    }

@router.get("/status")
async def get_status():
    """
    Return the current configuration status of the backend.
    """
    current_provider = llm_provider.runtime_config.get("provider", "groq")
    return {
        "privacy_mode": llm_provider.runtime_config.get("privacy_mode", False),
        "llm_provider": current_provider,
        "current_model": llm_provider.runtime_config.get(f"{current_provider}_model"),
        "language": "English" # Default language
    }

@router.post("/provider")
async def switch_provider(
    request: ProviderSwitchRequest,
    req: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Switch the active LLM provider and/or model at runtime.
    """
    try:
        config = llm_provider.set_provider(request.provider, request.model)
        active_provider = config["provider"]
        resolved_model = config.get(f"{active_provider}_model")

        # Try to find authenticated user
        user_id = None
        auth_header = req.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(
                    token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
                )
                user_id = payload.get("sub")
            except Exception:
                pass

        if not user_id:
            user_id = req.headers.get("user_id")

        if user_id:
            try:
                await db["registered_users"].update_one(
                    {"user_id": user_id},
                    {"$set": {"llm_provider": active_provider, f"{active_provider}_model": resolved_model}}
                )
                logger.info(f"Updated settings for user {user_id}: {active_provider} - {resolved_model}")
            except Exception as db_err:
                logger.error(f"Failed to update MongoDB registered_users for user {user_id}: {db_err}")

        return {
            "provider": active_provider,
            "model": resolved_model,
            "message": f"Switched to {request.provider} successfully"
        }
    except Exception as e:
        logger.error(f"Error switching provider: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/providers")
async def list_providers():
    """
    Return available LLM providers and their models.
    Pings Ollama to check local availability.
    """
    # Check Ollama status by pinging its API
    ollama_status = "unavailable"
    try:
        async with httpx.AsyncClient() as client:
            # Ping the tags endpoint to see if Ollama is running and responsive
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0)
            if response.status_code == 200:
                ollama_status = "available"
    except Exception:
        ollama_status = "unavailable"

    providers = [
        {
            "id": "gemini",
            "name": "Google Gemini",
            "models": ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
            "requires_key": True,
            "status": "available" if settings.GEMINI_API_KEY else "unavailable"
        },
        {
            "id": "groq",
            "name": "Groq LLaMA 3",
            "models": ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
            "requires_key": True,
            "status": "available" if settings.GROQ_API_KEY else "unavailable"
        },
        {
            "id": "ollama",
            "name": "Ollama (Local)",
            "models": ["llama3", "mistral", "gemma"],
            "requires_key": False,
            "status": ollama_status
        }
    ]
    
    current_p = llm_provider.runtime_config["provider"]
    return {
        "providers": providers,
        "current_provider": current_p,
        "current_model": llm_provider.runtime_config.get(f"{current_p}_model")
    }
