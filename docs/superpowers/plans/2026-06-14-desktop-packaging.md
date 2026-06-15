# Voxnote — Desktop Packaging (Fase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Voxnote into a downloadable desktop app that a non-technical person installs and runs without touching a terminal, Python, Node, or a HuggingFace token — macOS + Windows first, Linux later.

**Architecture:** A small native shell opens a window onto the statically-exported Next.js UI. The UI talks to ONE origin — a local FastAPI process bound to `127.0.0.1` on a free port that serves both the UI and `/api/*`, protected by a per-launch token. The heavy Python/ML stack and the model weights are **installed/downloaded on first run** (not frozen into the signed bundle), and a bundled Ollama child provides the local LLM.

**Tech Stack:** Next.js 15 static export · FastAPI/uvicorn (Python 3.11) · `uv` + committed `uv.lock` (CPU-only torch) · Ollama (bundled binary) · Whisper / whisperX / pyannote (first-run download) · desktop shell = **Tauri v2 or Electron (decision pending)**.

---

## ⚠️ Reality check (from the adversarial review — read before committing)

The first synthesis was directionally right but oversold two things. Corrected here:

1. **Don't freeze + sign the whole torch tree.** The single most expensive, fragile part of a "frozen sidecar" design is hardened-runtime codesigning + notarizing the hundreds of nested `torch`/`ctranslate2`/`onnxruntime` dylibs (multi-week, recurring on every dependency bump). **Recommended v1 instead:** sign only the small shell + Ollama + FFmpeg, and install the Python/ML stack into a per-user venv on first run via a bundled `uv` + committed `uv.lock` (wheels-only, no from-source compile). This dodges the dylib-signing tax and lets `uv` resolve CPU-only torch per-OS natively. The fully-frozen, fully-offline bundle becomes a separate, later SKU.

2. **There is no "320 MB base with one-click diarization."** Any path that imports whisperX pulls the full ~1.3 GB scientific stack — and importing whisperX silently switches the transcription engine for *all* users. Tokenless diarization is a **code change** in `transcriber.py` (it currently hard-skips when `hf_token` is empty), not a packaging flag, and it depends on the `torch.load` hardening landing first. **Recommendation: ship transcription + insights in v1; make diarization a v1.1 toggle.**

3. **Scope v1 to macOS + Windows.** Three webview engines (WebKitGTK/WKWebView/WebView2) for a polished, framer-motion-heavy student UI is real QA. Linux (and the air-gapped offline SKU) come after v1.

4. **Procurement is on the critical path.** Apple Developer ID ($99/yr) + a Windows OV code-signing cert (~$200–600/yr) have **days-to-weeks of lead time** and gate the entire signing milestone. Start these early.

**Honest sizing:** ~3–4 months of focused work to a rough-but-shippable macOS+Windows build; base installer ~a few hundred MB (shell+Ollama+ffmpeg+UI) with a ~1.5–2 GB first-run download (Python stack + Whisper + 3B LLM). This is **not** an S/M weekend.

---

## Decision matrix

| Fork | Options | Recommendation | Why |
|------|---------|----------------|-----|
| **Heavy-deps packaging** | (a) Freeze+sign whole torch tree · (b) **First-run `uv` install into per-user venv** · (c) hybrid | **(b)** for v1 | Removes the dylib notarization tax; `uv` resolves CPU torch per-OS; weights are first-run anyway. (a) becomes the later offline SKU. |
| **Desktop shell** | Tauri v2 · Electron · pywebview · no-shell | **Tauri v2** primary, **Electron** warm fallback | Native UX, low new-code for a Python/TS team. Electron if Linux WebKitGTK QA or delta-update size bites. **← needs your call** |
| **Frontend serving** | Same-origin static via FastAPI · ship Node `next start` · keep absolute URL+CORS | **Same-origin static** | One origin kills CORS, ships no Node, frees the port. |
| **Ollama** | Bundle binary + child + first-run-pull · auto-install · embed llama.cpp · require user install | **Bundle MIT binary + managed child + first-run-pull** | Reuses 100% of the existing HTTP client; Ollama handles the GPU/CPU matrix. |
| **Model distribution** | Tiered (small base + first-run) · all-in-one 6–10 GB · always-download | **Tiered** | Reliable base download; defer multi-GB weights behind a progress UI. |
| **API auth** | None · **`X-Voxnote-Token` + `hmac.compare_digest`** · CORS-only · keychain/mTLS | **Token, runtime-injected** | Only real defense against DNS-rebinding / no-Origin localhost calls CORS can't block. |
| **Default LLM** | llama3.2:3b (~2 GB) · llama3.1:8b (~4.7 GB) | **3B default, 8B one-click upgrade — gated by a schema-pass eval** | Smaller first run; 8B if 3B fails JSON-faithfulness. **← needs your call** |
| **v1 OS scope** | mac+win+linux · **mac+win** | **mac+win**, Linux later | Cut a webview engine + a CI signing leg. |
| **Diarization in v1** | ship now · **defer to v1.1** | **Defer** | Needs `torch.load` hardening + a transcriber code change; shrinks v1 surface. **← needs your call** |

