"""Audio transcription with optional speaker diarization.

Supports two backends:
- whisperX (faster, with alignment and diarization support)
- openai-whisper (vanilla, default fallback)
"""

from __future__ import annotations

import contextlib
import gc
from pathlib import Path

from rich.console import Console

from voxnote.config import settings
from voxnote.pipeline.models import Segment, TranscriptResult

console = Console()

# Detect available backend at import time
_BACKEND: str | None = None
try:
    import whisperx as _whisperx  # noqa: F401

    _BACKEND = "whisperx"
except ImportError:
    try:
        import whisper as _whisper  # noqa: F401

        _BACKEND = "whisper"
    except ImportError:
        _BACKEND = None


def _get_device() -> str:
    """Auto-detect best available device."""
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def transcribe(
    audio_path: str | Path,
    model_name: str | None = None,
    diarize: bool | None = None,
) -> TranscriptResult:
    """Transcribe an audio file, optionally with speaker diarization.

    Args:
        audio_path: Path to the audio file (mp3, wav, m4a, etc.).
        model_name: Whisper model override. Defaults to settings.whisper_model.
        diarize: Override diarization setting. If None, uses settings.diarize.

    Returns:
        A TranscriptResult with full text and optionally speaker-labeled segments.
    """
    if _BACKEND is None:
        raise ImportError(
            "Neither whisperx nor openai-whisper is installed. "
            "Install one:\n  pip install openai-whisper\n  pip install whisperx"
        )

    model_name = model_name or settings.whisper_model
    should_diarize = diarize if diarize is not None else settings.diarize

    if should_diarize and _BACKEND != "whisperx":
        console.print(
            "[yellow]Warning:[/] Diarization requires whisperX. Install it with "
            '"pip install -e packages/core[whisperx]" — transcribing without speakers.'
        )

    if _BACKEND == "whisperx":
        return _transcribe_whisperx(str(audio_path), model_name, should_diarize)
    else:
        return _transcribe_whisper(str(audio_path), model_name)


def _transcribe_whisper(audio_path: str, model_name: str) -> TranscriptResult:
    """Transcribe using vanilla openai-whisper."""
    import whisper

    console.print(f"[bold blue]Transcribing[/] with Whisper ({model_name})…")

    model = whisper.load_model(model_name)
    language = settings.language if settings.language else None
    result = model.transcribe(audio_path, language=language)

    text: str = result["text"]
    console.print(f"[green]Transcription complete[/] — {len(text)} chars")
    return TranscriptResult(text=text)


@contextlib.contextmanager
def _patch_torch_serialization_ctx():
    """Allow pyannote checkpoint loading with PyTorch >= 2.6.

    PyTorch 2.6 defaults torch.load to weights_only=True which
    rejects omegaconf types used by pyannote/speechbrain checkpoints.
    We temporarily patch torch.load to default weights_only=False for these
    trusted model files.
    """
    import torch

    _original_load = torch.load

    def _patched_load(*args: object, **kwargs: object) -> object:
        kwargs["weights_only"] = False  # type: ignore[arg-type]
        return _original_load(*args, **kwargs)

    torch.load = _patched_load  # type: ignore[assignment]
    try:
        yield
    finally:
        torch.load = _original_load  # type: ignore[assignment]


def _transcribe_whisperx(
    audio_path: str, model_name: str, diarize: bool
) -> TranscriptResult:
    """Transcribe using whisperX with optional alignment and diarization."""
    import whisperx

    device = _get_device()
    compute_type = settings.compute_type
    language = settings.language if settings.language else None

    console.print(
        f"[bold blue]Transcribing[/] with whisperX ({model_name}, "
        f"device={device}, compute={compute_type})…"
    )

    # Step 1: Transcribe
    model = whisperx.load_model(
        model_name, device=device, compute_type=compute_type, language=language,
    )
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16, language=language)

    # Free transcription model memory before loading alignment model
    del model
    gc.collect()

    # Step 2: Align (word-level timestamps)
    lang_code = language or result.get("language", "es")
    try:
        model_align, metadata = whisperx.load_align_model(
            language_code=lang_code, device=device
        )
        result = whisperx.align(
            result["segments"], model_align, metadata, audio, device=device
        )
        del model_align
        gc.collect()
    except Exception as e:
        console.print(f"[yellow]Alignment skipped:[/] {e}")

    # Step 3: Diarize (optional, requires HF token)
    has_speakers = False
    if diarize:
        hf_token = settings.hf_token
        if not hf_token:
            console.print(
                "[yellow]Warning:[/] Diarization requested but VOXNOTE_HF_TOKEN "
                "not set. Skipping speaker diarization."
            )
        else:
            console.print("[bold blue]Running speaker diarization…[/]")
            from whisperx.diarize import DiarizationPipeline

            with _patch_torch_serialization_ctx():
                diarize_model = DiarizationPipeline(
                    model_name=settings.diarize_model, token=hf_token, device=device
                )
                diarize_segments = diarize_model(
                    audio,
                    min_speakers=settings.diarize_min_speakers,
                    max_speakers=settings.diarize_max_speakers,
                )
            result = whisperx.assign_word_speakers(diarize_segments, result)
            has_speakers = True
            del diarize_model
            gc.collect()

    # Build TranscriptResult from segments
    segments: list[Segment] = []
    for seg in result.get("segments", []):
        segments.append(Segment(
            text=seg.get("text", ""),
            start=seg.get("start", 0.0),
            end=seg.get("end", 0.0),
            speaker=seg.get("speaker") if has_speakers else None,
        ))

    full_text = " ".join(s.text.strip() for s in segments if s.text.strip())
    tr = TranscriptResult(text=full_text, segments=segments, has_speakers=has_speakers)

    console.print(f"[green]Transcription complete[/] — {len(full_text)} chars")
    if has_speakers:
        unique = {s.speaker for s in segments if s.speaker}
        console.print(f"[green]Speakers detected:[/] {len(unique)}")

    return tr
