from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import logging
from config import settings
from rag import llm_provider

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
async def switch_provider(request: ProviderSwitchRequest):
    """
    Switch the active LLM provider and/or model at runtime.
    """
    try:
        config = llm_provider.set_provider(request.provider, request.model)
        active_provider = config["provider"]
        return {
            "provider": active_provider,
            "model": config.get(f"{active_provider}_model"),
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
            "models": ["gemini-3.1-flash-lite"], 
            "requires_key": True,
            "status": "available" if settings.GEMINI_API_KEY else "unavailable"
        },
        {
            "id": "groq",
            "name": "Groq LLaMA 3",
            "models": ["llama-3.1-8b-instant", "llama3-70b-8192"],
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
