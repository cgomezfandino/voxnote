# Guía de Uso — Voxnote

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación](#2-instalación)
3. [Iniciar servicios](#3-iniciar-servicios)
4. [Grabar una reunión](#4-grabar-una-reunión)
5. [Procesar un audio existente](#5-procesar-un-audio-existente)
6. [Solo transcribir](#6-solo-transcribir)
7. [Interfaz web](#7-interfaz-web)
8. [Configurar Obsidian](#8-configurar-obsidian)
9. [Configuración avanzada](#9-configuración-avanzada)
10. [Troubleshooting](#10-troubleshooting)

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

### Python ≥ 3.10 y Node.js ≥ 18

```bash
python3 --version  # debe ser 3.10+
node --version     # debe ser 18+
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

# Instalar todos los paquetes (core + api + web)
make install

# Verificar CLI
voxnote --help
```

La primera vez que uses Whisper, el modelo se descarga automáticamente (~6 GB para `turbo`). Esto solo pasa una vez.

---

## 3. Iniciar servicios

### Desarrollo completo (API + Web)

```bash
source .venv/bin/activate
make dev
```

Esto inicia:
- **API** en http://127.0.0.1:8000
- **Web** en http://localhost:3001

### Solo API

```bash
make dev-api
```

### Solo Web

```bash
make dev-web
```

### Verificar que todo funciona

```bash
# 1. FFmpeg instalado
ffmpeg -version

# 2. Ollama corriendo
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# 3. API activa
curl http://127.0.0.1:8000/api/health

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
voxnote record -o audio/standup_2026-03-02.wav
```

### Grabar y procesar en un solo paso

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

Ejemplo de nombre: `2026-03-02_standup.md`

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

## 7. Interfaz web

UI moderna disponible en **http://localhost:3001**:

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

## 8. Configurar Obsidian

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

---

## 9. Configuración avanzada

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto o expórtalas en tu shell:

```bash
# Modelo de Whisper (tiny|base|small|medium|turbo|large-v3)
export VOXNOTE_WHISPER_MODEL=turbo

# Idioma del audio (vacío = auto-detect)
export VOXNOTE_LANGUAGE=es

# Proveedor LLM (ollama|openai|google)
export VOXNOTE_LLM_PROVIDER=ollama

# Modelo de Ollama para insights
export VOXNOTE_OLLAMA_MODEL=llama3.1:8b

# URL del servidor Ollama
export VOXNOTE_OLLAMA_URL=http://localhost:11434

# Directorio de salida para las notas
export VOXNOTE_OUTPUT_DIR=output

# Diarización (identificar hablantes)
export VOXNOTE_DIARIZE=false
export VOXNOTE_HF_TOKEN=your_huggingface_token
```

### Elegir modelo de Whisper

| Modelo | VRAM | Velocidad | Cuándo usarlo |
|--------|------|-----------|---------------|
| `tiny` | ~1 GB | Muy rápido | Pruebas rápidas |
| `base` | ~1 GB | Rápido | Audio claro en inglés |
| `small` | ~2 GB | Medio | Buen balance |
| `medium` | ~5 GB | Lento | Reuniones en español — mínimo recomendado |
| `turbo` | ~6 GB | Rápido | **Recomendado** — velocidad de small, calidad de large |
| `large-v3` | ~10 GB | Muy lento | Máxima precisión |

> En Apple Silicon (M1/M2/M3/M4), Whisper usa la GPU automáticamente.

### Reuniones bilingües (ES/EN)

Si tus reuniones mezclan español e inglés:

```bash
export VOXNOTE_LANGUAGE=
```

Dejar el idioma vacío activa la auto-detección de Whisper. Usa al menos `medium` o `turbo` para buenos resultados.

### Cambiar proveedor LLM

```bash
# OpenAI
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Google Gemini
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...
```

Ver [multi-provider-setup.md](multi-provider-setup.md) para más detalles.

---

## 10. Troubleshooting

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

### API no responde

Verifica que el servidor esté corriendo:

```bash
curl http://127.0.0.1:8000/api/health
```

Si no responde, inicia el servidor:

```bash
source .venv/bin/activate
make dev-api
```

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
- Vuelve a ejecutar el comando — la temperatura baja (0.1) minimiza variabilidad
