# HANDOFF — Estado de la sesión (2026-06-13)

> Documento de traspaso para retomar el trabajo en una sesión nueva. Léelo primero.

## TL;DR

Sesión muy productiva. Se entregó la **Fase 0** del roadmap (casi completa), una **auditoría de
seguridad** con fixes, la **salida enriquecida** con atribución por hablante, y se dejó la
**diarización funcionando de verdad** (probada end-to-end con modelos reales). Todo en el working
tree, commiteado en una rama (ver git log). **Siguiente paso recomendado: Fase 1 — renombrar hablantes.**

## ⚠️ Entorno (CRÍTICO para retomar)

- **El venv está en Python 3.11.14** (`/Users/cgomezfandino/repos/voxnote/.venv`). Se migró desde 3.14
  porque **whisperX/ctranslate2 no soportan Python 3.14**. El venv viejo quedó respaldado en
  `.venv.py314.bak`.
- **La diarización SOLO funciona en este venv 3.11.** Usa siempre `.venv/bin/python` o `source .venv/bin/activate`.
- El `Makefile` lanza `make dev` (API :8003, Web :3003). El `.claude/launch.json` tiene el `web` corregido a 3003.

## ✅ Qué se hizo (y está verificado)

**Tests verdes:** core 36/36, api 14/14. ruff limpio en lo tocado. web ESLint + tsc OK.

1. **Roadmap** priorizado en `.claude/plans/quisiera-que-revises-el-validated-pnueli.md` (6 fases).
2. **Seguridad** — auditoría en `docs/SECURITY-AUDIT.md` + fixes aplicados (Fase 0.5):
   - `run()` bind a `127.0.0.1` por defecto + `VOXNOTE_API_HOST`; validación de `PUT /api/config`;
     límite de subida (`VOXNOTE_MAX_UPLOAD_MB`); permisos `0o600`/`0o700`; errores genéricos;
     `/api/notes` exige `.md`; anti prompt-injection en `providers/base.py`.
3. **Export Word (.docx)** — `packages/core/voxnote/pipeline/docx_exporter.py` (markdown→docx) +
   endpoint `POST /api/export/docx` + menú de descarga en `NotePreview.tsx`. Funciona también con notas históricas.
4. **Render Markdown profesional** — `NotePreview.tsx` con `react-markdown` + `remark-gfm` (sin rehype-raw, XSS-safe).
5. **Estados de error UI** — sistema de Toast (`ToastProvider.tsx`, `useToast.ts`), color `--danger`,
   `ProcessingSteps` rojo≠verde, `alert()`→toast, botón Reintentar.
6. **Salida enriquecida** — nuevos campos `participantes`, `puntos_clave`, `comentarios_destacados`
   (atribución por hablante). Prompt centralizado en `providers/base.py` (`build_insights_prompt`).
   Schema API tolerante a fallos del LLM. Reflejado en exporter, docx, tipos e `InsightsDisplay`.
7. **Diarización operativa** — whisperX 3.8.6 + pyannote `community-1`. Se arregló la API
   (`whisperx.diarize.DiarizationPipeline`, `token=`), auto-detección de nº de hablantes (`min/max=None`),
   y `VOXNOTE_DIARIZE_MODEL` configurable (default `community-1`). Prueba real: 2 voces → 2 SPEAKERS detectados.
8. **Docs** — `README.md` (secciones Diarización + Privacidad/Legal), `NOTICES.md` (licencias),
   limpieza de refs `kimi`/`glm`.

## 🎙️ Diarización — cómo está montada

- Requiere: venv 3.11 + whisperX (`pip install -e "packages/core[whisperx]"`) + token HF **válido con
  permiso de repos gated** (token clásico tipo *Read*) + aceptar `pyannote/speaker-diarization-community-1` en HF.
- Token actual en `.env` ya es válido y con acceso. `community-1` aceptado.
- Demo reproducible: `/tmp/voxnote_diar_demo.py` sobre `/tmp/voxnote_diar_demo.wav` (audio de 2 voces).
- **Calidad:** buena con voces humanas reales + modelo `turbo`/`large`. Las voces TTS sintéticas del demo
  dan transcripción pobre (no es culpa del modelo).
- Es **opcional**: sin diarización igual hay resumen/insights/tareas.

## 👉 Siguiente paso recomendado: Fase 1 — renombrar hablantes

Mapear `SPEAKER_00 → "Carlos"` en la UI + persistir por nota (y reescribir la atribución de tareas).
Es frontend + un mapping almacenado, **cero ML**, y es el mayor salto de UX para lo multi-hablante.
Después: capa de datos local (SQLite) para búsqueda + persistencia. Ver el roadmap.

## 🧩 Pendiente / conocido

- **Fase 0.5 seguridad pendiente:** auth por token en endpoints (requisito antes de exponer/empaquetar),
  estrechar `torch.load` (`add_safe_globals` en vez del monkeypatch global), lockfile + `pip-audit`.
- **Bug dev-only:** cambiar de pestaña no actualiza el contenido en `next dev` (deadlock
  `AnimatePresence mode="wait"` + React StrictMode). Pre-existente, casi seguro solo de desarrollo —
  confirmar con un `next build` de producción.
- **Fase 5 (empaquetado desktop):** la pieza grande para que estudiantes no toquen nada (bundlear
  runtime + modelos; `community-1` es CC-BY → redistribuible). Es lo que elimina toda la fricción de HF/token.
- `whisper_model` default es `turbo`; verificar que `whisperx.load_model("turbo")` mapea bien (el demo usó `small`).

## Punteros

- Roadmap: `.claude/plans/quisiera-que-revises-el-validated-pnueli.md`
- Seguridad: `docs/SECURITY-AUDIT.md`
- Licencias: `NOTICES.md`
- Memoria: `~/.claude/projects/.../memory/` (ver `voxnote-session-state`, `voxnote-product-direction`).
