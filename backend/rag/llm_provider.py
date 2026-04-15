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
    "gemini_model": "gemini-3.1-flash-lite",
    "groq_model": "llama-3.1-8b-instant",
    "ollama_model": "llama3"
}

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
        if provider == "gemini":
            runtime_config["gemini_model"] = model
        elif provider == "groq":
            runtime_config["groq_model"] = model
        elif provider == "ollama":
            runtime_config["ollama_model"] = model

    logger.info("LLM provider switched: %s", runtime_config)
    return runtime_config


def get_llm() -> Any:
    """
    Retrieve an active LangChain chat model instance based on runtime_config.

    If the requested provider is disconnected or unsupported, it structurally
    defaults to Groq.

    Returns:
        An instantiated BaseChatModel.
    """
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
