"""FastAPI application for Voxnote."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from voxnote_api.deps import require_token
from voxnote_api.routes import config, export, health, insights, notes, ollama, transcribe


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown."""
    import logging

    from voxnote.config import settings

    logging.basicConfig(level=logging.INFO)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    try:
        # Notes can contain sensitive meeting content; keep the dir owner-only.
        settings.output_dir.chmod(0o700)
    except OSError:
        logging.getLogger("voxnote").warning("could not chmod 0o700 on output_dir")
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Voxnote API",
        version="0.1.0",
        description="Local meeting transcription and insight extraction",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3003",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from voxnote.config import settings

    @app.middleware("http")
    async def _limit_json_body(request: Request, call_next):  # type: ignore[no-untyped-def]
        # Bound JSON bodies (insights / export / export-docx) to guard against a
        # memory-exhaustion DoS. Multipart audio uploads are exempt — they use the
        # transcribe route's own upload limit. Chunked requests without Content-Length
        # bypass this; acceptable for the localhost-only threat model.
        if request.headers.get("content-type", "").startswith("application/json"):
            length = request.headers.get("content-length", "")
            if length.isdigit() and int(length) > settings.max_json_mb * 1024 * 1024:
                return JSONResponse(status_code=413, content={"detail": "Request body too large."})
        return await call_next(request)

    # health stays open for the shell's readiness probe; everything else requires the
    # localhost token (constant-time check, no-op when VOXNOTE_API_TOKEN is unset in dev).
    _auth = [Depends(require_token)]
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(transcribe.router, prefix="/api", tags=["transcribe"], dependencies=_auth)
    app.include_router(insights.router, prefix="/api", tags=["insights"], dependencies=_auth)
    app.include_router(export.router, prefix="/api", tags=["export"], dependencies=_auth)
    app.include_router(config.router, prefix="/api", tags=["config"], dependencies=_auth)
    app.include_router(notes.router, prefix="/api", tags=["notes"], dependencies=_auth)
    app.include_router(ollama.router, prefix="/api/ollama", tags=["ollama"], dependencies=_auth)

    # Serve the exported Next.js UI same-origin in the packaged app. Mounted AFTER the
    # /api routers so /api/* always wins. Gated on VOXNOTE_WEB_DIR so dev (API-only) is
    # unaffected. html=True serves index.html for "/".
    web_dir = os.getenv("VOXNOTE_WEB_DIR")
    if web_dir and Path(web_dir).is_dir():
        app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")

    return app


app = create_app()


def run() -> None:
    """Entry point for the ``voxnote-api`` command.

    Binds to localhost by default so the API is not exposed to the LAN. Override with
    VOXNOTE_API_HOST (e.g. "0.0.0.0") only when LAN access is explicitly wanted — note
    there is no authentication yet, so do not expose this on an untrusted network.
    """
    import os

    import uvicorn

    host = os.getenv("VOXNOTE_API_HOST", "127.0.0.1")
    port = int(os.getenv("VOXNOTE_API_PORT", "8003"))
    reload = os.getenv("VOXNOTE_API_RELOAD", "false").lower() in ("1", "true", "yes")
    uvicorn.run("voxnote_api.main:app", host=host, port=port, reload=reload)
