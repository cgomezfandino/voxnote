# Voxnote

Pipeline local para grabar reuniones, transcribirlas, extraer insights y organizarlas en notas de Obsidian. 100% privado — nada sale de tu máquina.

**Audio → Whisper (transcripción) → Ollama (insights) → Obsidian (Markdown)**

## Requisitos

- Python ≥ 3.10
- [FFmpeg](https://ffmpeg.org/) — procesamiento de audio para Whisper
- [Ollama](https://ollama.com/) — LLM local para extracción de insights

### Instalar FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

### Instalar Ollama y descargar el modelo

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo (4.7 GB)
ollama pull llama3.1:8b
```

## Instalación

```bash
git clone https://github.com/cgomezfandino/Voxnote.git
cd Voxnote
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Uso

### Pipeline completo

Procesa un audio de principio a fin — transcribe, extrae insights y genera la nota:

```bash
voxnote process audio/mi_reunion.mp3
```

### Grabar desde el micrófono

```bash
# Grabación manual (Ctrl-C para parar)
voxnote record

# Duración fija (60 segundos)
voxnote record --duration 60

# Guardar en ruta específica
voxnote record -o audio/standup.wav
```

### Solo transcribir

```bash
voxnote transcribe audio/mi_reunion.mp3
voxnote transcribe audio/mi_reunion.mp3 --model large-v3
```

## Configuración

Todas las opciones se controlan con variables de entorno (prefijo `VOXNOTE_`):

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Modelo de Whisper |
| `VOXNOTE_LANGUAGE` | `es` | Idioma del audio (vacío = auto-detect) |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Modelo LLM para insights |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `VOXNOTE_OUTPUT_DIR` | `output` | Directorio de notas generadas |

### Modelos de Whisper

| Modelo | VRAM | Velocidad | Precisión |
|--------|------|-----------|-----------|
| `tiny` | ~1 GB | Muy rápido | Baja |
| `base` | ~1 GB | Rápido | Aceptable |
| `small` | ~2 GB | Medio | Buena |
| `medium` | ~5 GB | Lento | Muy buena |
| `turbo` | ~6 GB | Rápido | Muy buena |
| `large-v3` | ~10 GB | Muy lento | Excelente |

> Para reuniones en español usa al menos `medium`. Si tienes Apple Silicon, Whisper usa la GPU automáticamente.
> Para reuniones mixtas ES/EN, deja `VOXNOTE_LANGUAGE` vacío para auto-detección.

## Integración con Obsidian

Las notas se generan en formato Markdown con frontmatter YAML compatible con Obsidian. Plugins recomendados:

- **Tasks** — gestionar action items con checkboxes
- **Dataview** — queries sobre tus notas (filtrar por fecha, tags, etc.)
- **Templater** — templates con variables dinámicas
- **Calendar** — vista calendario de reuniones

Query de ejemplo para ver todos los action items pendientes:

````markdown
```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```
````

## Desarrollo

```bash
ruff check src/ tests/       # lint
ruff format src/ tests/      # format
pytest                       # tests
mypy src/                    # type check
```

## Licencia

MIT
