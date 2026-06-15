# Ollama Local + Cloud providers — Design

**Date:** 2026-06-15
**Status:** Approved (verbal, 2026-06-15)

## Goal

Let the user pick **"Ollama (Cloud)"** as a provider. Selecting it sets the endpoint (`https://ollama.com`) behind the scenes, so the user only enters their Ollama Cloud **API key**. **"Ollama (Local)"** uses `http://localhost:11434` and needs no key. The model picker stays dynamic and shows the cloud models the user's plan can actually run.

## Key fact: the backend already speaks Ollama Cloud

- `providers/ollama.py` already sends `Authorization: Bearer <key>` when `ollama_api_key` is set.
- `routes/ollama.py:list_models` already fetches `/api/tags` with the Bearer key AND probes/filters subscription-gated cloud models (caches the result).
- `ollama_url` + `ollama_api_key` are now wired through `PUT /api/config` (fixed earlier today).

So this feature is **UX wiring + a 2-line backend mapping** — no new pipeline.

**Confirmed from docs.ollama.com/cloud:** base URL `https://ollama.com` (NOT `/api`; the provider appends `/api/...`); auth `Authorization: Bearer $OLLAMA_API_KEY`; paths `/api/tags`, `/api/generate`, `/api/chat`.

## Changes

### Backend (minimal)
- `providers/__init__.py:get_provider` — map `"ollama-cloud"` → `OllamaProvider` (same class; URL+key come from settings).
- `schemas.py:_ALLOWED_PROVIDERS` and `routes/config.py:AVAILABLE_PROVIDERS` — add `"ollama-cloud"`.

No new provider class: `OllamaProvider` already uses `settings.ollama_url` + `settings.ollama_api_key`. The frontend sets the URL per variant.

### Frontend (`ConfigPanel.tsx`, `useConfig.ts`)
- `llmProviders`: rename the existing entry label `"Ollama"` → `"Ollama (Local)"` (value stays `"ollama"`); add `"Ollama (Cloud)"` (value `"ollama-cloud"`, `needsUrl: true`, `modelKey: "ollama_model"`). Remove the hardcoded `gemma4:31b-cloud` fallback model (the dynamic list is authoritative).
- `defaultBaseUrls`: `{ ollama: "http://localhost:11434", "ollama-cloud": "https://ollama.com" }`.
- **On provider change to an Ollama variant**: set `ollama_url` to that variant's default endpoint (auto, behind the scenes) — so the user never types a URL.
- **Ollama-ness check**: everywhere the code special-cases `llm_provider === "ollama"` (model fetch, status badge, URL/key fields), treat **both** `"ollama"` and `"ollama-cloud"` as Ollama. Add a helper `isOllama(p) = p === "ollama" || p === "ollama-cloud"`.
- **Cloud key UX**: for `ollama-cloud`, show the **API Key** field as the primary input (label it required-ish). The URL field is shown pre-filled (`https://ollama.com`) and editable (advanced: proxies/gateways) but the user doesn't need to touch it.
- **Model list refresh**: re-fetch models when `llm_provider`, `ollama_url`, or `ollama_api_key` change, sequenced **after** the config sync so the backend has the URL+key before the fetch (avoid the fetch racing the debounced `PUT /api/config`). Mechanism: the fetch effect awaits a config push (or a debounce slightly longer than the config-sync debounce).

### Key handling
The API key goes in the UI's existing API Key field (session-scoped — set via env at runtime, not written to disk), **or** in `.env` as `VOXNOTE_OLLAMA_API_KEY` to persist across restarts. The app never writes the key to disk. (Same behavior as the current Ollama key field.)

## Decisions

| Decision | Choice |
|---|---|
| Local vs Cloud | Two dropdown entries: `ollama` (Local) + `ollama-cloud` (Cloud) |
| Cloud endpoint | Auto-set `https://ollama.com` behind the scenes; field shown pre-filled + editable for advanced (proxy) use |
| API key | UI field (session) or `VOXNOTE_OLLAMA_API_KEY` in `.env` (persistent) |
| Model list | Dynamic (backend already lists + filters runnable cloud models) |

## Out of scope (YAGNI)
- New `OllamaCloudProvider` class (the existing provider already does it).
- Persisting the key to disk (rejected — `.env` is the persistence path).
- Hardcoded cloud model catalog (dynamic list is authoritative).

## Testing
- Backend: `get_provider("ollama-cloud")` returns an `OllamaProvider`; `PUT /api/config {llm_provider:"ollama-cloud"}` is allowed and round-trips; `available_providers` includes `ollama-cloud`.
- Frontend: build/`tsc` clean; browser — selecting "Ollama (Cloud)" auto-fills the URL to `https://ollama.com` and surfaces the API Key field; selecting "Ollama (Local)" sets `localhost:11434`.
- Cloud end-to-end (real key) is the user's to verify since it needs their Ollama Cloud key; the local↔cloud switching + endpoint auto-set + provider mapping are verified here.

## Self-review
- **Placeholders:** none — files, values, endpoint, env var all concrete.
- **Consistency:** `ollama-cloud` used identically across get_provider, allowed/available providers, and the frontend `isOllama` check. Endpoint `https://ollama.com` consistent (docs-confirmed).
- **Scope:** single cohesive UX feature over an already-capable backend; one plan.
