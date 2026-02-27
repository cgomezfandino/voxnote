# Plan: Migrar Voxnote a Monorepo Next.js + FastAPI

## Context

Voxnote usa Streamlit como UI, lo cual limita el control del diseño y la experiencia de usuario. El objetivo es migrar a una arquitectura profesional: **Next.js** (frontend) + **FastAPI** (backend API) + **core Python** (pipeline), organizados en un monorepo simple con `packages/`.

Ya existe `voxnote-nextjs/` (Next 14.2, componentes funcionales, API real) que será la base del frontend. Se elimina Streamlit y el prototipo obsoleto (`nextjs-prototype/`).

## Target Structure

```
Voxnote/
├── packages/
│   ├── core/                    # Python pipeline (desde src/voxnote/)
│   │   ├── voxnote/
│   │   │   ├── cli.py, config.py
│   │   │   ├── pipeline/        # models, transcriber, insights, exporter
│   │   │   └── providers/       # ollama, openai, kimi, glm, google
│   │   ├── tests/               # Existing 7 test files
│   │   └── pyproject.toml
│   ├── api/                     # NEW: FastAPI backend
│   │   ├── voxnote_api/
│   │   │   ├── main.py          # FastAPI app factory + CORS + lifespan
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   └── routes/          # health, transcribe, insights, export, config, notes
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── web/                     # Next.js frontend (desde voxnote-nextjs/)
│       ├── src/app/             # App Router
│       ├── src/components/      # AudioRecorder, ConfigPanel, ProcessingSteps, etc.
│       ├── src/hooks/           # useVoxnote (updated)
│       ├── src/lib/api.ts       # NEW: centralized API client
│       ├── src/types/           # Updated TypeScript types
│       ├── package.json
│       └── next.config.js
├── Makefile                     # Root: install, dev, test, lint
├── .env.example
├── CLAUDE.md
└── README.md
```

---

## Phase 1: Directory Restructuring

1. Create `packages/core/`, `packages/api/`, `packages/web/`
2. Move `src/voxnote/` → `packages/core/voxnote/` (sin ui.py ni ui_styles*)
3. Move `tests/` → `packages/core/tests/`
4. Adaptar `pyproject.toml` → `packages/core/pyproject.toml` (quitar `where=["src"]`, eliminar extras `[ui]`, quitar entry point `voxnote-ui`)
5. Move `voxnote-nextjs/` → `packages/web/`
6. Eliminar: `nextjs-prototype/`, `src/`, `ui.py`, `ui_styles*.py`, `.streamlit/`
7. **Validar**: `cd packages/core && pip install -e ".[dev]" && pytest` (7 tests pass)

