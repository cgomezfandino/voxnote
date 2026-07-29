# Client API credentials + Claude provider — Design

**Date:** 2026-06-15
**Status:** Approved (verbal, 2026-06-15)

## Goal

Let the user run insight extraction through OpenAI, Google, or **Claude (Anthropic)** using **their own API key and (where applicable) base URL/endpoint**, configured via environment variables (`.env`) exactly like `VOXNOTE_HF_TOKEN`. **The app never stores credentials** — it only reads them from the environment at runtime. Claude/Anthropic is added as a new provider.

## Constraints / decisions

- **No app-side storage of keys.** Keys and URLs live in `.env` / env vars, managed by the user — same model as the HuggingFace token. No UI key fields, no credentials file written by the app.
- **Default Claude model:** `claude-opus-4-8` (the repo convention is "default to the latest/most capable Claude"; confirmed against the `claude-api` reference).
- **Base URL:** exposed for OpenAI (already via `OPENAI_BASE_URL`) and Anthropic (the SDK supports `base_url`). Google/Gemini SDK does not use a base URL → key only.
- **Anthropic SDK:** official `anthropic` package, added as an optional extra (mirrors the existing `openai` / `google` extras). One non-streaming `messages.create` call; parse JSON from the response text block (same clean/repair approach the other providers use). The insights prompt already demands "ONLY valid JSON".

## What already works (documentation only)

| Provider | Env vars read today (no code change) |
|---|---|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_BASE_URL` (default `https://api.openai.com/v1`) — see `providers/openai.py` |
| Google | `GOOGLE_API_KEY` or `GEMINI_API_KEY`, `GOOGLE_MODEL` (default `gemini-2.0-flash`) — see `providers/google.py` |

These are already selectable in the UI provider dropdown and already read keys from env. They only need documenting in `.env.example` + README.

## New: Anthropic / Claude provider

### Backend
- **Create** `packages/core/voxnote/providers/anthropic.py` — `AnthropicProvider(LLMProvider)`, mirroring `openai.py`:
  - Reads `ANTHROPIC_API_KEY` (required → `ValueError` if missing), `ANTHROPIC_MODEL` (default `claude-opus-4-8`), `ANTHROPIC_BASE_URL` (optional).
  - `extract_insights(transcript)`: build the shared prompt via `build_insights_prompt(truncate_transcript(...))`; call `anthropic.Anthropic(api_key=..., base_url=... if set).messages.create(model=..., max_tokens=4096, messages=[{"role":"user","content":prompt}])`; take the first `text` block; clean + `json.loads` (reuse a shared JSON-cleanup helper, or local copies matching the ollama provider's `_clean_json`/`_repair_json`).
  - `name` property → `f"Anthropic ({model})"`.
- **Register** `"anthropic": AnthropicProvider` in `providers/__init__.py:get_provider()` and update the docstring's provider list.
- **Dependency:** add an `anthropic = ["anthropic>=0.40"]` optional extra in `packages/core/pyproject.toml` and include it in `all-providers`.

### Config + API
- Add `anthropic_model` field to `voxnote/config.py` (`Settings`), default `claude-opus-4-8`.
- Add `anthropic_model` to `ConfigResponse` / `ConfigUpdateRequest` in `packages/api/voxnote_api/schemas.py`, and handle it in `routes/config.py` (set `ANTHROPIC_MODEL` env on PUT; return it on GET) — exactly like `openai_model` / `google_model`.
- Add `"anthropic"` to `AVAILABLE_PROVIDERS` in `routes/config.py`.

### Frontend (`packages/web/src/components/ConfigPanel.tsx`)
- Add a `claude`/`anthropic` entry to `llmProviders` with `modelKey: "anthropic_model"` and a model list: `claude-opus-4-8` (Opus 4.8, default), `claude-sonnet-4-6` (Sonnet 4.6), `claude-haiku-4-5` (Haiku 4.5).
- Add `anthropic_model` to the `AppConfig` type (`packages/web/src/types`).
- **No API-key field** for openai/google/anthropic — keys are `.env` only (a short note in the "Connection" panel can point users to `.env`).

### Docs
- `.env.example` (create if missing) + README "Proveedores LLM" section: document `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / `ANTHROPIC_BASE_URL`, and surface the already-supported `OPENAI_BASE_URL`, next to the existing HF-token guidance.

## Out of scope (YAGNI)

- Storing keys anywhere by the app (explicitly rejected by the user).
- In-UI key entry fields.
- Structured-outputs / adaptive-thinking for the Anthropic call (a single non-streaming `messages.create` + JSON parse matches the other providers; structured outputs is a possible later robustness upgrade).
- Google base-URL field (SDK doesn't use one).

## Testing

- Unit test (mocked SDK, no network): `AnthropicProvider.extract_insights` builds the request with the configured model and parses a JSON response — mirrors the pattern of `test_ollama_provider.py`.
- `get_provider("anthropic")` returns an `AnthropicProvider`.
- Config round-trip: `anthropic_model` survives PUT→GET (api test).
- Web build/type-check passes with the new provider entry.

## Self-review

- **Placeholders:** none — every file and env var named.
- **Consistency:** `anthropic_model` naming matches `openai_model`/`google_model`; env var names match the SDK's expectations (`ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`).
- **Scope:** single cohesive feature (one new provider + expose existing creds via docs/UI), one implementation plan.
