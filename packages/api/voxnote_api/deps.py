"""Shared FastAPI dependencies."""

from __future__ import annotations

import hmac
import os

from fastapi import Header, HTTPException, status


async def require_token(x_voxnote_token: str | None = Header(default=None)) -> None:
    """Constant-time token check. No-op when no token is configured (local dev).

    The token is read from VOXNOTE_API_TOKEN, which the desktop shell injects at launch.
    It is deliberately NOT a Settings field, so it can never leak through GET /api/config.
    """
    expected = os.getenv("VOXNOTE_API_TOKEN", "")
    if not expected:
        return
    if x_voxnote_token is None or not hmac.compare_digest(x_voxnote_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token."
        )
