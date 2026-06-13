# NOTICES — Licencias de terceros

Voxnote usa (y, al empaquetar la app de escritorio, incluye) los siguientes componentes
open-source. Sus licencias se listan aquí para la atribución requerida al distribuir.

## Voz y ML
- **OpenAI Whisper** — MIT — https://github.com/openai/whisper
- **whisperX** — BSD — https://github.com/m-bain/whisperX
- **faster-whisper** — MIT — https://github.com/SYSTRAN/faster-whisper
- **CTranslate2** — MIT — https://github.com/OpenNMT/CTranslate2
- **pyannote.audio** — MIT — https://github.com/pyannote/pyannote-audio
- **pyannote/speaker-diarization-3.1** (modelo) — MIT — https://huggingface.co/pyannote/speaker-diarization-3.1
- **pyannote/segmentation-3.0** (modelo) — MIT — https://huggingface.co/pyannote/segmentation-3.0
- **PyTorch** — BSD-3-Clause — https://github.com/pytorch/pytorch

## Backend / pipeline
- **FastAPI** — MIT · **Uvicorn** — BSD-3 · **Pydantic** / **pydantic-settings** — MIT
- **Click** — BSD-3 · **Rich** — MIT · **requests** — Apache-2.0
- **python-docx** — MIT · **NumPy** — BSD-3 · **soundfile** — BSD-3 · **sounddevice** — MIT

## Frontend
- **Next.js** — MIT · **React** — MIT · **Tailwind CSS** — MIT · **framer-motion** — MIT
- **lucide-react** — ISC · **react-markdown** / **remark-gfm** — MIT · **wavesurfer.js** — BSD-3

---

> Esta lista es un punto de partida. Antes de un release, regenera la lista exacta con versiones
> usando `pip-licenses` (Python) y `license-checker` (npm), e incluye los textos de licencia que
> exija cada una. Los modelos descargados de HuggingFace conservan sus propios términos —
> verifícalos antes de redistribuir los pesos dentro del instalador.
