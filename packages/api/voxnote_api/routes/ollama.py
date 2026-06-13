"""Ollama endpoints for model discovery."""

from __future__ import annotations

import asyncio
import time

import httpx
from fastapi import APIRouter, HTTPException
from voxnote.config import settings

router = APIRouter()

# Ollama Cloud lists its whole catalog in /api/tags but returns 403 ("this model requires a
# subscription") on /api/generate for models outside the account's plan — and exposes no
# field to tell them apart. So for a keyed (cloud/proxied) server we probe generate access
# once and cache the result, to keep the picker to models the user can actually run.
_ACCESS_CACHE: dict[tuple[str, str], tuple[float, list[dict[str, str]]]] = {}
_CACHE_TTL_SECONDS = 1800.0
# Probe with num_predict=0: the subscription gate is checked BEFORE inference runs, so a
# gated model returns 403 while a runnable one returns 400 ("num_predict must be > 0") —
# both in ~200ms with zero token cost. That keeps the probe fast and cheap, which also
# avoids the rate-limiting (429-masks-403) that a burst of real generations would trigger.
_PROBE_CONCURRENCY = 5


async def _is_usable(
    client: httpx.AsyncClient, url: str, headers: dict, name: str, sem: asyncio.Semaphore
) -> bool:
    """False only if the model is subscription-gated (HTTP 403); True otherwise.

    Uses a num_predict=0 generate so only the access gate runs (no inference). Gated models
    return 403; runnable ones return 400/200. Rate-limit/server errors (429/5xx) are retried;
    on persistent ambiguity we keep the model — a gate-only probe rarely rate-limits, so a
    non-403 reliably means runnable.
    """
    async with sem:
        for _ in range(3):
            try:
                r = await client.post(
                    f"{url}/api/generate",
                    headers=headers,
                    json={
                        "model": name,
                        "prompt": ".",
                        "stream": False,
                        "options": {"num_predict": 0},
                    },
                    timeout=20.0,
                )
                if r.status_code == 403:
                    return False
                if r.status_code != 429 and r.status_code < 500:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.7)
        return True


@router.get("/models")
async def list_models() -> list[dict[str, str]]:
    """List models from the configured Ollama server.

    Local Ollama (no API key): every model in /api/tags is installed and runnable, returned
    as-is. Cloud/proxied (API key set): the catalog includes models the account cannot run,
    so subscription-gated models are filtered out (probed once, then cached for a few minutes).
    """
    url = settings.ollama_url.rstrip("/")
    api_key = settings.ollama_api_key or ""
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    cache_key = (url, api_key)
    cached = _ACCESS_CACHE.get(cache_key)
    if cached and (time.monotonic() - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{url}/api/tags", headers=headers)
            response.raise_for_status()
            names = [m["name"] for m in response.json().get("models", []) if m.get("name")]

            if api_key and names:
                sem = asyncio.Semaphore(_PROBE_CONCURRENCY)
                usable = await asyncio.gather(
                    *(_is_usable(client, url, headers, n, sem) for n in names)
                )
                names = [n for n, ok in zip(names, usable) if ok]

            result = [{"value": n, "label": n} for n in sorted(names)]
            if api_key:
                _ACCESS_CACHE[cache_key] = (time.monotonic(), result)
            return result

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Ollama server at {settings.ollama_url}: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
