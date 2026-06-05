"""
Learnify AI — LLM Provider Management.

Centralised module to manage and fetch LangChain LLM instances globally across
all features of the platform. Supports runtime mutability allowing users to
seamlessly swap models without restarting the server.
"""

import logging
from typing import Any, Dict

from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from config import settings

logger = logging.getLogger(__name__)

# Modifiable at runtime to allow provider hot-swapping
runtime_config = {
    "provider": "groq",  # default to groq during development
    "gemini_model": "gemini-2.5-flash-lite",
    "groq_model": "llama-3.1-8b-instant",
    "ollama_model": "llama3",
    "privacy_mode": settings.PRIVACY_MODE
}

if settings.PRIVACY_MODE:
    logger.info("PRIVACY MODE ACTIVE — all processing is local (Ollama)")

def set_provider(provider: str, model: str = None) -> Dict[str, str]:
    """
    Update the system-wide active LLM provider.

    Args:
        provider: "gemini", "groq", or "ollama".
        model: Optional model string override for the chosen provider.

    Returns:
        The updated runtime config dictionary.
    """
    provider = provider.lower()
    runtime_config["provider"] = provider

    if model:
        # Fallback for defunct/discontinued model names
        if model in ("gemini-3.1-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash-lite-001", "gemini-1.5-flash"):
            model = "gemini-2.5-flash-lite"
        elif model in ("gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-1.5-pro"):
            model = "gemini-2.5-flash"
        elif model == "llama3-70b-8192":
            model = "llama-3.3-70b-versatile"
            
        if provider == "gemini":
            runtime_config["gemini_model"] = model
        elif provider == "groq":
            runtime_config["groq_model"] = model
        elif provider == "ollama":
            runtime_config["ollama_model"] = model

    logger.info("LLM provider switched: %s", runtime_config)
    return runtime_config


def set_privacy_mode(enabled: bool) -> bool:
    """
    Toggle privacy mode. When enabled, all LLM calls use local Ollama.
    """
    runtime_config["privacy_mode"] = enabled
    if enabled:
        logger.info("PRIVACY MODE ACTIVE — all processing is local")
    return enabled


def get_llm() -> Any:
    """
    Retrieve an active LangChain chat model instance based on runtime_config.

    If privacy_mode is active, it strictly returns Ollama.
    Otherwise, it returns the user-selected provider.

    Returns:
        An instantiated BaseChatModel.
    """
    # Force Ollama if Privacy Mode is enabled
    if runtime_config.get("privacy_mode"):
        try:
            return ChatOllama(
                model=runtime_config["ollama_model"],
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Privacy mode enabled but Ollama failed: %s. Blocking fallback to cloud.", e)
            raise RuntimeError(f"Privacy Mode is ACTIVE but local Ollama failed: {e}") from e

    provider = runtime_config.get("provider", "groq").lower()

    if provider == "gemini":
        try:
            return ChatGoogleGenerativeAI(
                model=runtime_config["gemini_model"],
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Failed to initialize Gemini. Falling back to Groq: %s", e)
            provider = "groq"

    if provider == "ollama":
        try:
            return ChatOllama(
                model=runtime_config["ollama_model"],
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Failed to initialize Ollama. Falling back to Groq: %s", e)
            provider = "groq"

    # Default / Groq handler
    return ChatGroq(
        model_name=runtime_config["groq_model"],
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.7,
    )


def get_llm_for_user(user_doc: dict) -> Any:
    """
    Retrieve an active LangChain chat model instance based on a user's configuration,
    falling back to runtime_config values if fields are absent in user_doc.
    """
    if not isinstance(user_doc, dict):
        user_doc = {}

    privacy_mode = user_doc.get("privacy_mode")
    if privacy_mode is None:
        privacy_mode = runtime_config.get("privacy_mode", False)

    ollama_model = user_doc.get("ollama_model")
    if not ollama_model:
        ollama_model = runtime_config.get("ollama_model", "llama3")

    # Force Ollama if Privacy Mode is enabled
    if privacy_mode:
        try:
            return ChatOllama(
                model=ollama_model,
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Privacy mode enabled but Ollama failed: %s. Blocking fallback to cloud.", e)
            raise RuntimeError(f"Privacy Mode is ACTIVE but local Ollama failed: {e}") from e

    provider = user_doc.get("llm_provider")
    if not provider:
        provider = runtime_config.get("provider", "groq")
    provider = provider.lower()

    gemini_model = user_doc.get("gemini_model")
    if not gemini_model:
        gemini_model = runtime_config.get("gemini_model", "gemini-2.5-flash-lite")

    groq_model = user_doc.get("groq_model")
    if not groq_model:
        groq_model = runtime_config.get("groq_model", "llama-3.1-8b-instant")

    if provider == "gemini":
        try:
            return ChatGoogleGenerativeAI(
                model=gemini_model,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Failed to initialize Gemini. Falling back to Groq: %s", e)
            provider = "groq"

    if provider == "ollama":
        try:
            return ChatOllama(
                model=ollama_model,
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("Failed to initialize Ollama. Falling back to Groq: %s", e)
            provider = "groq"

    # Default / Groq handler
    return ChatGroq(
        model_name=groq_model,
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.7,
    )

