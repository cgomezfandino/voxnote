# NOTICES — Third-party licenses

Voxnote uses (and, when packaging the desktop app, bundles) the following open-source
components. Their licenses are listed here for the attribution required when distributing.

## Voice & ML
- **OpenAI Whisper** — MIT — https://github.com/openai/whisper
- **whisperX** — BSD — https://github.com/m-bain/whisperX
- **faster-whisper** — MIT — https://github.com/SYSTRAN/faster-whisper
- **CTranslate2** — MIT — https://github.com/OpenNMT/CTranslate2
- **pyannote.audio** — MIT — https://github.com/pyannote/pyannote-audio
- **pyannote/speaker-diarization-3.1** (model) — MIT — https://huggingface.co/pyannote/speaker-diarization-3.1
- **pyannote/segmentation-3.0** (model) — MIT — https://huggingface.co/pyannote/segmentation-3.0
- **PyTorch** — BSD-3-Clause — https://github.com/pytorch/pytorch

## Backend / pipeline
- **FastAPI** — MIT · **Uvicorn** — BSD-3 · **Pydantic** / **pydantic-settings** — MIT
- **Click** — BSD-3 · **Rich** — MIT · **requests** — Apache-2.0
- **python-docx** — MIT · **NumPy** — BSD-3 · **soundfile** — BSD-3 · **sounddevice** — MIT

## Frontend
- **Next.js** — MIT · **React** — MIT · **Tailwind CSS** — MIT · **framer-motion** — MIT
- **lucide-react** — ISC · **react-markdown** / **remark-gfm** — MIT · **wavesurfer.js** — BSD-3

---

> This list is a starting point. Before a release, regenerate the exact list with versions
> using `pip-licenses` (Python) and `license-checker` (npm), and include the license texts
> each one requires. Models downloaded from HuggingFace keep their own terms — verify them
> before redistributing the weights inside the installer.
