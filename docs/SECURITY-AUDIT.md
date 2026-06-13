# Auditoría de seguridad de Voxnote

> Fecha: 2026-06-13 · Método: auditoría multi-agente (49 agentes; 6 dimensiones en paralelo →
> verificación adversarial de cada hallazgo → síntesis). 42 hallazgos crudos → 34 confirmados →
> consolidados aquí a ~13 problemas distintos (los 34 tenían fuerte solapamiento: la misma causa raíz
> contada en varias dimensiones).

## Modelo de amenazas

Voxnote es local-first, pero "local" no significa "sin atacante":

- El entry point `run()` hace bind a `0.0.0.0` **sin autenticación** → exponible a la LAN/WiFi. (En `make dev`
  se lanza vía `uvicorn … --port 8003` **sin `--host`**, así que en desarrollo escucha en `127.0.0.1`.)
- Procesa contenido sensible: audio, transcripciones y notas en ficheros planos en disco.
- Entradas influenciables por un atacante: nombre y contenido de los audios subidos, el texto hablado que se
  inyecta en el prompt del LLM, y los checkpoints de modelos descargados de HuggingFace.
- Roadmap futuro: Google OAuth + backup al Drive del usuario, y empaquetado desktop (Tauri/Electron).
- Usuarios no técnicos.

## Correcciones verificadas (sobre el informe crudo de los agentes)

Tras revisar el código directamente, se corrigen sobre-afirmaciones de los agentes:

- **El binding `0.0.0.0` es condicional.** Solo aplica a `run()` (`packages/api/voxnote_api/main.py`). `make dev`
  usa el CLI de uvicorn sin `--host` → `127.0.0.1`. Riesgo = **latente, detona al empaquetar / correr `voxnote-api`**.
- **CORS NO es `*`.** Está restringido a `localhost:3000/3001/3003` (`main.py`). El item del informe que pedía
  cambiar `allow_origins=["*"]` partía de una premisa falsa.
- **Los "SSRF" que redirigen tráfico a un servidor atacante NO son explotables.** `ollama_url`/`OPENAI_BASE_URL`
  **no** son campos de `ConfigUpdateRequest`, así que no se pueden cambiar por `PUT /api/config`.
- **No hay secretos commiteados** en git (`.env` está ignorado).

## Hallazgos consolidados

Severidad bajo el modelo de amenazas. `current` = existe hoy; `future` = riesgo de las fases del roadmap.

### Críticos (latentes — explotables al "poner productivo"/empaquetar)

| ID | Problema | Ubicación | Estado |
|----|----------|-----------|--------|
| C1 | `run()` bind `0.0.0.0` **sin auth** → cualquiera en la LAN lee/exfiltra notas, sube audio, cambia config | `packages/api/voxnote_api/main.py:62` | ✅ binding por defecto a `127.0.0.1`; **auth pendiente** |
| C2 | `torch.load(weights_only=False)` global + descarga de checkpoints pyannote desde HF **sin verificar integridad** → RCE por deserialización (cache/MITM envenenado) | `packages/core/voxnote/pipeline/transcriber.py:~102,~165` | ⏳ pendiente (requiere probar diarización) |

### Altos (reales hoy, no dependen del binding)

