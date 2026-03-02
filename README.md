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

- **API**: http://127.0.0.1:8000
- **Web**: http://localhost:3001

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

**Requisito:** Configurar `VOXNOTE_HF_TOKEN` para diarización.

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

UI moderna en **http://localhost:3001**:

```bash
make dev
```

Funcionalidades:
- Grabar audio directamente desde el navegador
- Subir archivos existentes
- Seleccionar modelo Whisper y proveedor LLM
- Ver historial de notas generadas
- Configurar diarización de hablantes
- Preview de notas estilo Obsidian

---

## API

Backend FastAPI en **http://127.0.0.1:8000**

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
curl -X POST "http://127.0.0.1:8000/api/transcribe" \
  -F "file=@audio.mp3" \
  -F "model=turbo"

# Extraer insights
curl -X POST "http://127.0.0.1:8000/api/insights" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "...", "provider": "ollama"}'

# Exportar nota
curl -X POST "http://127.0.0.1:8000/api/export" \
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

### Kimi (Moonshot)

```bash
VOXNOTE_LLM_PROVIDER=kimi
KIMI_API_KEY=...
```

### GLM (Zhipu AI)

```bash
VOXNOTE_LLM_PROVIDER=glm
GLM_API_KEY=...
GLM_MODEL=glm-5  # glm-4, glm-4-plus, glm-4-air, glm-4.7, glm-5
```

### Google Gemini

```bash
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...
```

Ver [docs/multi-provider-setup.md](docs/multi-provider-setup.md) para más detalles.

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
│   │   │   └── providers/       # ollama, openai, kimi, glm, google
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