### Open decisions that need YOU (defaults in bold above)
1. **Shell:** Tauri v2 (full-binary auto-update, Rust toolchain in CI) vs Electron (≈+100 MB Chromium, delta updates, single engine).
2. **Default LLM:** 3B (smaller, weaker JSON) vs 8B (bigger first run, more reliable insights).
3. **Diarization in v1** or v1.1?
4. **Code-signing:** Do you already have an Apple Developer ID and a Windows OV cert? If not, start procurement now (gates distribution).
5. **Offline/air-gapped SKU:** do you want a second "everything bundled" installer, or is online-first-run acceptable for v1?

---

## Staging overview

- **Stage A — Localhost foundation** (fork-independent, 100% testable on localhost now, zero packaging). This is where we iterate immediately. No certs, no shell, no Tauri.
- **Stage B — Packaging & first-run** (needs decisions #1, #4). Bundler, FFmpeg resolver, shell, Ollama child, first-run wizard, mic-permission UX.
- **Stage C — Distribution & hardening** (needs certs). Signing/notarization, installers, auto-update, diarization hardening (decision #3), uninstall/data lifecycle, crash logging, E2E tests, versioning, NOTICES, i18n.

A dependency rule the review insisted on: **Stage A4 (reproducibility: Python pin + `uv.lock` + CPU torch) must land before any Stage B bundling.**

---

# STAGE A — Localhost foundation (do now)

Each task is bite-sized and verified on localhost with the existing Python 3.11 `.venv`. Nothing here requires a shell, certs, or model downloads.

## Task A1: Same-origin serving (FastAPI serves the static UI)

**Files:**
- Modify: `packages/web/next.config.js`
- Modify: `packages/web/src/lib/api.ts:15`
- Create: `packages/web/.env.development`
- Modify: `packages/api/voxnote_api/main.py:12,65-67`
- Test: `packages/api/tests/test_static_serving.py` (create)

- [ ] **Step 1: Write the failing test** — `packages/api/tests/test_static_serving.py`

```python
from pathlib import Path

from fastapi.testclient import TestClient


def test_serves_index_when_web_dir_set(tmp_path, monkeypatch):
    web = tmp_path / "web_static"
    web.mkdir()
    (web / "index.html").write_text("<!doctype html><title>voxnote</title>", encoding="utf-8")
    monkeypatch.setenv("VOXNOTE_WEB_DIR", str(web))

    # Import the factory fresh so the env var is read at app-creation time.
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    # /api still wins over the static mount
    assert client.get("/api/health").status_code == 200
    # Root serves the SPA index
    root = client.get("/")
    assert root.status_code == 200
    assert "voxnote" in root.text


def test_no_static_mount_without_env(monkeypatch):
    monkeypatch.delenv("VOXNOTE_WEB_DIR", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    assert client.get("/api/health").status_code == 200
    # No static dir → root is a 404 (API-only mode, unchanged dev behavior)
    assert client.get("/").status_code == 404
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_static_serving.py -v`
Expected: FAIL (root returns 404 even with `VOXNOTE_WEB_DIR` set — no static mount yet).

- [ ] **Step 3: Mount StaticFiles after the routers** — `packages/api/voxnote_api/main.py`

At the top with the other imports add:

```python
import os
from pathlib import Path

from fastapi.staticfiles import StaticFiles
```

Immediately after the last `app.include_router(...)` (currently line 65) and before `return app`:

```python
    # Serve the exported Next.js UI same-origin in the packaged app. Mounted AFTER the
    # /api routers so /api/* always wins. Gated on VOXNOTE_WEB_DIR so dev (API-only) is
    # unaffected. html=True serves index.html for "/".
    web_dir = os.getenv("VOXNOTE_WEB_DIR")
    if web_dir and Path(web_dir).is_dir():
        app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_static_serving.py -v`
Expected: PASS (both tests).

- [ ] **Step 5: Make the frontend API base env-driven** — `packages/web/src/lib/api.ts`

Replace line 15:

```ts
const API_BASE = "http://localhost:8003/api";
```

with:

```ts
// Packaged build: same-origin relative "/api" (FastAPI serves UI + API on one port).
// Dev: NEXT_PUBLIC_API_BASE points at the standalone API on :8003 (see .env.development).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
```

- [ ] **Step 6: Add the dev env file** — create `packages/web/.env.development`

```
NEXT_PUBLIC_API_BASE=http://localhost:8003/api
```

(Next loads `.env.development` only under `next dev`. The production `next build` has no such var → falls back to relative `/api`. CORS in `main.py` already allows the `:3003` dev origin.)

- [ ] **Step 7: Switch the build to static export** — replace the entire `packages/web/next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

(The old `rewrites()` proxy is removed — rewrites are not applied under `output: 'export'`, and the dev path now goes through `NEXT_PUBLIC_API_BASE` + CORS.)

- [ ] **Step 8: Verify the static export builds and is served same-origin (localhost proof)**

```bash
cd packages/web && npm run build          # emits packages/web/out/
cd ../.. 
VOXNOTE_WEB_DIR=packages/web/out VOXNOTE_API_PORT=8003 .venv/bin/voxnote-api &  # or: python -m uvicorn
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8003/            # expect 200 (UI)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8003/api/health  # expect 200 (API)
```

Expected: both `200`, served from one origin. (If `next build` fails fetching the Inter font offline, that's the known build-time-network item — deferred to Stage B's offline-build hardening; on a networked dev machine it succeeds.)

- [ ] **Step 9: Confirm dev still works** — `make dev`, open `http://localhost:3003`, record/process a clip. The UI now calls `:8003` via `NEXT_PUBLIC_API_BASE`. Verify no CORS errors in the browser console.

- [ ] **Step 10: Commit**

```bash
git add packages/web/next.config.js packages/web/src/lib/api.ts packages/web/.env.development \
        packages/api/voxnote_api/main.py packages/api/tests/test_static_serving.py
git commit -m "feat(packaging): serve exported UI same-origin from FastAPI (Stage A1)"
```

## Task A2: Localhost token auth

**Files:**
- Modify: `packages/core/voxnote/config.py` (add `api_token`)
- Create: `packages/api/voxnote_api/deps.py`
- Modify: `packages/api/voxnote_api/main.py` (apply dependency to all routers except health)
- Modify: `packages/web/src/lib/api.ts` (attach `X-Voxnote-Token` on every fetch)
- Test: `packages/api/tests/test_auth.py` (create)

- [ ] **Step 1: Write the failing test** — `packages/api/tests/test_auth.py`

```python
from fastapi.testclient import TestClient


def test_token_required_when_set(monkeypatch):
    monkeypatch.setenv("VOXNOTE_API_TOKEN", "s3cret")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    # health is always open (used by the shell readiness probe)
    assert client.get("/api/health").status_code == 200
    # a protected route 401s without the header
    assert client.get("/api/config").status_code == 401
    # and 200s with the correct token
    assert client.get("/api/config", headers={"X-Voxnote-Token": "s3cret"}).status_code == 200


def test_auth_disabled_when_unset(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    assert client.get("/api/config").status_code == 200  # dev: no token configured → open
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_auth.py -v`
Expected: FAIL (`/api/config` returns 200 even with a token set — no auth yet).

- [ ] **Step 3: Add the setting** — `packages/core/voxnote/config.py`, after the `max_json_mb` field:

```python
    # Localhost auth (packaged desktop app). When empty, auth is disabled (dev).
    api_token: str = Field(
        default="",
        description="Shared secret the desktop shell injects; required on all API routes "
        "except /api/health. Empty = auth disabled (local dev).",
    )
```

- [ ] **Step 4: Create the dependency** — `packages/api/voxnote_api/deps.py`

```python
"""Shared FastAPI dependencies."""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from voxnote.config import settings


async def require_token(x_voxnote_token: str | None = Header(default=None)) -> None:
    """Constant-time token check. No-op when no token is configured (dev)."""
    expected = settings.api_token
    if not expected:
        return
    if x_voxnote_token is None or not hmac.compare_digest(x_voxnote_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token."
        )
```

- [ ] **Step 5: Apply it to every router except health** — `packages/api/voxnote_api/main.py`

Add the import:

```python
from fastapi import Depends, FastAPI, Request
from voxnote_api.deps import require_token
```

Change the router registrations (lines 59-65) so all but `health` carry the dependency:

```python
    _auth = [Depends(require_token)]
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(transcribe.router, prefix="/api", tags=["transcribe"], dependencies=_auth)
    app.include_router(insights.router, prefix="/api", tags=["insights"], dependencies=_auth)
    app.include_router(export.router, prefix="/api", tags=["export"], dependencies=_auth)
    app.include_router(config.router, prefix="/api", tags=["config"], dependencies=_auth)
    app.include_router(notes.router, prefix="/api", tags=["notes"], dependencies=_auth)
    app.include_router(ollama.router, prefix="/api/ollama", tags=["ollama"], dependencies=_auth)
```

- [ ] **Step 6: Run the test to confirm it passes**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_auth.py -v`
Expected: PASS. Also run the full api suite to confirm no regressions: `../../.venv/bin/python -m pytest -q`.

- [ ] **Step 7: Attach the token from the UI** — `packages/web/src/lib/api.ts`

Add near the top (after `API_BASE`):

```ts
// The desktop shell injects the per-launch token on window at runtime (never NEXT_PUBLIC,
// so it is not baked into the static bundle). Dev has no token → header omitted.
function authHeaders(): Record<string, string> {
  const t =
    (typeof window !== "undefined" &&
      (window as unknown as { __VOXNOTE_TOKEN__?: string }).__VOXNOTE_TOKEN__) ||
    undefined;
  return t ? { "X-Voxnote-Token": t } : {};
}
```

Then merge `authHeaders()` into every `fetch` call. For GET calls add `{ headers: { ...authHeaders() } }`; for calls that already set `Content-Type`, spread it: `headers: { "Content-Type": "application/json", ...authHeaders() }`; for the multipart `transcribeAudio` add `headers: { ...authHeaders() }` (do NOT set Content-Type — the browser sets the multipart boundary). Apply to all 11 calls (lines 49, 71, 84, 99, 112, 137, 144, 155, 161, 172, 190).

- [ ] **Step 8: Verify on localhost**

```bash
VOXNOTE_API_TOKEN=testtoken VOXNOTE_API_PORT=8003 .venv/bin/voxnote-api &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8003/api/config                                  # 401
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Voxnote-Token: testtoken" http://127.0.0.1:8003/api/config  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8003/api/health                                  # 200
```

- [ ] **Step 9: Commit**

```bash
git add packages/core/voxnote/config.py packages/api/voxnote_api/deps.py \
        packages/api/voxnote_api/main.py packages/api/tests/test_auth.py packages/web/src/lib/api.ts
git commit -m "feat(packaging): localhost token auth on all routes except health (Stage A2)"
```

## Task A3: Single-process entrypoint, per-user data dir, readiness, logging

**Files:**
- Modify: `packages/core/pyproject.toml` (add `platformdirs` dep)
- Create: `packages/api/voxnote_api/desktop.py` (entrypoint)
- Modify: `packages/api/pyproject.toml` (register `voxnote-desktop` script)
- Create/Modify: `packages/api/voxnote_api/routes/health.py` (add `/api/ready`)
- Modify: `packages/api/voxnote_api/main.py` (chmod 0o700 in lifespan; basic logging)
- Test: `packages/api/tests/test_ready.py` (create)

- [ ] **Step 1: Write the failing test for readiness** — `packages/api/tests/test_ready.py`

```python
from fastapi.testclient import TestClient


def test_ready_reports_component_state(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.get("/api/ready")
    assert res.status_code == 200
    body = res.json()
    # Shell uses this (not /api/health) to know the app is actually usable.
    assert set(["ok", "ollama_reachable", "output_dir_writable"]).issubset(body.keys())
    assert isinstance(body["ok"], bool)
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_ready.py -v`
Expected: FAIL (404 — `/api/ready` does not exist).

- [ ] **Step 3: Add `/api/ready`** — append to `packages/api/voxnote_api/routes/health.py`

```python
@router.get("/ready")
async def ready() -> dict:
    """Richer readiness than /health: is the app actually usable?

    /health flips to ok the instant uvicorn binds; the shell needs to know whether
    Ollama is reachable and the data dir is writable before dropping the splash screen.
    """
    import httpx

    from voxnote.config import settings

    output_ok = False
    try:
        settings.output_dir.mkdir(parents=True, exist_ok=True)
        probe = settings.output_dir / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        output_ok = True
    except OSError:
        output_ok = False

    ollama_ok = False
    if settings.llm_provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=1.5) as c:
                r = await c.get(f"{settings.ollama_url}/api/tags")
                ollama_ok = r.status_code == 200
        except (httpx.HTTPError, OSError):
            ollama_ok = False
    else:
        ollama_ok = True  # not required for non-ollama providers

    return {
        "ok": output_ok and ollama_ok,
        "output_dir_writable": output_ok,
        "ollama_reachable": ollama_ok,
    }
```

(Confirm `httpx` is already a dependency — it is, via the providers. If the project uses `requests` instead, swap to the existing HTTP client.)

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/api && ../../.venv/bin/python -m pytest tests/test_ready.py -v`
Expected: PASS (`ollama_reachable` may be False if Ollama isn't running locally — that's fine; the keys exist and `ok` is a bool).

- [ ] **Step 5: Add `platformdirs`** — `packages/core/pyproject.toml`, add to `dependencies`:

```toml
  "platformdirs>=4.0",
```

Install: `.venv/bin/pip install -e packages/core`

- [ ] **Step 6: Harden the data dir in lifespan** — `packages/api/voxnote_api/main.py`, in `lifespan`, after `settings.output_dir.mkdir(...)`:

```python
    import logging

    logging.basicConfig(level=logging.INFO)
    try:
        settings.output_dir.chmod(0o700)
    except OSError:
        logging.getLogger("voxnote").warning("could not chmod 0o700 on output_dir")
```

- [ ] **Step 7: Create the desktop entrypoint** — `packages/api/voxnote_api/desktop.py`

```python
"""Single-process entrypoint for the packaged desktop app.

Picks a per-user data dir and a free port BEFORE importing settings, then runs uvicorn
in-process (app object, not an import string — survives a frozen/relocated interpreter)
with reload OFF.
"""

from __future__ import annotations

import os
import socket


def _pick_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    from platformdirs import user_data_dir

    # Per-user, app-managed data dir (notes). Must be set before settings import.
    data_dir = os.getenv("VOXNOTE_OUTPUT_DIR") or os.path.join(
        user_data_dir("Voxnote", "Voxnote"), "notes"
    )
    os.environ["VOXNOTE_OUTPUT_DIR"] = data_dir

    host = "127.0.0.1"
    port = int(os.getenv("VOXNOTE_API_PORT", "0") or _pick_free_port())

    # Announce the port so the shell can build the URL and inject the token.
    print(f"VOXNOTE_READY host={host} port={port}", flush=True)

    import uvicorn

    from voxnote_api.main import app

    uvicorn.run(app, host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
```

- [ ] **Step 8: Register the script** — `packages/api/pyproject.toml`, under `[project.scripts]`:

```toml
voxnote-desktop = "voxnote_api.desktop:main"
```

Reinstall: `.venv/bin/pip install -e packages/api`

- [ ] **Step 9: Verify the single-process app on localhost**

```bash
cd packages/web && npm run build && cd ../..
VOXNOTE_WEB_DIR=packages/web/out VOXNOTE_API_TOKEN=testtoken .venv/bin/voxnote-desktop &
# read the "VOXNOTE_READY host=127.0.0.1 port=PORT" line, then:
P=<port>
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$P/                # 200 UI
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$P/api/health      # 200
curl -s http://127.0.0.1:$P/api/ready                                        # {"ok":...}
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Voxnote-Token: testtoken" http://127.0.0.1:$P/api/config  # 200
ls "$(.venv/bin/python -c 'from platformdirs import user_data_dir; print(user_data_dir("Voxnote","Voxnote"))')/notes"  # data dir exists
```

Expected: one process serves UI + API on a free port; notes land in the per-user dir, not `./output`.

- [ ] **Step 10: Commit**

```bash
git add packages/core/pyproject.toml packages/api/voxnote_api/desktop.py packages/api/pyproject.toml \
        packages/api/voxnote_api/routes/health.py packages/api/voxnote_api/main.py packages/api/tests/test_ready.py
git commit -m "feat(packaging): single-process desktop entrypoint + /api/ready + per-user data dir (Stage A3)"
```

## Task A4: Reproducibility foundation (REQUIRED before Stage B)

**Files:**
- Create: `.python-version`
- Modify: `packages/core/pyproject.toml`, `packages/api/pyproject.toml` (`requires-python`, ruff `target-version`, mypy `python_version`)
- Create: `uv.lock` (workspace lock, CPU-only torch index)
- Modify: `.github/workflows/ci.yml` (add `pip-audit`/`osv-scanner`, assert torch is CPU-only)

- [ ] **Step 1: Pin the interpreter** — create `.python-version` at repo root:

```
3.11
```

- [ ] **Step 2: Tighten `requires-python` and tooling** in BOTH `packages/core/pyproject.toml` and `packages/api/pyproject.toml`:
  - `requires-python = ">=3.11,<3.14"`
  - ruff `target-version = "py311"`
  - mypy `python_version = "3.11"`

- [ ] **Step 3: Pin CPU-only torch and lock** — add a CPU index pin (in `pyproject.toml` `[tool.uv]` or a `uv` index config) so torch resolves to `+cpu` on every OS, then:

```bash
uv lock
```

Commit the generated `uv.lock`. (If `uv` isn't installed yet: `curl -LsSf https://astral.sh/uv/install.sh | sh`.)

- [ ] **Step 4: Assert CPU-only torch in CI** — add to `.github/workflows/ci.yml` a step that fails if a CUDA/nvidia wheel appears in the lock, plus a `pip-audit` (or `osv-scanner`) step over the lock.

- [ ] **Step 5: Verify** — fresh resolve in a throwaway env reproduces the locked set; `pip-audit` runs clean (or only known-accepted advisories).

```bash
uv sync --frozen && uv pip list | grep -i torch   # expect a +cpu build, no nvidia-* packages
```

- [ ] **Step 6: Commit**

```bash
git add .python-version packages/*/pyproject.toml uv.lock .github/workflows/ci.yml
git commit -m "build(packaging): pin Python 3.11 + uv.lock with CPU-only torch + supply-chain audit (Stage A4)"
```

**At the end of Stage A:** the app runs as ONE authenticated localhost process serving the real exported UI, with a per-user data dir, a readiness endpoint, and a reproducible CPU-only dependency lock — all verified on localhost, all reversible, no packaging yet.

---

# STAGE B — Packaging & first-run (needs decisions #1 shell, #4 certs to *start*; build/run is testable on localhost)

> Detailed steps here depend on the shell decision. Each milestone still ends in a concrete localhost test. Implement after Stage A and after the shell is chosen.

### B1: FFmpeg resolution as a code change (not "on PATH")
- **Why:** `openai-whisper`/whisperX shell out to `ffmpeg` by name; a double-clicked app does **not** inherit the user's shell PATH. Bundling ffmpeg is necessary but insufficient.
- **Do:** add `imageio-ffmpeg` (or bundle a static ffmpeg per-OS) and resolve an absolute ffmpeg path; set it for whisper (env or monkeypatch the resolver) so transcription works with no system ffmpeg.
- **Localhost test:** on a machine with system ffmpeg renamed/removed from PATH, `POST /api/transcribe` of a 5 s clip still succeeds.

### B2: First-run `uv` install of the heavy stack into a per-user venv
- **Do:** bundle a `uv` binary + the committed `uv.lock`. On first run, `uv sync --frozen` into `<user data>/runtime` (wheels-only). Stream progress to the first-run wizard.
- **Localhost test:** from a clean user profile (no project venv), first run provisions the venv; `voxnote-desktop` then boots and a real transcribe round-trip works.

### B3: Desktop shell wraps the sidecar (Tauri v2 **or** Electron — decision #1)
- **Do:** shell spawns the Python entrypoint as a managed child, reads the `VOXNOTE_READY host=… port=…` line, generates a 256-bit token (`secrets.token_urlsafe(32)`), passes it to the child via env and injects `window.__VOXNOTE_TOKEN__` into the renderer, then loads `http://127.0.0.1:<port>/`. Declare the mic entitlement (`NSMicrophoneUsageDescription` on macOS). Kill the child on quit (Windows needs a Job Object, not just signal).
- **Localhost test:** native window opens (no browser chrome); Record→Process works end-to-end; on quit, `ps`/Task Manager shows no orphaned `python`/`uvicorn`/`ollama`.

### B4: Bundle + manage Ollama
- **Do:** ship the MIT Ollama binary; auto-start a managed child (`OLLAMA_HOST=127.0.0.1`, app-private `OLLAMA_MODELS`); wait for `/api/tags` 200; first-run-pull the default model (decision #2). **Collision policy:** probe `:11434` first; if a user instance exists, spawn ours on an alternate port and wire `VOXNOTE_OLLAMA_URL` through at launch (clean isolation, "touch nothing" both directions). Replace the hardcoded "Ollama Activo" badge with a live `/api/ready` signal.
- **Localhost test:** on a machine WITHOUT Ollama, full Record→Transcribe→Insights→Export with zero manual Ollama steps; killing the bundled Ollama flips the badge to inactive.

### B5: First-run wizard + model download UX
- **Do:** point `HF_HOME`/`TORCH_HOME`/`XDG_CACHE_HOME`/`OLLAMA_MODELS` at app dirs; download Whisper `turbo` + pull the LLM with **resumable, SHA-256-verified** progress; disk-space precheck before a ~3.5 GB pull; define the mid-download-failure / quit-at-80% / corrupted-partial recovery UX; migrate `next/font/google` → `next/font/local` (vendored Inter woff2) so the packaging build is offline-safe.
- **Localhost test:** clear caches → first launch shows progress, completes the download, then transcribe works; pull the cable → it resumes; transcribe offline succeeds.

### B6: Microphone-permission UX
- **Do:** handle `getUserMedia` denied per-OS — macOS deep-link to System Settings (a denied prompt can't be re-triggered), Windows Privacy toggle guidance, Linux PipeWire/PulseAudio portal. Turn the "recording silently fails" state into a handled UI message.
- **Localhost test:** deny mic at the OS level → the UI shows a clear recovery path, not a silent failure.

---

# STAGE C — Distribution & hardening (needs certs; gates public release)

### C1: `torch.load` hardening + tokenless diarization (decision #3; required before any diarization SKU)
- **Do:** replace the global `weights_only=False` monkeypatch in `transcriber.py` with `torch.serialization.add_safe_globals(...)` (keep `weights_only=True`); pin `diarize_model` to a specific HF revision and verify a SHA-256 before load. Then make diarization tokenless: stop gating on `hf_token`, load community-1 from a pre-bundled local snapshot with `HF_HUB_OFFLINE=1`. **Verify the community-1 LICENSE actually permits redistribution of the weights** (don't trust HANDOFF.md), and that the build machine holds an HF token to fetch it once for bundling.
- **Localhost test:** offline, empty token, bundled snapshot → a diarized run produces SPEAKER_xx output (not silently skipped).

### C2: Code-signing + notarization (decision #4 — procure certs NOW)
- **Do:** macOS hardened-runtime codesign of every nested executable/dylib (torch, numpy, ctranslate2, onnxruntime, **ffmpeg**, the Python interpreter) + `com.apple.security.cs.allow-unsigned-executable-memory` entitlement → notarize → staple. Windows OV Authenticode sign. Budget 1–3 weeks of signing iteration the first time, per arch.
- **Localhost/clean-VM test:** the signed+notarized artifact launches on a clean macOS (arm64 + x86_64) and Windows VM with no Gatekeeper/SmartScreen block; `/api/health`→200 inside the running app + a full transcribe→insights→export round-trip.

### C3: CI/CD release matrix
- **Do:** GH Actions matrix (macos-14 arm64, macos-13 or self-hosted x86_64, windows). Store certs as encrypted secrets; notarize async + staple; verify GH Releases size limits for multi-GB artifacts (else host on S3/R2).

### C4: Auto-update (its own feature, not a footnote)
- **Do:** update feed/manifest + a **separate** update-signing key; child-process-safe apply (don't orphan Ollama/Python); rollback/staged rollout. Keep model weights out of the updated artifact. (Electron gives delta updates; Tauri ships full binaries — feeds decision #1.)

### C5: Lifecycle, observability, polish
- **Uninstall/data:** decide caches under bundle (reclaimed) vs user-data (orphaned multi-GB); per-OS uninstall hooks; "keep my notes" protection (notes must never be deleted by default); notes export/restore.
- **Local crash logging:** per-OS log paths for the Python sidecar/uvicorn/Ollama/webview console; a findable crash bundle; **no auto-upload** (local-first → telemetry opt-in only, stated explicitly).
- **Versioning:** one canonical app version reconciling core/api/web (today 0.1.0/0.1.0/1.0.0); About screen; CHANGELOG; the auto-updater needs a single monotonic version.
- **E2E tests:** a real UI harness (Playwright / tauri-driver) that opens the window, grants mic, records, and asserts the DOM — the web package has **zero** tests today.
- **NOTICES.md:** regenerate with `pip-licenses`; add pyannote community-1 CC-BY attribution + the Llama Community License + a "Built with Llama" in-app string + the FFmpeg license posture (GPL vs LGPL build).
- **i18n of chrome:** the product UI is Spanish; OS permission strings / installer text / first-run wizard locale need a decision.

---

## Risk register (top items — full list in the workflow output)

| Sev | Risk | Mitigation |
|-----|------|------------|
| High | macOS notarization of nested torch/ffmpeg binaries blocks launch | First-run-venv model (sign only shell+Ollama+ffmpeg, NOT the torch tree); budget weeks; clean-VM test |
| High | Auth ships server-side but UI token plumbing lags → whole UI 401s | Treat A2 as one atomic change; keep `/api/health` open |
| High | Default torch pulls CUDA on win/linux → multi-GB installer | Pin `+cpu` index in `uv.lock`; CI size assertion (A4) |
| High | `torch.load weights_only=False` monkeypatch = RCE-by-deserialization, shipped to all users | `add_safe_globals` + HF revision pin + SHA-256 (C1) before any diarization SKU |
| High | Python 3.11 pin exists only as convention → CI/contributors resolve a broken set | `.python-version` + `uv.lock` (A4) before Stage B |
| Med | FFmpeg "on PATH" works for author, dies on clean VM | Bundle + absolute-path resolver (B1); test on a truly clean machine |
| Med | Windows SmartScreen warns until reputation accrues | OV cert; document the warning window; build reputation via signed releases |
| Med | Bundled Ollama collides with user's :11434 / orphans on quit | Probe first; alternate port + `VOXNOTE_OLLAMA_URL` injection; window-tied lifecycle |
| Med | 3B LLM weaker at schema-faithful insights JSON | Format-constrained decoding + schema eval gate before defaulting to 3B |
| Med | Tauri full-binary auto-update = multi-GB re-download per patch | Keep weights first-run-downloaded; Electron fallback for deltas |

---

## Self-review notes
- **Spec coverage:** every locked product-direction item is covered — 100%-local default (bind 127.0.0.1, no telemetry, opt-in crash reports), non-technical UX (first-run wizard, bundled Ollama, no HF token), desktop-first mac+win, redistributable licenses (NOTICES C5, license verify C1).
- **Sequencing guard:** A4 (reproducibility) precedes Stage B; C1 (`torch.load`) precedes any diarization; certs (decision #4) precede C2.
- **Known unverifieds to check during execution:** community-1 redistribution license text; macos-13 Intel runner availability; GH Releases multi-GB limits; `python-build-standalone`/uv relocation for ctranslate2 across OSes (only relevant if we ever build the frozen offline SKU); OV-vs-EV SmartScreen behavior.

---

## Execution handoff

Stage A is ready to execute now on localhost and needs **no** decisions. Stages B/C need decisions #1–#5 and cert procurement.

**Two execution options for Stage A:**
1. **Subagent-Driven (recommended)** — a fresh subagent per task (A1→A4), review between tasks, fast iteration.
2. **Inline Execution** — execute A1→A4 in-session with checkpoints.
