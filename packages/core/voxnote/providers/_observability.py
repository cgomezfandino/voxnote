"""Structured observability for LLM insight-extraction calls.

Each provider wraps its API call in :func:`observe_llm_call` so every extraction is
logged once to the ``voxnote.llm`` logger with provider, model, latency, token usage
(when the SDK exposes it), and success/error status. This replaces the previous
console-only "Extracting insights / Insights extracted" lines as the source of truth
for latency/usage while keeping those console lines for the developer experience.

Token usage is best-effort: every provider SDK exposes it differently, so callers pass
an already-normalized dict (``{"prompt": int|None, "completion": int|None, "total": int|None}``).
``None`` means the SDK did not report that field.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager

logger = logging.getLogger("voxnote.llm")


def log_llm_call(
    *,
    provider: str,
    model: str,
    elapsed_ms: float,
    success: bool,
    tokens: dict[str, int | None] | None = None,
    error: str | None = None,
) -> None:
    """Emit one structured line per LLM call.

    Kept compact and grep-friendly so the dev/error logs answer "how long did this
    provider take / how many tokens / did it fail" without scrolling console output.
    """
    tok = tokens or {}
    prompt = tok.get("prompt")
    completion = tok.get("completion")
    total = tok.get("total")
    status = "ok" if success else "error"
    msg = (
        f"llm_call provider={provider} model={model} status={status} "
        f"elapsed_ms={elapsed_ms:.0f}"
    )
    if prompt is not None or completion is not None or total is not None:
        msg += f" tokens(prompt={prompt} completion={completion} total={total})"
    if error:
        # Truncate the error string: exception messages can echo request bodies.
        msg += f" error={error[:200]!r}"
    if success:
        logger.info(msg)
    else:
        logger.warning(msg)


@contextmanager
def observe_llm_call(*, provider: str, model: str) -> Iterator[dict]:
    """Context manager that times a call and reports it via :func:`log_llm_call`.

    Yields a mutable dict; the caller may set ``"tokens"`` (and, on success, nothing
    else). On a clean exit the call is logged as ``ok``; on a raised exception it is
    logged as ``error`` (with the message) and the exception re-raises.
    """
    ctx: dict = {"tokens": None}
    start = time.perf_counter()
    try:
        yield ctx
    except BaseException as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        log_llm_call(
            provider=provider,
            model=model,
            elapsed_ms=elapsed_ms,
            success=False,
            tokens=ctx.get("tokens"),
            error=f"{type(exc).__name__}: {exc}",
        )
        raise
    else:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        log_llm_call(
            provider=provider,
            model=model,
            elapsed_ms=elapsed_ms,
            success=True,
            tokens=ctx.get("tokens"),
        )
