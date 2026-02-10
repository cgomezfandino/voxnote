"""Live audio recording via the system microphone."""

from pathlib import Path

import numpy as np
import sounddevice as sd
import soundfile as sf
from rich.console import Console

from voxnote.config import settings

console = Console()


def record_audio(output_path: str | Path, duration: float | None = None) -> Path:
    """Record audio from the default microphone.

    If *duration* is None the recording runs until the user presses Ctrl-C.

    Args:
        output_path: Where to save the .wav file.
        duration: Recording length in seconds, or None for manual stop.

    Returns:
        The Path to the saved audio file.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sr = settings.sample_rate

    if duration is not None:
        console.print(f"[bold blue]Recording[/] {duration}s at {sr} Hz…")
        audio = sd.rec(int(duration * sr), samplerate=sr, channels=1, dtype="float32")
        sd.wait()
    else:
        console.print("[bold blue]Recording[/] — press [bold red]Ctrl-C[/] to stop")
        frames: list[np.ndarray] = []
        try:
            with sd.InputStream(samplerate=sr, channels=1, dtype="float32") as stream:
                while True:
                    data, _ = stream.read(sr)  # 1-second chunks
                    frames.append(data.copy())
        except KeyboardInterrupt:
            pass
        audio = np.concatenate(frames) if frames else np.array([], dtype="float32")

    sf.write(str(output_path), audio, sr)
    console.print(f"[green]Saved[/] {output_path} ({len(audio) / sr:.1f}s)")
    return output_path
