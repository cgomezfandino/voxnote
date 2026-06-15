# Client API Credentials + Claude Provider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Claude (Anthropic) as an LLM provider and let the user configure OpenAI/Google/Claude credentials + URLs via `.env` (like `VOXNOTE_HF_TOKEN`); the app never stores keys.

**Architecture:** Mirror the existing `OpenAIProvider`. A new `AnthropicProvider` reads `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / `ANTHROPIC_BASE_URL` from the environment and calls the official `anthropic` SDK's Messages API, parsing JSON from the response text. Config model fields (`anthropic_model`) are handled in the config route via env, exactly like `openai_model`/`google_model` (NOT in `Settings`). The UI gains a Claude entry in the provider dropdown; no API-key fields in the UI.

**Tech Stack:** Python (`anthropic` SDK), FastAPI/Pydantic, Next.js/React, `.env`.

---

## Task 1: Anthropic provider (core)

**Files:**
- Create: `packages/core/voxnote/providers/anthropic.py`
- Modify: `packages/core/voxnote/providers/__init__.py`
- Modify: `packages/core/pyproject.toml` (add `anthropic` optional extra)
- Test: `packages/core/tests/test_anthropic_provider.py` (create)

- [ ] **Step 1: Install the SDK into the verification venv**

```bash
.venv/bin/pip install --quiet anthropic
```

- [ ] **Step 2: Write the failing test** — `packages/core/tests/test_anthropic_provider.py`

```python
"""Tests for the Anthropic (Claude) provider."""

from unittest.mock import MagicMock, patch

import pytest

from voxnote.providers.anthropic import AnthropicProvider


def test_requires_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError):
        AnthropicProvider()


