# Voxnote

Pipeline local para grabar reuniones, transcribirlas, extraer insights y organizarlas en notas de Obsidian. 100% privado — nada sale de tu máquina.

**Audio → Whisper → LLM → Obsidian**

## Tabla de contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Iniciar y detener servicios](#iniciar-y-detener-servicios)
- [Casos de uso](#casos-de-uso)
- [CLI](#cli)
- [Interfaz web](#interfaz-web)
- [Configuración](#configuración)
- [Proveedores LLM](#proveedores-llm)
- [Integración con Obsidian](#integración-con-obsidian)
- [Desarrollo](#desarrollo)

---

## Requisitos

- Python ≥ 3.10
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
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

---

## Iniciar y detener servicios

### Ollama (LLM local)

```bash
# Iniciar servidor
ollama serve

# Verificar que está corriendo
curl http://localhost:11434/api/tags

# Detener
pkill ollama
```

### Interfaz web (Streamlit)

```bash
# Iniciar UI en http://localhost:8501
voxnote-ui

# O directamente con streamlit
.venv/bin/python -m streamlit run src/voxnote/ui.py --server.port 8501 --server.headless true

# Detener
pkill -f "streamlit run"
```

### Verificar puertos activos

```bash
lsof -i :11434   # Ollama
lsof -i :8501    # Streamlit UI
```

---

## Casos de uso

### 1. Reunión de equipo (standup, sprint planning)

```bash
# Grabar la reunión
voxnote record --duration 900  # 15 minutos

# Procesar y generar nota
voxnote process recordings/20260212_193045.wav
```

**Resultado:** Nota en `output/` con resumen, decisiones y action items.

---

### 2. Entrevista o podcast

```bash
# Transcribir archivo existente con diarización (identificar hablantes)
voxnote process entrevista.mp3 --diarize
```

**Requisito:** Configurar `VOXNOTE_HF_TOKEN` para diarización.

---

### 3. Notas de clase o conferencia

```bash
# Usar modelo grande para mayor precisión
VOXNOTE_WHISPER_MODEL=large-v3 voxnote process conferencia.m4a
```

---

### 4. Procesar múltiples archivos

```bash
for file in recordings/*.wav; do
    voxnote process "$file"
done
```

---

### 5. Solo transcribir (sin insights)

```bash
voxnote transcribe audio.mp3 > transcript.txt
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

UI interactiva en **http://localhost:8501**:

```bash
voxnote-ui
```

Funcionalidades:
- Grabar audio directamente desde el navegador
- Subir archivos existentes
- Seleccionar modelo Whisper y proveedor LLM
- Ver historial de notas generadas
- Configurar diarización de hablantes

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
| `VOXNOTE_OLLAMA_TIMEOUT` | `120` | Timeout en segundos |
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

---

## Integración con Obsidian

Las notas incluyen YAML frontmatter compatible con Obsidian:

```yaml
---
tags: [meeting, reunion]
date: 2026-02-12
time: "19:30"
audio: "[[audio/20260212_193045.wav]]"
---
```

### Plugins recomendados

- **Tasks** — gestionar action items
- **Dataview** — queries sobre notas
- **Calendar** — vista calendario

### Query Dataview para action items pendientes

```dataview
TASK FROM "output" WHERE !completed
SORT date DESC
```

---

## Estructura del proyecto

```
Voxnote/
├── src/voxnote/
│   ├── cli.py              # Comandos CLI
│   ├── config.py           # Configuración
│   ├── ui.py               # Interfaz Streamlit
│   ├── pipeline/
│   │   ├── recorder.py     # Grabación de audio
│   │   ├── transcriber.py  # Transcripción Whisper
│   │   ├── insights.py     # Extracción de insights
│   │   └── exporter.py     # Exportar a Markdown
│   └── providers/          # Proveedores LLM
├── recordings/             # Archivos de audio
├── output/                 # Notas generadas
├── tests/                  # Tests
└── docs/                   # Documentación
```

---

## Desarrollo

```bash
make lint       # ruff check src/ tests/
make format     # ruff format src/ tests/
make typecheck  # mypy src/
make test       # pytest
make dev        # instalar con dependencias de desarrollo
```

---

## Licencia

MIT
