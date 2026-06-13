"""Ollama model discovery: subscription-gated models (HTTP 403) are filtered out."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
import voxnote_api.routes.ollama as ollama
from voxnote_api.routes.ollama import _is_usable


def _client_returning(status: int) -> MagicMock:
    client = MagicMock()
    resp = MagicMock()
    resp.status_code = status
    client.post = AsyncMock(return_value=resp)
    return client


@pytest.mark.parametrize(
    "status, expected",
    [
        (403, False),  # subscription-gated → dropped
        (400, True),  # gate passed (num_predict=0 rejected) → runnable
        (200, True),  # runnable
    ],
)
def test_is_usable_classifies_by_status(status: int, expected: bool) -> None:
    sem = asyncio.Semaphore(1)
    result = asyncio.run(_is_usable(_client_returning(status), "http://x", {}, "m", sem))
    assert result is expected


def test_is_usable_retries_then_keeps_on_persistent_error(monkeypatch) -> None:
    # Transient errors are retried; on persistent ambiguity we keep the model rather than
    # hide one the user might actually be able to run.
    monkeypatch.setattr(ollama.asyncio, "sleep", AsyncMock())
    client = MagicMock()
    client.post = AsyncMock(side_effect=RuntimeError("boom"))
    sem = asyncio.Semaphore(1)
    assert asyncio.run(_is_usable(client, "http://x", {}, "m", sem)) is True
    assert client.post.await_count == 3  # retried up to 3 times


def test_is_usable_retries_on_429_then_keeps(monkeypatch) -> None:
    monkeypatch.setattr(ollama.asyncio, "sleep", AsyncMock())
    sem = asyncio.Semaphore(1)
    assert asyncio.run(_is_usable(_client_returning(429), "http://x", {}, "m", sem)) is True