| ID | Problema | Ubicación | Estado |
|----|----------|-----------|--------|
| H1 | Prompt injection: el transcript se inyecta literal en el prompt de los 3 providers → insights/tareas manipulados que van al `.docx`/`.md` | `providers/{base,ollama,openai,google}.py` | ✅ transcript envuelto en `<transcripcion>` + aviso |
| H2 | Permisos de archivo por umask por defecto → otros usuarios locales leen audios/notas en equipos compartidos | `routes/transcribe.py`, `pipeline/exporter.py` | ✅ `0o600` ficheros / `0o700` dir `audio/` |
| H3 | Secretos en tracebacks: `reload=True` + `detail=f"…{e}"` filtran el `repr` del cliente OpenAI (con `api_key`) | `routes/{insights,transcribe,export}.py` | ✅ mensajes genéricos + `reload` off por defecto |
| H4 | Sin límite de subida en `/api/transcribe` → disco lleno/DoS | `routes/transcribe.py` | ✅ tope `VOXNOTE_MAX_UPLOAD_MB` (500) → `413` |
| H5 | `PUT /api/config` sin validación: acepta valores arbitrarios, muta `os.environ`/`settings` | `routes/config.py:38-68` | ✅ validadores Pydantic (whitelists) |
| H6 | Dependencias: sin lockfile + pinning laxo (`torch>=2.0`, `openai-whisper>=…`) → builds no reproducibles, superficie supply-chain | `packages/*/pyproject.toml` | ⏳ pendiente (depende del entorno) |

### Medios / bajos

| ID | Problema | Ubicación | Estado |
|----|----------|-----------|--------|
| M1 | `GET /api/config` filtra config operativa (provider, `ollama_url`, modelos) a clientes no autenticados (recon) | `routes/config.py:16-35` | ⏳ pendiente (se resuelve con auth) |
| M2 | `/api/notes/{filename}` no exigía `.md`; orden de checks con ventana TOCTOU teórica | `routes/notes.py:72-93` | ✅ exige `.md`, rechaza traversal, valida path antes de FS |
| M3 | Output del LLM sin sanear fluye al `.md` y al futuro `.docx` (XSS hoy mitigado por React) | `pipeline/exporter.py` | ⏳ pendiente (atar al export `.docx` de Fase 0) |

### Futuro (diseñar bien en Fase 3 y 5)

- **Fase 5 (desktop):** empaquetar con `127.0.0.1` (¡no `0.0.0.0`!), IPC o token en memoria entre UI y backend,
  **auto-update firmado**.
- **Fase 3 (OAuth/Drive):** tokens en el **keyring del SO** (no `.env`/plano), validar `redirect_uri`, rotación de
  refresh token. `drive.file` es correcto para backups que el usuario ve y controla; `drive.appDataFolder` si se
  quiere que sean invisibles/app-only. Cifrado en reposo + resolución de conflictos de sync.

## Causas raíz sistémicas

1. **Sin capa de autenticación/autorización** — toda la seguridad depende de que el binding sea localhost.
2. **Entrada no confiable sin frontera** — transcript→LLM, filename→FS, config→env, sin validar/escapar.
3. **Deserialización y descargas sin verificación de integridad** (`torch.load` + modelos HF).
4. **Higiene de despliegue** — `reload=True`, sin lockfiles, `0.0.0.0` por defecto en el entry point.

## Áreas no cubiertas por la auditoría (follow-up)

- Logging/auditoría de operaciones sensibles (cambios de config, descargas de modelos).
- Integridad del canal de auto-update (desktop).
- Almacenamiento seguro de tokens OAuth + cifrado del backup en Drive + resolución de conflictos.
- Rate limiting / timeouts de inferencia / memoria de diarización.
- Verificación de checksum de los checkpoints de Whisper/pyannote.

## Lo que está bien (verificado)

CORS restringido a localhost · en `make dev` escucha en localhost · sin secretos en git · `/api/notes` con
check de path-traversal (`is_relative_to`) · secretos enmascarados (`***`) en `GET /api/config`.

## Estado de remediación

**Implementado (2026-06-13):** C1 (binding), H1 (anti prompt-injection), H2 (permisos), H3 (errores
genéricos), H4 (tope de subida), H5 (validación de config), M2 (`.md` + orden de checks). Verificado:
`pytest` core 26/26 y api 10/10 (con `output_dir` escribible).

**Pendiente (Fase 0.5 dedicada):** **auth por token** (requisito antes de exponer/empaquetar), C2
(estrechar `torch.load` + fijar/verificar checkpoint), H6 (lockfile/pinning + `pip-audit`), M1, M3,
`SECURITY.md`, y aislar los tests de API del `output_dir` real.
