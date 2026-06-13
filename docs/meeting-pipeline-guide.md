# Meeting Notes Pipeline

**Whisper → LLM → Obsidian**

Pipeline local para grabar reuniones, transcribirlas, extraer action items e insights, y organizar todo en Obsidian — 100% local, 100% privado.

---

## Arquitectura

```
Audio → Whisper (transcripción) → LLM (insights) → Obsidian (Markdown)
```

---

## Requisitos del Sistema

- **RAM mínima**: 8 GB (16 GB recomendado)
- **Disco**: ~10 GB para modelos
- **SO**: macOS, Linux, o Windows (con WSL2)
- **Python** 3.10+ y **Node.js** 18+
- **FFmpeg** instalado
- **GPU** opcional pero recomendada (NVIDIA CUDA o Apple Silicon)

---

## Instalación Paso a Paso

### Paso 1: Instalar FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (WSL2)
sudo apt update && sudo apt install ffmpeg
```

### Paso 2: Instalar Ollama (LLM local)

Descarga desde: [ollama.com](https://ollama.com)

```bash
# macOS / Windows — descarga el instalador desde ollama.com

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Descarga el modelo Llama 3.1 8B (~4.7 GB):

```bash
ollama pull llama3.1:8b
```

Verifica que funciona:

```bash
ollama run llama3.1:8b "Dime hola en español"
```

### Paso 3: Instalar Voxnote

```bash
git clone https://github.com/cgomezfandino/Voxnote.git
cd Voxnote

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar todos los paquetes
make install
```

### Paso 4: Verificar instalación

```bash
# Verificar CLI
voxnote --help

# Verificar Ollama
curl http://localhost:11434/api/tags
```

---

## Modelos Whisper disponibles

| Modelo | VRAM | Velocidad | Precisión |
|--------|------|-----------|-----------|
| tiny | ~1 GB | Muy rápido | Baja |
| base | ~1 GB | Rápido | Aceptable |
| small | ~2 GB | Medio | Buena |
| medium | ~5 GB | Lento | Muy buena |
| turbo | ~6 GB | Rápido | **Recomendado** |
| large-v3 | ~10 GB | Muy lento | Excelente |

> **Recomendación**: Para reuniones en español, usa al menos el modelo `turbo` para buena precisión. Si tienes Apple Silicon (M1/M2/M3), Whisper usa la GPU automáticamente.

Prueba rápida:

```bash
voxnote transcribe mi_reunion.mp3 --model turbo
```

---

## Uso del Pipeline

### Opción A: CLI

#### Grabar reunión

```bash
# Grabación manual (Ctrl-C para parar)
voxnote record

# Grabación con duración fija (30 min)
voxnote record --duration 1800
```

#### Procesar audio

```bash
# Pipeline completo: transcripción + insights + nota
voxnote process audio/mi_reunion.mp3

# Con modelo específico
voxnote process audio/mi_reunion.mp3 --model large-v3

# Con diarización (identificar hablantes)
VOXNOTE_DIARIZE=true voxnote process audio/entrevista.mp3
```

### Opción B: Interfaz web

```bash
# Iniciar API + Web
make dev
```

Abre **http://localhost:3003** para:
- Grabar audio desde el navegador
- Subir archivos existentes
- Ver y descargar notas generadas
- Configurar modelo y provider

### Opción C: API directa

```bash
# Iniciar solo API
make dev-api
```

Endpoints disponibles:

```bash
# Transcribir
curl -X POST "http://127.0.0.1:8003/api/transcribe" \
  -F "audio=@audio.mp3" \
  -F "model=turbo"

# Extraer insights
curl -X POST "http://127.0.0.1:8003/api/insights" \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "provider": "ollama"}'

# Exportar nota
curl -X POST "http://127.0.0.1:8003/api/export" \
  -H "Content-Type: application/json" \
  -d '{"insights": {}, "transcript_text": "...", "audio_name": "reunion.mp3"}'
```

---

## Integración con Obsidian

### Estructura de vault

```
MeetingNotes/          ← Tu vault de Obsidian
├── meetings/          ← Notas generadas por el pipeline
├── audio/             ← Archivos de audio originales
└── templates/
```

Configura el directorio de salida:

```bash
export VOXNOTE_OUTPUT_DIR=~/MeetingNotes/meetings
```

### Plugins recomendados

Instálalos desde **Settings → Community Plugins → Browse**:

| Plugin | Para qué sirve |
|--------|----------------|
| **Tasks** | Gestionar to-dos con checkbox |
| **Dataview** | Queries tipo SQL sobre tus notas |
| **Templater** | Templates con variables dinámicas |
| **Calendar** | Vista calendario de reuniones |

### Queries útiles con Dataview

**Action items pendientes:**

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

## Configuración avanzada

### Variables de entorno

```bash
# .env
VOXNOTE_WHISPER_MODEL=turbo
VOXNOTE_LANGUAGE=es
VOXNOTE_LLM_PROVIDER=ollama
VOXNOTE_OLLAMA_MODEL=llama3.1:8b
VOXNOTE_OUTPUT_DIR=output
```

### Otros proveedores LLM

Ver [multi-provider-setup.md](multi-provider-setup.md) para configurar:
- OpenAI (GPT-4)
- Google Gemini

---

## Seguridad y Privacidad

Todo el pipeline corre **100% local**:

- **Whisper** procesa el audio en tu CPU/GPU sin conexión a internet
- **Ollama** corre el LLM localmente en `localhost:11434`
- **Obsidian** almacena todo como archivos Markdown planos

No hay telemetría, no hay cuentas, no hay cloud.

Si quieres seguridad adicional, puedes cifrar el vault de Obsidian con [Cryptomator](https://cryptomator.org/) o [VeraCrypt](https://www.veracrypt.fr/).
