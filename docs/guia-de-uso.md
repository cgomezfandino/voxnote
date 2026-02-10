# Guía de Uso — Voxnote

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación](#2-instalación)
3. [Verificar que todo funciona](#3-verificar-que-todo-funciona)
4. [Grabar una reunión](#4-grabar-una-reunión)
5. [Procesar un audio existente](#5-procesar-un-audio-existente)
6. [Solo transcribir](#6-solo-transcribir)
7. [Configurar Obsidian](#7-configurar-obsidian)
8. [Configuración avanzada](#8-configuración-avanzada)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Requisitos previos

### FFmpeg

Whisper necesita FFmpeg para decodificar audio en cualquier formato.

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Verificar
ffmpeg -version
```

### Ollama

Ollama corre el LLM localmente para extraer insights de las transcripciones.

```bash
# macOS — descargar desde https://ollama.com o:
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Descargar el modelo (una sola vez, ~4.7 GB)
ollama pull llama3.1:8b

# Verificar que funciona
ollama run llama3.1:8b "Dime hola"
```

> Ollama debe estar corriendo antes de usar `voxnote process`. En macOS se inicia como servicio automáticamente al instalar. En Linux: `ollama serve &`

### Python ≥ 3.10

```bash
python3 --version  # debe ser 3.10+
```

---

## 2. Instalación

```bash
# Clonar el repo
git clone https://github.com/cgomezfandino/Voxnote.git
cd Voxnote

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar Voxnote en modo editable
pip install -e ".[dev]"

# Verificar
voxnote --help
```

La primera vez que uses Whisper, el modelo se descarga automáticamente (~6 GB para `turbo`). Esto solo pasa una vez.

---

## 3. Verificar que todo funciona

### Checklist rápido

```bash
# 1. FFmpeg instalado
ffmpeg -version

# 2. Ollama corriendo
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# 3. Voxnote instalado
voxnote --help

# 4. Micrófono accesible (graba 3 segundos de prueba)
voxnote record --duration 3
```

Si el paso 4 funciona, estás listo. El audio se guardó en `recordings/`.

---

## 4. Grabar una reunión

### Grabación manual (parar con Ctrl-C)

```bash
voxnote record
```

Esto guarda un `.wav` en `recordings/` con timestamp como nombre.

### Grabación con duración fija

```bash
# 30 minutos = 1800 segundos
voxnote record --duration 1800
```

### Guardar en ruta específica

```bash
voxnote record -o audio/standup_2025-01-15.wav
```

### Grabar y procesar en un solo paso

Primero graba, luego procesa el archivo generado:

```bash
voxnote record -o audio/reunion.wav
voxnote process audio/reunion.wav
```

---

## 5. Procesar un audio existente

El comando `process` ejecuta el pipeline completo:

```
Audio → Whisper (transcripción) → Ollama (insights) → Nota Markdown
```

```bash
# Usar modelo por defecto (turbo)
voxnote process audio/mi_reunion.mp3

# Usar modelo más preciso (requiere ~10 GB VRAM)
voxnote process audio/mi_reunion.mp3 --model large-v3

# Guardar nota en directorio específico
voxnote process audio/mi_reunion.mp3 --output-dir ~/MeetingNotes/meetings
```

### Qué genera

Un archivo Markdown en `output/` (o el directorio que especifiques) con:

- **Frontmatter YAML** — tags, fecha, hora, link al audio
- **Resumen ejecutivo** — 3-5 oraciones
- **Decisiones tomadas**
- **Action Items** — con checkboxes, responsable y deadline
- **Insights clave**
- **Preguntas abiertas**
- **Próximos pasos**
- **Transcripción completa** al final

Ejemplo de nombre: `2025-01-15_standup.md`

---

## 6. Solo transcribir

Si solo necesitas el texto sin análisis de insights:

```bash
voxnote transcribe audio/mi_reunion.mp3

# Con modelo específico
voxnote transcribe audio/mi_reunion.mp3 --model medium
```

La transcripción se imprime en la terminal. Puedes redirigirla a un archivo:

```bash
voxnote transcribe audio/mi_reunion.mp3 > transcripcion.txt
```

---

## 7. Configurar Obsidian

### Estructura de vault recomendada

Apunta `VOXNOTE_OUTPUT_DIR` al directorio `meetings/` dentro de tu vault:

```
MiVault/              ← Tu vault de Obsidian
├── meetings/         ← VOXNOTE_OUTPUT_DIR apunta aquí
├── audio/            ← Archivos de audio originales
└── templates/
```

```bash
export VOXNOTE_OUTPUT_DIR=~/MiVault/meetings
```

### Plugins recomendados

Instálalos desde **Settings → Community Plugins → Browse**:

| Plugin | Para qué |
|--------|----------|
| **Tasks** | Gestionar action items con checkboxes |
| **Dataview** | Queries sobre tus notas (filtrar por fecha, tags) |
| **Templater** | Templates con variables dinámicas |
| **Calendar** | Vista calendario de reuniones |

### Queries útiles con Dataview

**Todos los action items pendientes:**

````markdown
```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```
````

**Reuniones de esta semana:**

````markdown
```dataview
TABLE date, time
FROM "meetings"
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```
````

**Reuniones con preguntas abiertas:**

````markdown
```dataview
LIST
FROM "meetings" AND #meeting
WHERE contains(file.content, "Preguntas Abiertas")
SORT date DESC
```
````

---

## 8. Configuración avanzada

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto o expórtalas en tu shell:

```bash
# Modelo de Whisper (tiny|base|small|medium|turbo|large-v3)
export VOXNOTE_WHISPER_MODEL=turbo

# Idioma del audio (vacío = auto-detect, útil para reuniones mixtas ES/EN)
export VOXNOTE_LANGUAGE=es

# Modelo de Ollama para insights
export VOXNOTE_OLLAMA_MODEL=llama3.1:8b

# URL del servidor Ollama
export VOXNOTE_OLLAMA_URL=http://localhost:11434

# Directorio de salida para las notas
export VOXNOTE_OUTPUT_DIR=output

# Sample rate para grabación
export VOXNOTE_SAMPLE_RATE=16000
```

### Elegir modelo de Whisper

| Modelo | VRAM | Velocidad | Cuándo usarlo |
|--------|------|-----------|---------------|
| `tiny` | ~1 GB | Muy rápido | Pruebas rápidas, transcripción de baja calidad |
| `base` | ~1 GB | Rápido | Audio claro en inglés |
| `small` | ~2 GB | Medio | Buen balance para inglés |
| `medium` | ~5 GB | Lento | Reuniones en español — mínimo recomendado |
| `turbo` | ~6 GB | Rápido | **Recomendado** — velocidad de small, calidad de large |
| `large-v3` | ~10 GB | Muy lento | Máxima precisión, idiomas difíciles |

> En Apple Silicon (M1/M2/M3/M4), Whisper usa la GPU automáticamente.

### Reuniones bilingües (ES/EN)

Si tus reuniones mezclan español e inglés:

```bash
export VOXNOTE_LANGUAGE=
```

Dejar el idioma vacío activa la auto-detección de Whisper. Usa al menos `medium` o `turbo` para buenos resultados en code-switching.

### Usar un modelo de Ollama diferente

```bash
# Más potente (requiere 16+ GB RAM)
export VOXNOTE_OLLAMA_MODEL=llama3.1:70b

# Más ligero
export VOXNOTE_OLLAMA_MODEL=mistral:7b
export VOXNOTE_OLLAMA_MODEL=phi3:mini
```

Recuerda descargar el modelo primero: `ollama pull <modelo>`

---

## 9. Troubleshooting

### "No se encuentra ffmpeg"

Whisper requiere FFmpeg para decodificar audio. Instálalo con tu package manager (ver [Requisitos previos](#1-requisitos-previos)).

### "Connection refused" al extraer insights

Ollama no está corriendo. Inícialo:

```bash
# macOS — debería estar corriendo como servicio. Si no:
ollama serve

# Linux
ollama serve &
```

Verifica: `curl http://localhost:11434/api/tags`

### Transcripción de baja calidad

- Sube el modelo: `--model medium` o `--model large-v3`
- Asegúrate de especificar el idioma correcto en `VOXNOTE_LANGUAGE`
- El audio con mucho ruido de fondo reduce la calidad — usa un micrófono dedicado

### "No se puede acceder al micrófono"

En macOS, ve a **System Preferences → Privacy & Security → Microphone** y asegúrate de que tu terminal (Terminal.app, iTerm2, VS Code) tenga permiso.

### El modelo de Whisper tarda mucho en cargar la primera vez

Es normal. Whisper descarga el modelo (~6 GB para `turbo`) la primera vez. Se guarda en `~/.cache/whisper/` y las siguientes ejecuciones son rápidas.

### Ollama devuelve JSON inválido

A veces el LLM no genera JSON limpio. Si pasa frecuentemente:
- Usa un modelo más grande: `llama3.1:70b`
- Vuelve a ejecutar el comando — la temperatura baja (0.1) minimiza variabilidad pero no la elimina
