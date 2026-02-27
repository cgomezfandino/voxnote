"""Pipeline stages: record → transcribe → extract insights → export."""

from voxnote.pipeline.exporter import export_obsidian
from voxnote.pipeline.insights import extract_insights
from voxnote.pipeline.models import Segment, TranscriptResult
from voxnote.pipeline.recorder import record_audio
from voxnote.pipeline.transcriber import transcribe

__all__ = [
    "record_audio",
    "transcribe",
    "extract_insights",
    "export_obsidian",
    "Segment",
    "TranscriptResult",
]
