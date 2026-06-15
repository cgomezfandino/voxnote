"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Return service health status."""
    return {"status": "ok", "service": "voxnote-api"}


@router.get("/ready")
def readiness() -> dict:
    """Richer readiness than /health for the desktop shell's splash gate.

    /health flips to ok the instant uvicorn binds; the shell needs to know whether the
    data dir is writable and (for the ollama provider) the LLM is reachable before it
    drops the splash screen onto a non-functional app. Sync def so the blocking
    ``requests`` probe runs in the threadpool, not on the event loop.
    """
    import requests

    from voxnote.config import Settings

    settings = Settings()  # re-read from env each call

    output_ok = False
    try:
        settings.output_dir.mkdir(parents=True, exist_ok=True)
        probe = settings.output_dir / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        output_ok = True
    except OSError:
        output_ok = False

    if settings.llm_provider == "ollama":
        try:
            resp = requests.get(f"{settings.ollama_url}/api/tags", timeout=1.5)
            ollama_ok = resp.status_code == 200
        except requests.RequestException:
            ollama_ok = False
    else:
        ollama_ok = True  # other providers don't need a local server

    return {
        "ok": output_ok and ollama_ok,
        "output_dir_writable": output_ok,
        "ollama_reachable": ollama_ok,
    }