## Phase 2: FastAPI Backend (`packages/api/`)

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/transcribe` | Audio file upload → TranscriptionResponse |
| POST | `/api/insights` | Transcript text → InsightsResponse |
| POST | `/api/export` | Insights + transcript → Obsidian .md note |
| GET | `/api/config` | Current settings |
| PUT | `/api/config` | Update runtime settings |
| GET | `/api/notes` | List generated notes |
| GET | `/api/notes/{filename}` | Get note content |

### Key implementation details
- **`schemas.py`**: Pydantic models matching TypeScript types (`TranscriptionResponse`, `InsightsResponse`, `ActionItem`, `ExportResponse`, `ConfigResponse`, `NoteListItem`)
- **Transcribe route**: Accepts `multipart/form-data`, saves temp file, wraps `transcribe()` in `asyncio.to_thread()` (CPU-bound)
- **Insights route**: JSON in/out, also `asyncio.to_thread()`
- **Config route**: GET reads `Settings()` fresh, PUT mutates `os.environ` (same pattern as Streamlit)
- **Notes route**: Lists `output/*.md`, strips YAML frontmatter for preview, path traversal protection
- **Dependencies**: `fastapi`, `uvicorn[standard]`, `python-multipart`, `voxnote` (core)
- **Tests**: `httpx` + `TestClient`, mock core pipeline functions

### Files to create
- `packages/api/pyproject.toml`
- `packages/api/voxnote_api/__init__.py`
- `packages/api/voxnote_api/main.py`
- `packages/api/voxnote_api/schemas.py`
- `packages/api/voxnote_api/routes/__init__.py`
- `packages/api/voxnote_api/routes/{health,transcribe,insights,export,config,notes}.py`
- `packages/api/tests/conftest.py`
- `packages/api/tests/test_{health,transcribe,insights,config,notes}.py`

## Phase 3: Next.js Frontend Updates (`packages/web/`)

### 3.1 API Client (`src/lib/api.ts`)
Centralizar todas las llamadas API:
- `fetchConfig()`, `updateConfig()`, `transcribeAudio()`, `extractInsights()`, `exportNote()`, `listNotes()`, `getNote()`

### 3.2 TypeScript types update (`src/types/index.ts`)
- Fix `action_items: string[]` → `ActionItem[]` (con `tarea`, `responsable`, `deadline`)
- Add: `NoteListItem`, `NoteDetail`, `AppConfig`, `ExportResult`

### 3.3 Update `useVoxnote.ts` hook
- Add step 3: export (actualmente solo tiene transcribe + insights)
- Use centralized API client
- Better per-step error handling

### 3.4 Port ProcessingSteps from prototype
- Copy animated component from `nextjs-prototype/src/components/ProcessingSteps.tsx`
- Adapt colors from dark → light theme

### 3.5 Wire Process tab
- Add file upload zone (drag-and-drop, accepts WAV/MP3/M4A/OGG/FLAC)
- Full pipeline: upload → transcribe → insights → export
- Show InsightsDisplay component with results
- Note preview after export

### 3.6 Build History tab with real data
- Fetch `GET /api/notes` on tab activation
- Real stats: total notes, today, this week
- Click note → fetch content → render markdown

### 3.7 ConfigPanel sync with backend
- On mount: `GET /api/config` → populate initial values
- On change: `PUT /api/config` → persist to backend

### 3.8 New components
- `InsightsDisplay.tsx`: Renders insights in cards (resumen, decisiones, tareas, insights, preguntas, pasos)
- `FileUpload.tsx`: Drag-and-drop audio file upload zone
- `NotePreview.tsx`: Renders markdown note (strips YAML frontmatter)

## Phase 4: Root Makefile & Dev Workflow

```makefile
install:       # pip install -e packages/core[dev] && pip install -e packages/api[dev] && cd packages/web && npm install
dev-api:       # uvicorn voxnote_api.main:app --reload --port 8000
dev-web:       # cd packages/web && npm run dev
dev:           # Run both servers concurrently (trap 'kill 0' EXIT)
test:          # packages/core pytest + packages/api pytest
lint:          # ruff check + npm run lint
format:        # ruff format
typecheck:     # mypy
```

Update `.env.example`, `CLAUDE.md`, `README.md` with new monorepo instructions.

## Phase 5: Cleanup & Validation

1. Delete `nextjs-prototype/` completely
2. Delete Streamlit files from `packages/core/voxnote/` (ui.py, ui_styles*.py)
3. Update `.gitignore` (add node_modules, .next, packages/api/uploads/)
4. Run full test suite: `make test` (core 7 tests + API tests)
5. Run lint: `make lint`
6. Manual smoke test: `make dev` → open browser → record/upload → process → check history

## Execution Order

| Step | Phase | Validation |
|------|-------|------------|
| 1 | Move Python core to packages/core/ | `pytest` passes |
| 2 | Update packages/core/pyproject.toml | `pip install -e .` works |
| 3 | Move Next.js to packages/web/ | `npm run dev` works |
| 4 | Clean old files (Streamlit, prototype) | git status clean |
| 5 | Create FastAPI backend (packages/api/) | `curl /api/health` OK |
| 6 | Write API tests | `pytest` passes |
| 7 | Update Next.js types + API client | TypeScript compiles |
| 8 | Wire Process tab + History tab | Visual verification |
| 9 | ConfigPanel backend sync | Settings persist |
| 10 | Root Makefile + docs | `make dev` starts both |
| 11 | Final cleanup + commit | All tests pass |
