# Ollama Local + Cloud providers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Ollama (Cloud)" provider option that sets the endpoint (`https://ollama.com`) behind the scenes so the user only enters their API key; keep "Ollama (Local)" at `http://localhost:11434`.

**Architecture:** The backend already speaks Ollama Cloud (Bearer auth + cloud-model filtering). `ollama-cloud` maps to the same `OllamaProvider`; the frontend auto-sets the URL per variant. A `useConfig` fix lets a provider switch sync `llm_provider` + `ollama_url` together.

**Tech Stack:** FastAPI/Pydantic, Next.js/React, the existing Ollama provider + `/api/ollama/models` route.

---

## Task 1: Backend — map `ollama-cloud` to OllamaProvider

**Files:**
- Modify: `packages/core/voxnote/providers/__init__.py`
- Modify: `packages/api/voxnote_api/schemas.py` (`_ALLOWED_PROVIDERS`)
- Modify: `packages/api/voxnote_api/routes/config.py` (`AVAILABLE_PROVIDERS`)
- Test: `packages/core/tests/test_ollama_cloud_provider.py` (create), `packages/api/tests/test_config_ollama_cloud.py` (create)

- [ ] **Step 1: Write the failing core test** — `packages/core/tests/test_ollama_cloud_provider.py`

```python
"""'ollama-cloud' resolves to the standard OllamaProvider (URL+key from settings)."""

from voxnote.providers import OllamaProvider, get_provider


def test_ollama_cloud_maps_to_ollama_provider():
    assert isinstance(get_provider("ollama-cloud"), OllamaProvider)
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `.venv/bin/python -m pytest packages/core/tests/test_ollama_cloud_provider.py -v`
Expected: FAIL (`ValueError: Unknown provider 'ollama-cloud'`).

- [ ] **Step 3: Register the alias** — `packages/core/voxnote/providers/__init__.py`, in `get_provider`'s `providers` dict add:

```python
        "ollama-cloud": OllamaProvider,
```

(Same class — it already reads `settings.ollama_url` + `settings.ollama_api_key` and sends `Authorization: Bearer`. The frontend points the URL at `https://ollama.com`.)

- [ ] **Step 4: Run the core test to confirm it passes**

Run: `.venv/bin/python -m pytest packages/core/tests/test_ollama_cloud_provider.py -v` → PASS.

- [ ] **Step 5: Write the failing API test** — `packages/api/tests/test_config_ollama_cloud.py`

```python
from fastapi.testclient import TestClient


def test_ollama_cloud_provider_allowed(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"llm_provider": "ollama-cloud"})
    assert res.status_code == 200
    body = res.json()
    assert body["llm_provider"] == "ollama-cloud"
    assert "ollama-cloud" in body["available_providers"]
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `.venv/bin/python -m pytest packages/api/tests/test_config_ollama_cloud.py -v`
Expected: FAIL (422 — `_check_provider` rejects `ollama-cloud`).

- [ ] **Step 7: Allow the provider** — two edits:

`packages/api/voxnote_api/schemas.py`:
```python
_ALLOWED_PROVIDERS = {"ollama", "ollama-cloud", "openai", "google", "anthropic"}
```

`packages/api/voxnote_api/routes/config.py`:
```python
AVAILABLE_PROVIDERS = ["ollama", "ollama-cloud", "openai", "google", "anthropic"]
```

- [ ] **Step 8: Run both suites**

Run: `.venv/bin/python -m pytest packages/core/tests/test_ollama_cloud_provider.py packages/api/tests -q` → all green.
Run: `.venv/bin/ruff check packages/core/ packages/api/` → clean.

- [ ] **Step 9: Commit**

```bash
git add packages/core/voxnote/providers/__init__.py packages/api/voxnote_api/schemas.py \
        packages/api/voxnote_api/routes/config.py packages/core/tests/test_ollama_cloud_provider.py \
        packages/api/tests/test_config_ollama_cloud.py