def test_extract_parses_text_block(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-opus-4-8")

    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = '{"resumen": "ok"}'
    fake_msg = MagicMock()
    fake_msg.content = [text_block]
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_msg

    with patch("anthropic.Anthropic", return_value=fake_client):
        result = AnthropicProvider().extract_insights("Una reunión de prueba.")

    assert result["resumen"] == "ok"
    kwargs = fake_client.messages.create.call_args.kwargs
    assert kwargs["model"] == "claude-opus-4-8"
    # Opus 4.8 rejects sampling params — they must NOT be sent.
    assert "temperature" not in kwargs
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `.venv/bin/python -m pytest packages/core/tests/test_anthropic_provider.py -v`
Expected: FAIL (`ModuleNotFoundError: voxnote.providers.anthropic`).

- [ ] **Step 4: Create the provider** — `packages/core/voxnote/providers/anthropic.py`

```python
"""Anthropic (Claude) provider for insight extraction."""

import json
import os
import re

from rich.console import Console

from voxnote.providers.base import LLMProvider, build_insights_prompt, truncate_transcript

console = Console()

SYSTEM_PROMPT = """\
Eres un asistente especializado en analizar transcripciones de reuniones. \
Extrae insights estructurados y responde ÚNICAMENTE con JSON válido, \
sin markdown ni backticks.
"""

MAX_TRANSCRIPT_CHARS = 8000


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider (claude-opus-4-8, sonnet, haiku, …)."""

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        self.model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")
        # Optional override for proxies / gateways; None lets the SDK use its default.
        self.base_url = os.getenv("ANTHROPIC_BASE_URL") or None

    @property
    def name(self) -> str:
        return f"Anthropic ({self.model})"

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using the Anthropic Messages API."""
        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "anthropic package not installed. Install with: pip install anthropic"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client_kwargs: dict = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        client = anthropic.Anthropic(**client_kwargs)

        # No temperature/thinking: Opus 4.8 rejects sampling params, and the system
        # prompt + "ONLY JSON" instruction keeps the output a single JSON object.
        response = client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": build_insights_prompt(
                        truncate_transcript(transcript, MAX_TRANSCRIPT_CHARS)
                    ),
                }
            ],
        )

        raw = "".join(b.text for b in response.content if getattr(b, "type", None) == "text")
        raw = re.sub(r"```json?\n?", "", raw).replace("```", "").strip()
        try:
            data: dict = json.loads(raw)
        except json.JSONDecodeError:
            # Be robust to any prose around the JSON object.
            start, end = raw.find("{"), raw.rfind("}")
            data = json.loads(raw[start : end + 1])

        console.print("[green]Insights extracted[/]")
        return data
```

- [ ] **Step 5: Register the provider** — `packages/core/voxnote/providers/__init__.py`

Add the import + `__all__` entry + factory entry, and update the docstring's provider list:

```python
from voxnote.providers.anthropic import AnthropicProvider
from voxnote.providers.base import LLMProvider
from voxnote.providers.google import GoogleProvider
from voxnote.providers.ollama import OllamaProvider
from voxnote.providers.openai import OpenAIProvider

__all__ = [
    "LLMProvider",
    "OllamaProvider",
    "OpenAIProvider",
    "GoogleProvider",
    "AnthropicProvider",
]
```

In `get_provider`, add `"anthropic": AnthropicProvider,` to the `providers` dict and change the docstring `Args` line to `One of 'ollama', 'openai', 'google', 'anthropic'`.

- [ ] **Step 6: Add the optional extra** — `packages/core/pyproject.toml`

Under `[project.optional-dependencies]`, add:

```toml
anthropic = ["anthropic>=0.40"]
```

and add `"anthropic>=0.40"` to the `all-providers` list.

- [ ] **Step 7: Run the tests to confirm they pass**

Run: `.venv/bin/python -m pytest packages/core/tests/test_anthropic_provider.py -v`
Expected: PASS (2 tests).

- [ ] **Step 8: Add a `get_provider` factory test** — append to `packages/core/tests/test_anthropic_provider.py`

```python
def test_get_provider_returns_anthropic(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    from voxnote.providers import AnthropicProvider as Exported
    from voxnote.providers import get_provider

    assert isinstance(get_provider("anthropic"), Exported)
```

Run: `.venv/bin/python -m pytest packages/core/tests/test_anthropic_provider.py -v` → PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add packages/core/voxnote/providers/anthropic.py packages/core/voxnote/providers/__init__.py \
        packages/core/pyproject.toml packages/core/tests/test_anthropic_provider.py
git commit -m "feat(providers): add Anthropic/Claude provider (env-configured)"
```

---

## Task 2: Config schema + route (`anthropic_model`, allow provider)

**Files:**
- Modify: `packages/api/voxnote_api/schemas.py` (ConfigResponse, ConfigUpdateRequest, `_ALLOWED_PROVIDERS`)
- Modify: `packages/api/voxnote_api/routes/config.py` (AVAILABLE_PROVIDERS, get/update handling)
- Test: `packages/api/tests/test_config_anthropic.py` (create)

- [ ] **Step 1: Write the failing test** — `packages/api/tests/test_config_anthropic.py`

```python
from fastapi.testclient import TestClient


def test_anthropic_model_roundtrip_and_provider_allowed(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put(
        "/api/config",
        json={"llm_provider": "anthropic", "anthropic_model": "claude-sonnet-4-6"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["anthropic_model"] == "claude-sonnet-4-6"
    assert body["llm_provider"] == "anthropic"
    assert "anthropic" in body["available_providers"]
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `.venv/bin/python -m pytest packages/api/tests/test_config_anthropic.py -v`
Expected: FAIL (422 — `llm_provider` "anthropic" rejected by `_check_provider`, and no `anthropic_model` field).

- [ ] **Step 3: Update schemas** — `packages/api/voxnote_api/schemas.py`

In `ConfigResponse`, after `google_model`:

```python
    anthropic_model: str = "claude-opus-4-8"
```

In `ConfigUpdateRequest`, after `google_model`:

```python
    anthropic_model: str | None = None
```

Change the allowed-providers set:

```python
_ALLOWED_PROVIDERS = {"ollama", "openai", "google", "anthropic"}
```

- [ ] **Step 4: Update the config route** — `packages/api/voxnote_api/routes/config.py`

Add `"anthropic"` to `AVAILABLE_PROVIDERS`:

```python
AVAILABLE_PROVIDERS = ["ollama", "openai", "google", "anthropic"]
```

In `get_config()`, add to the `ConfigResponse(...)` call (next to `google_model=`):

```python
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8"),
```

In `update_config()`, after the `google_model` block:

```python
    if request.anthropic_model is not None:
        os.environ["ANTHROPIC_MODEL"] = request.anthropic_model
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `.venv/bin/python -m pytest packages/api/tests/test_config_anthropic.py -v` → PASS.
Then the full api suite: `.venv/bin/python -m pytest packages/api/tests -q` → all green.

- [ ] **Step 6: Commit**

```bash
git add packages/api/voxnote_api/schemas.py packages/api/voxnote_api/routes/config.py \
        packages/api/tests/test_config_anthropic.py
git commit -m "feat(api): expose anthropic_model in config + allow anthropic provider"
```

---

## Task 3: Frontend — Claude in the provider dropdown

**Files:**
- Modify: `packages/web/src/components/ConfigPanel.tsx` (add provider entry)
- Modify: `packages/web/src/types/index.ts` (add `anthropic_model` to `AppConfig`) — confirm exact path by reading `src/lib/api.ts`'s `@/types` import target

- [ ] **Step 1: Add `anthropic_model` to the `AppConfig` type**

Read the type file (the `AppConfig` interface imported by `src/lib/api.ts` from `@/types`). Add:

```ts
  anthropic_model: string;
```

next to `openai_model` / `google_model`.

- [ ] **Step 2: Add the Claude provider entry** — `packages/web/src/components/ConfigPanel.tsx`, append to the `llmProviders` array (after the `google` entry):

```tsx
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    needsUrl: false,
    models: [
      { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
    modelKey: "anthropic_model" as const,
  },
```

- [ ] **Step 3: Build to type-check**

Run: `npm --prefix packages/web run build`
Expected: `✓ Compiled successfully` and `✓ Exporting`.

- [ ] **Step 4: Verify in the browser (localhost)**

Start API + web (preview), open the UI, select "Claude (Anthropic)" in the Motor de IA dropdown, confirm the Claude model list appears and the selection persists via `PUT /api/config` (check the network call returns 200). Screenshot for proof.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ConfigPanel.tsx packages/web/src/types/index.ts
git commit -m "feat(web): add Claude (Anthropic) to the provider dropdown"
```

---

## Task 4: Documentation — `.env.example` + README

**Files:**
- Create/Modify: `.env.example` (repo root)
- Modify: `README.md` ("Proveedores LLM" section)

- [ ] **Step 1: Add the env vars to `.env.example`** (create if missing). Append:

```bash
# --- LLM cloud providers (optional; the user supplies their own keys, like VOXNOTE_HF_TOKEN) ---
# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
# Google Gemini
GOOGLE_API_KEY=
GOOGLE_MODEL=gemini-2.0-flash
# Anthropic (Claude)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-opus-4-8
ANTHROPIC_BASE_URL=
```

- [ ] **Step 2: Document in `README.md`** — under "Proveedores LLM", add an Anthropic subsection mirroring the OpenAI/Google ones, and note `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` for custom endpoints:

```markdown
### Anthropic (Claude)

```bash
VOXNOTE_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8   # o claude-sonnet-4-6 / claude-haiku-4-5
# ANTHROPIC_BASE_URL=...          # opcional, para proxies/gateways
```

Instala el extra: `pip install -e "packages/core[anthropic]"`.
```

State explicitly that all cloud keys go in `.env` (the app never stores them), like the HuggingFace token.

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs(providers): document OpenAI/Google/Anthropic env credentials"
```

---

## Self-review

- **Spec coverage:** Anthropic provider (Task 1) ✓; config/schema + AVAILABLE_PROVIDERS (Task 2) ✓; UI dropdown + AppConfig type (Task 3) ✓; docs incl. `OPENAI_BASE_URL`/`ANTHROPIC_BASE_URL` and HF-style guidance (Task 4) ✓. OpenAI/Google "already works" → covered by docs only, as specified.
- **Correction vs spec:** `anthropic_model` is handled in the config route via env (matching `openai_model`/`google_model`), NOT added to `Settings` — the provider reads `ANTHROPIC_MODEL` from env directly, mirroring `OpenAIProvider`.
- **Placeholder scan:** none — every file path, env var, and code block is concrete. (Task 3 Step 1 requires confirming the exact `@/types` file path by reading the import — the only lookup, not a placeholder.)
- **Type consistency:** `anthropic_model` used identically across schemas, route, AppConfig, and `modelKey`. Default `claude-opus-4-8` consistent everywhere. Env vars `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`/`ANTHROPIC_BASE_URL` match the SDK and the provider.

## Execution handoff

Plan complete. Small, single-subsystem feature — **inline execution** (executing-plans) is appropriate.
