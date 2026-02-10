# Meeting Notes Pipeline

**Whisper + Ollama + Obsidian**

Guía completa de instalación y configuración — 100% local, 100% privado.

---

## Arquitectura del Pipeline

Este setup te permite grabar reuniones, transcribirlas, extraer action items e insights, y organizar todo en Obsidian — sin que ningún dato salga de tu máquina.

```
Audio → Whisper (transcripción) → Ollama + LLM local (insights) → Obsidian (Markdown)
```

## Requisitos del Sistema

- **RAM mínima**: 8 GB (16 GB recomendado si usas modelos grandes de Whisper o Llama)
- **Disco**: ~10 GB para modelos
- **SO**: macOS, Linux, o Windows (con WSL2 recomendado)
- **Python** 3.9+ y **FFmpeg** instalados
- **GPU** opcional pero recomendada para transcripción rápida (NVIDIA CUDA o Apple Silicon)

---

## Instalación Paso a Paso

### Paso 1: Instalar FFmpeg

FFmpeg es necesario para que Whisper pueda procesar archivos de audio en cualquier formato.

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Descarga desde ffmpeg.org y añade al PATH, o usa WSL2 con el comando de Ubuntu.
```

### Paso 2: Instalar OpenAI Whisper

Repositorio: [github.com/openai/whisper](https://github.com/openai/whisper)

```bash
pip install openai-whisper
```

Verifica la instalación:

```bash
whisper --help
```

#### Alternativa ligera: whisper.cpp

Si no tienes GPU o quieres máxima velocidad en CPU, instala [whisper.cpp](https://github.com/ggerganov/whisper.cpp). Es un port en C++ mucho más eficiente. Compila con `make -j` en el directorio clonado.

#### Modelos disponibles

| Modelo | VRAM | Velocidad | Precisión |
|--------|------|-----------|-----------|
| tiny | ~1 GB | Muy rápido | Baja |
| base | ~1 GB | Rápido | Aceptable |
| small | ~2 GB | Medio | Buena |
| medium | ~5 GB | Lento | Muy buena |
| large-v3 | ~10 GB | Muy lento | Excelente |

> **Recomendación**: Para reuniones en español, usa al menos el modelo `medium` para buena precisión. Si tienes Apple Silicon (M1/M2/M3), Whisper usa la GPU automáticamente.

Prueba rápida con un archivo de audio:

```bash
whisper mi_reunion.mp3 --model medium --language es --output_format txt
```

### Paso 3: Instalar Ollama (LLM local)

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

#### Modelos alternativos

- Si tienes 16+ GB de RAM: `llama3.1:70b` para mejor calidad
- Para máquinas con poca RAM: `mistral:7b` o `phi3:mini`

### Paso 4: Instalar Obsidian

Descarga desde: [obsidian.md](https://obsidian.md)

Instala Obsidian y crea un nuevo vault. Estructura de carpetas recomendada:

```
MeetingNotes/          ← Tu vault de Obsidian
├── meetings/          ← Notas generadas por el pipeline
├── templates/         ← Templates de Obsidian
├── audio/             ← Archivos de audio originales
└── transcripts/       ← Transcripciones raw de Whisper
```

#### Plugins recomendados

Instálalos desde **Settings → Community Plugins → Browse**:

| Plugin | Para qué sirve |
|--------|----------------|
| **Tasks** | Gestionar to-dos con checkbox dentro de las notas |
| **Dataview** | Queries tipo SQL sobre tus notas (filtrar por tags, fechas, etc.) |
| **Templater** | Crear templates con variables dinámicas para meeting notes |
| **Calendar** | Vista calendario de tus reuniones |

---

## Cómo Usar el Pipeline

### Paso A: Grabar la reunión

Puedes usar cualquier grabadora de audio:
- **macOS**: QuickTime (Archivo → Nueva grabación de audio)
- **Linux**: `arecord` o Audacity
- **Móvil**: la app de grabadora nativa

Guarda el archivo en la carpeta `audio/` de tu vault.

### Paso B: Ejecutar el pipeline

```bash
cd ~/MeetingNotes
python process_meeting.py audio/mi_reunion.mp3
```

Para usar un modelo diferente:

```bash
python process_meeting.py audio/mi_reunion.mp3 --model large-v3
```

### Paso C: Revisar en Obsidian

Abre Obsidian, navega a la carpeta `meetings/` y verás la nota generada con:
- Resumen ejecutivo
- Action items como to-dos con checkbox
- Insights clave
- Transcripción completa

Puedes editar, añadir tags, y linkear a otras notas.

---

## Tips Avanzados

### Grabación automática en macOS

Puedes crear un Automator workflow o un atajo de teclado que inicie la grabación con Sox:

```bash
sox -d audio/$(date +%Y%m%d_%H%M).wav
```

Y luego ejecute el pipeline al terminar.

### Queries en Obsidian con Dataview

Una vez tengas varias notas de reuniones, puedes hacer queries como esta en cualquier nota:

````markdown
```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```
````

Esto te muestra todos los action items pendientes de todas tus reuniones.

### Modelo de Whisper para reuniones mixtas (ES/EN)

Si tus reuniones mezclan español e inglés, no especifiques `--language` y deja que Whisper autodetecte. Usa al menos el modelo `medium` para mejores resultados en code-switching.

---

## Seguridad y Privacidad

Todo el pipeline corre **100% local**:

- **Whisper** procesa el audio en tu CPU/GPU sin conexión a internet
- **Ollama** corre el LLM localmente en `localhost:11434`, ningún dato sale de tu red
- **Obsidian** almacena todo como archivos Markdown planos en tu disco

No hay telemetría, no hay cuentas, no hay cloud.

Si quieres seguridad adicional, puedes cifrar el vault de Obsidian con [Cryptomator](https://cryptomator.org/) o [VeraCrypt](https://www.veracrypt.fr/).
