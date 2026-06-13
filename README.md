# Voxnote

Pipeline local para grabar reuniones, transcribirlas, extraer insights y organizarlas en notas de Obsidian. 100% privado — nada sale de tu máquina.

**Audio → Whisper → LLM → Obsidian**

## Tabla de contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Iniciar servicios](#iniciar-servicios)
- [Uso](#uso)
- [CLI](#cli)
- [Interfaz web](#interfaz-web)
- [API](#api)
- [Configuración](#configuración)
- [Proveedores LLM](#proveedores-llm)
- [Diarización (¿quién dijo qué?)](#diarización-quién-dijo-qué)
- [Privacidad y aspectos legales](#privacidad-y-aspectos-legales)
- [Integración con Obsidian](#integración-con-obsidian)
- [Arquitectura](#arquitectura)
- [Desarrollo](#desarrollo)

---

## Requisitos

- Python ≥ 3.10
- Node.js ≥ 18
- [FFmpeg](https://ffmpeg.org/) — procesamiento de audio
- [Ollama](https://ollama.com/) — LLM local (opcional si usas otros proveedores)

### Instalar FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

### Instalar Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo (4.7 GB)
ollama pull llama3.1:8b
```

---

## Instalación

```bash
git clone https://github.com/cgomezfandino/Voxnote.git
cd Voxnote

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar todos los paquetes
make install
```

---

## Iniciar servicios

### Desarrollo (API + Web)

```bash
source .venv/bin/activate
make dev
```

- **API**: http://127.0.0.1:8003
- **Web**: http://localhost:3003

### Solo API

```bash
make dev-api
```

### Solo Web

```bash
make dev-web
```

### Ollama (LLM local)

```bash
# Iniciar servidor
ollama serve

# Verificar que está corriendo
curl http://localhost:11434/api/tags
```

---

## Uso

### 1. Reunión de equipo (standup, sprint planning)

```bash
# Grabar la reunión
voxnote record --duration 900  # 15 minutos

# Procesar y generar nota
voxnote process recordings/20260212_193045.wav
```

### 2. Entrevista o podcast (con diarización)

```bash
# Transcribir con identificación de hablantes
voxnote process entrevista.mp3 --diarize
```

**Requisito:** instala whisperX y configura tu token — ver [Diarización](#diarización-quién-dijo-qué).

### 3. Solo transcribir

```bash
voxnote transcribe audio.mp3 > transcript.txt
```

### 4. Procesar múltiples archivos

```bash
for file in recordings/*.wav; do
    voxnote process "$file"
done
```

---

## CLI

### Pipeline completo

```bash
voxnote process <audio> [opciones]

opciones:
  -m, --model      Modelo Whisper (default: turbo)
  --diarize        Identificar hablantes
  --output-dir     Directorio de salida
```

### Grabar desde micrófono

```bash
voxnote record [opciones]

opciones:
  -o, --output     Ruta del archivo .wav
  -d, --duration   Duración en segundos (omitir para manual)
```

### Solo transcribir

```bash
voxnote transcribe <audio> [opciones]

opciones:
  -m, --model      Modelo Whisper
  --diarize        Identificar hablantes
```

---

## Interfaz web

UI moderna en **http://localhost:3003**:

```bash
make dev
```

Funcionalidades:
- Grabar audio directamente desde el navegador
- Subir archivos existentes
- Seleccionar modelo Whisper y proveedor LLM
- Ver historial de notas generadas
- Configurar diarización de hablantes
- Preview de notas con render Markdown
- Descargar notas en **Word (.docx)** o Markdown

---

## API

Backend FastAPI en **http://127.0.0.1:8003**

### Endpoints

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/transcribe` | Audio upload → transcripción |
| POST | `/api/insights` | Transcript → insights estructurados |
| POST | `/api/export` | Insights → nota Obsidian .md |
| GET | `/api/config` | Configuración actual |
| PUT | `/api/config` | Actualizar configuración |
| GET | `/api/notes` | Listar notas generadas |
| GET | `/api/notes/{filename}` | Obtener contenido de nota |

### Ejemplo

```bash
# Transcribir audio
curl -X POST "http://127.0.0.1:8003/api/transcribe" \
  -F "file=@audio.mp3" \
  -F "model=turbo"

# Extraer insights
curl -X POST "http://127.0.0.1:8003/api/insights" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "...", "provider": "ollama"}'

# Exportar nota
curl -X POST "http://127.0.0.1:8003/api/export" \
  -H "Content-Type: application/json" \
  -d '{"insights": {...}, "title": "Standup 2026-03-02"}'
```

---

## Configuración

Variables de entorno (prefijo `VOXNOTE_`):

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Modelo Whisper |
| `VOXNOTE_LANGUAGE` | `es` | Idioma (vacío = auto-detect) |
| `VOXNOTE_LLM_PROVIDER` | `ollama` | Proveedor LLM |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Modelo Ollama |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | URL Ollama |
| `VOXNOTE_OUTPUT_DIR` | `output` | Directorio de notas |
| `VOXNOTE_DIARIZE` | `false` | Habilitar diarización |
| `VOXNOTE_HF_TOKEN` | | Token HuggingFace para diarización |
| `VOXNOTE_DIARIZE_MIN_SPEAKERS` | (auto) | Mínimo de hablantes (vacío = auto-detección) |
| `VOXNOTE_DIARIZE_MAX_SPEAKERS` | (auto) | Máximo de hablantes (vacío = auto-detección) |
| `VOXNOTE_API_HOST` | `127.0.0.1` | Host del API. **No** hay autenticación aún: usa `0.0.0.0` solo en redes de confianza |
| `VOXNOTE_MAX_UPLOAD_MB` | `500` | Tamaño máximo de subida de audio (API) |

### Archivo .env

```bash
cp .env.example .env
# Editar .env con tus valores
```

### Modelos Whisper

| Modelo | VRAM | Velocidad | Uso recomendado |
|--------|------|-----------|-----------------|
| `tiny` | ~1 GB | Muy rápido | Testing |
| `base` | ~1 GB | Rápido | Inglés simple |
| `small` | ~2 GB | Medio | Uso general |
| `turbo` | ~6 GB | Rápido | **Recomendado** |
| `large-v3` | ~10 GB | Lento | Máxima precisión |

---

## Proveedores LLM

### Ollama (local, gratuito)

```bash
VOXNOTE_LLM_PROVIDER=ollama
```

### OpenAI

```bash
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Google Gemini

```bash
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...
```

Ver [docs/multi-provider-setup.md](docs/multi-provider-setup.md) para más detalles.

---

## Diarización (¿quién dijo qué?)

La diarización identifica a los distintos hablantes de un audio (`[SPEAKER_00]`, `[SPEAKER_01]`…). Con ella, la nota incluye una sección **Participantes** y atribuye decisiones, tareas y comentarios a cada persona.

> **Es opcional.** Sin diarización igual obtienes resumen, puntos clave, insights y tareas — solo pierdes el "quién dijo qué".

### Activarla (3 pasos)

**1. Instala el extra whisperX** (no viene en la instalación base):

```bash
.venv/bin/pip install -e "packages/core[whisperx]"
```

**2. Acepta el modelo de pyannote en HuggingFace** (es "gated"; con tu cuenta, una sola vez):

- https://huggingface.co/pyannote/speaker-diarization-community-1 → *Agree and access repository*

(`community-1` es el que usa whisperX 3.8 por defecto e incluye todos sus componentes —
segmentación, embedding y PLDA— en un solo repo.)

**3. Configura tu token** en `.env` — un token **válido** de https://huggingface.co/settings/tokens (tipo *Read*, o *fine-grained* con permiso "Read access to public gated repos"). Empieza por `hf_` y tiene ~37 caracteres:

```bash
VOXNOTE_HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Si la diarización da `401 GatedRepoError`, casi siempre es el token (inválido, caducado, de otra cuenta, o sin permiso de repos gated). Verifícalo: `curl -H "Authorization: Bearer $TOKEN" https://huggingface.co/api/whoami-v2`.

> El modelo de diarización es configurable con `VOXNOTE_DIARIZE_MODEL` (default `pyannote/speaker-diarization-community-1`, licencia CC-BY).

### Usarla

```bash
voxnote process reunion.mp3 --diarize
```

O en la web, activa el toggle **Diarización**. El número de hablantes se **detecta automáticamente** (funciona igual con 2 o con 6 personas). Si lo conoces, acótalo con `VOXNOTE_DIARIZE_MIN_SPEAKERS` / `VOXNOTE_DIARIZE_MAX_SPEAKERS`.

### Límites

- Funciona bien con **2-4 personas en audio limpio**; voces solapadas, ruido o 6+ personas degradan la precisión (límite de todos los modelos abiertos).
- En Mac corre en **CPU** (MPS no está soportado por este stack), así que en audios largos tarda.

> **Para distribuir:** los usuarios de la app de escritorio empaquetada **no harán nada de esto** — whisperX y el modelo irán dentro del instalador.

---

## Privacidad y aspectos legales

### Local-first

Por defecto, **el audio, las transcripciones y las notas nunca salen de tu máquina**. No hay servidor central ni telemetría. Tú controlas tus datos (puedes apuntar `VOXNOTE_OUTPUT_DIR` a una carpeta que sincronices tú si quieres respaldo).

### Grabación y consentimiento

La voz es un **dato personal**. Grabar conversaciones puede requerir **avisar o consentir** según el país/estado (leyes de uno o de todos los participantes). Asegúrate de tener permiso para grabar.

### Datos biométricos

- La **diarización** ("hablante 1 vs 2") es de bajo riesgo.
- La **identificación de voz** entre reuniones (huella de voz — funcionalidad futura) sería **dato biométrico de categoría especial** (GDPR Art. 9, BIPA en Illinois, etc.) y requeriría **consentimiento explícito** y almacenamiento local.

### Licencias

El stack es permisivo (Whisper, faster-whisper, pyannote.audio = MIT; whisperX = BSD). Ver [`NOTICES.md`](NOTICES.md) para atribuciones. Los modelos MIT pueden empaquetarse en una app de escritorio incluyendo su aviso de licencia.

> ⚠️ Esto es orientación general, **no asesoría legal**. Para uso comercial, usuarios en la UE o funcionalidades biométricas, consulta a un profesional.

---

## Integración con Obsidian

Las notas incluyen YAML frontmatter compatible con Obsidian:

```yaml
---
tags: [meeting, reunion]
date: 2026-03-02
time: "10:30"
audio: "[[audio/20260302_103000.wav]]"
---
```

### Estructura de vault recomendada

```
MiVault/
├── meetings/     ← VOXNOTE_OUTPUT_DIR apunta aquí
├── audio/        ← Archivos de audio originales
└── templates/
```

```bash
export VOXNOTE_OUTPUT_DIR=~/MiVault/meetings
```

### Plugins recomendados

- **Tasks** — gestionar action items
- **Dataview** — queries sobre notas
- **Calendar** — vista calendario

### Query Dataview para action items pendientes

```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```

---

## Arquitectura

### Monorepo Structure

```
Voxnote/
├── packages/
│   ├── core/                    # Python pipeline
│   │   ├── voxnote/
│   │   │   ├── cli.py           # Click CLI
│   │   │   ├── config.py        # Pydantic Settings
│   │   │   └── pipeline/        # models, transcriber, insights, exporter
│   │   │   └── providers/       # ollama, openai, google
│   │   ├── tests/
│   │   └── pyproject.toml
│   ├── api/                     # FastAPI backend
│   │   ├── voxnote_api/
│   │   │   ├── main.py          # App factory + CORS + lifespan
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   └── routes/          # health, transcribe, insights, export, config, notes
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── web/                     # Next.js 14 frontend
│       ├── src/app/             # App Router
│       ├── src/components/      # AudioRecorder, ConfigPanel, etc.
│       ├── src/hooks/           # useVoxnote, useConfig
│       ├── src/lib/api.ts       # Centralized API client
│       └── package.json
├── docs/                        # Documentación
├── recordings/                  # Archivos de audio
├── output/                      # Notas generadas
├── Makefile
└── CLAUDE.md
```

### Pipeline Flow

**record → transcribe → extract_insights → export_obsidian**

---

## Desarrollo

```bash
# Instalar dependencias
make install

# Ejecutar tests
make test        # todos
make test-core   # solo core
make test-api    # solo api

# Lint y formato
make lint        # ruff check + eslint
make format      # ruff format
make typecheck   # mypy packages/core/
```

---

## Licencia

MIT