git commit -m "feat(providers): allow ollama-cloud provider (maps to OllamaProvider)"
```

---

## Task 2: useConfig — accumulate multi-field updates

**Files:**
- Modify: `packages/web/src/hooks/useConfig.ts`

**Why:** `syncToBackend` currently sends only the *last* field changed within the debounce window (each call clears the prior timeout, replacing the payload). Switching provider must sync `llm_provider` **and** `ollama_url` together — so accumulate pending updates into one PUT.

- [ ] **Step 1: Accumulate pending updates** — replace the `debounceRef` + `syncToBackend` block in `packages/web/src/hooks/useConfig.ts`:

```typescript
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<Partial<AppConfig>>({});

  // Load config from backend on mount
  useEffect(() => {
    fetchConfig()
      .then((data) => {
        setConfig(data);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  // Debounced sync to backend — accumulates all fields changed within the window
  // into a single PUT (so e.g. a provider switch + its URL go together).
  const syncToBackend = useCallback((updates: Partial<AppConfig>) => {
    pendingRef.current = { ...pendingRef.current, ...updates };
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const payload = pendingRef.current;
      pendingRef.current = {};
      setIsSyncing(true);
      try {
        await apiUpdateConfig(payload);
      } catch {
        // Silently fail - config is local too
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, []);
```

(The existing `fetchConfig` mount effect stays — shown here only for placement; do not duplicate it.)

- [ ] **Step 2: Type-check (does not disturb the running dev server)**

Run: `npm --prefix packages/web exec -- tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useConfig.ts
git commit -m "fix(web): accumulate config updates so multi-field changes sync together"
```

---

## Task 3: ConfigPanel — Local/Cloud split + auto endpoint + dynamic models

**Files:**
- Modify: `packages/web/src/components/ConfigPanel.tsx`

- [ ] **Step 1: Provider list + default URLs + Ollama helper** — in `packages/web/src/components/ConfigPanel.tsx`:

Replace the first `ollama` entry's `label` and `models` (remove the hardcoded `gemma4:31b-cloud`), and add the cloud entry. Replace the `llmProviders` `ollama` object (lines 25-41) with:

```tsx
  {
    value: "ollama",
    label: "Ollama (Local)",
    needsUrl: true,
    models: [
      { value: "gemma4:12b", label: "Gemma 4 12B" },
      { value: "llama3.1:8b", label: "Llama 3.1 8B" },
      { value: "qwen3:8b", label: "Qwen 3 8B" },
      { value: "gemma3:12b", label: "Gemma 3 12B" },
      { value: "phi4:14b", label: "Phi-4 14B" },
      { value: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
      { value: "mistral-small3.2:24b", label: "Mistral Small 3.2 24B" },
      { value: "llama3.3:70b", label: "Llama 3.3 70B" },
    ],
    modelKey: "ollama_model" as const,
  },
  {
    value: "ollama-cloud",
    label: "Ollama (Cloud)",
    needsUrl: true,
    models: [],
    modelKey: "ollama_model" as const,
  },
```

Replace `defaultBaseUrls` (lines 82-84):

```tsx
const defaultBaseUrls: Record<string, string> = {
  ollama: "http://localhost:11434",
  "ollama-cloud": "https://ollama.com",
};

const isOllama = (p: string) => p === "ollama" || p === "ollama-cloud";
```

- [ ] **Step 2: Treat both variants as Ollama (model fetch, debounced + URL/key aware)** — replace the model-fetch `useEffect` (lines 101-114) with:

```tsx
  useEffect(() => {
    if (!isOllama(config.llm_provider)) return;
    setOllamaStatus("checking");
    // Debounce 700ms (> the 500ms config sync) so the backend has the latest
    // url/key before we ask it for models.
    const t = setTimeout(() => {
      listOllamaModels()
        .then((models) => {
          setDynamicOllamaModels(models);
          setOllamaStatus("online");
        })
        .catch(() => {
          setDynamicOllamaModels([]);
          setOllamaStatus("offline");
        });
    }, 700);
    return () => clearTimeout(t);
  }, [config.llm_provider, config.ollama_url, config.ollama_api_key]);
```

- [ ] **Step 3: Auto-correct + display use `isOllama`** — update the model auto-correct effect (lines 116-124) condition and the `modelsToDisplay` line (line 127):

Effect condition: `if (isOllama(config.llm_provider) && dynamicOllamaModels.length > 0) {`
Display: `if (isOllama(currentProvider?.value ?? "") && dynamicOllamaModels.length > 0) {`

- [ ] **Step 4: Provider change sets the endpoint behind the scenes** — replace the provider `<select>` onChange (lines 228-231):

```tsx
                  onChange={(e) => {
                    const p = e.target.value;
                    onUpdate("llm_provider", p);
                    setModelSearch("");
                    // Auto-set the endpoint per Ollama variant; the user never types a URL.
                    if (isOllama(p) && defaultBaseUrls[p]) {
                      onUpdate("ollama_url", defaultBaseUrls[p]);
                    }
                    // Cloud needs the API key — open the Connection panel so it's visible.
                    if (p === "ollama-cloud") setAdvancedOpen(true);
                  }}
```

- [ ] **Step 5: Status badge for both variants** — change the badge condition (line 275) from `config.llm_provider === "ollama"` to `isOllama(config.llm_provider)`, and in the `status` map change the three labels from "Ollama …" to use the variant: replace the three `label:` strings with values built from a `const cloud = config.llm_provider === "ollama-cloud";` declared just inside the IIFE, e.g. `label: cloud ? "Comprobando Ollama Cloud…" : "Comprobando Ollama…"`, `cloud ? "Ollama Cloud activo" : "Ollama activo"`, `cloud ? "Ollama Cloud no disponible" : "Ollama no disponible"`.

Concretely, replace the IIFE opening + status object (lines 275-280) with:

```tsx
              {isOllama(config.llm_provider) && (() => {
                const cloud = config.llm_provider === "ollama-cloud";
                const status = {
                  checking: { wrap: "bg-foreground/5 border-border", text: "text-muted-foreground", dot: "bg-muted-foreground animate-pulse", label: cloud ? "Comprobando Ollama Cloud…" : "Comprobando Ollama…" },
                  online: { wrap: "bg-accent/5 border-accent/15", text: "text-accent", dot: "bg-accent animate-pulse", label: cloud ? "Ollama Cloud activo" : "Ollama activo" },
                  offline: { wrap: "bg-[var(--danger-light)] border-[var(--danger-border)]", text: "text-[var(--danger)]", dot: "bg-[var(--danger)]", label: cloud ? "Ollama Cloud no disponible" : "Ollama no disponible" },
                }[ollamaStatus];
```

(The rest of the IIFE — the returned `<div>` — is unchanged.)

- [ ] **Step 6: Cloud-aware URL/key labels** — in the `currentProvider?.needsUrl` block (lines 326-356), make the API-key helper text and label reflect cloud. Replace the API Key `<label>` + helper `<p>` (lines 343-355) with:

```tsx
                    <label className="label text-[10px] mb-1">
                      {config.llm_provider === "ollama-cloud" ? "API Key (requerida)" : "API Key (opcional)"}
                    </label>
                    <input
                      type="password"
                      value={config.ollama_api_key || ""}
                      onChange={(e) => onUpdate("ollama_api_key", e.target.value)}
                      placeholder="Bearer token o API key"
                      className="input text-xs py-2"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {config.llm_provider === "ollama-cloud"
                        ? "Tu API key de Ollama Cloud (ollama.com/settings/keys). El endpoint se configura solo."
                        : "Necesario solo si la instancia de Ollama está protegida por proxy o es Cloud."}
                    </p>
```

- [ ] **Step 7: Build / type-check**

Run: `npm --prefix packages/web exec -- tsc --noEmit` → no errors.
(Do NOT run `next build` while the dev server is running — it shares `.next/`.)

- [ ] **Step 8: Verify in the browser (localhost)**

With API (:8003) + web (:3003) up: select **"Ollama (Cloud)"** → the URL field auto-fills `https://ollama.com`, the Connection panel opens, the API Key label says "required", and the badge reads "Ollama Cloud …". Select **"Ollama (Local)"** → URL becomes `http://localhost:11434`, badge "Ollama …". Confirm via `preview_network` that `PUT /api/config` carries `llm_provider` + `ollama_url` together (the useConfig fix). Screenshot for proof.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/components/ConfigPanel.tsx
git commit -m "feat(web): Ollama Local/Cloud split with auto endpoint + dynamic cloud models"
```

---

## Self-review

- **Spec coverage:** backend `ollama-cloud` mapping + allow (Task 1) ✓; multi-field sync fix enabling provider+URL together (Task 2) ✓; Local/Cloud entries, auto endpoint, `isOllama` everywhere, dynamic model list, cloud-aware key UX, removed hardcoded `-cloud` model (Task 3) ✓; endpoint `https://ollama.com` (docs-confirmed) ✓; key via UI/`.env` (no new storage) ✓.
- **Placeholder scan:** none — exact files/lines, full code blocks, exact commands.
- **Type consistency:** `ollama-cloud` value identical across get_provider, allowed/available providers, `llmProviders`, `defaultBaseUrls`, `isOllama`. `modelKey: "ollama_model"` reused for both variants (so the selected model lives in `ollama_model` for local and cloud). `isOllama` defined once, used in fetch effect, auto-correct, display, badge.
- **Known limitation:** the 700ms debounced model fetch assumes the 500ms config sync wins the race; fine for localhost. A self-contained fetch (url/key as params) is the later upgrade if needed.

## Execution handoff

Small feature over an already-capable backend — **inline execution** (executing-plans).
