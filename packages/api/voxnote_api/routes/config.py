"""Configuration endpoints."""

from __future__ import annotations

import os

from fastapi import APIRouter

from voxnote_api.schemas import ConfigResponse, ConfigUpdateRequest

router = APIRouter()

AVAILABLE_PROVIDERS = ["ollama", "openai", "google", "anthropic"]


@router.get("/config", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    """Return current application settings."""
    from voxnote.config import Settings

    s = Settings()  # Re-read from env each time
    return ConfigResponse(
        whisper_model=s.whisper_model,
        language=s.language,
        llm_provider=s.llm_provider,
        ollama_model=s.ollama_model,
        ollama_url=s.ollama_url,
        ollama_api_key="***" if s.ollama_api_key else "",
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        google_model=os.getenv("GOOGLE_MODEL", "gemini-2.0-flash"),
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8"),
        diarize=s.diarize,
        hf_token="***" if s.hf_token else "",
        output_dir=str(s.output_dir),
        available_providers=AVAILABLE_PROVIDERS,
    )


@router.put("/config", response_model=ConfigResponse)
async def update_config(request: ConfigUpdateRequest) -> ConfigResponse:
    """Update runtime settings via environment variables."""
    from voxnote.config import settings

    if request.whisper_model is not None:
        os.environ["VOXNOTE_WHISPER_MODEL"] = request.whisper_model
        settings.whisper_model = request.whisper_model
    if request.language is not None:
        os.environ["VOXNOTE_LANGUAGE"] = request.language
        settings.language = request.language
    if request.llm_provider is not None:
        os.environ["VOXNOTE_LLM_PROVIDER"] = request.llm_provider
        settings.llm_provider = request.llm_provider
    if request.ollama_model is not None:
        os.environ["VOXNOTE_OLLAMA_MODEL"] = request.ollama_model
        settings.ollama_model = request.ollama_model
    if request.ollama_url is not None:
        # A cleared field falls back to the local default instead of an empty URL.
        url = request.ollama_url.strip() or "http://localhost:11434"
        os.environ["VOXNOTE_OLLAMA_URL"] = url
        settings.ollama_url = url
    if request.ollama_api_key is not None:
        # Don't overwrite if frontend sends "***" (mask)
        if request.ollama_api_key != "***":
            os.environ["VOXNOTE_OLLAMA_API_KEY"] = request.ollama_api_key
            settings.ollama_api_key = request.ollama_api_key
    if request.openai_model is not None:
        os.environ["OPENAI_MODEL"] = request.openai_model
    if request.google_model is not None:
        os.environ["GOOGLE_MODEL"] = request.google_model
    if request.anthropic_model is not None:
        os.environ["ANTHROPIC_MODEL"] = request.anthropic_model
    if request.diarize is not None:
        os.environ["VOXNOTE_DIARIZE"] = str(request.diarize).lower()
        settings.diarize = request.diarize

    return await get_config()
