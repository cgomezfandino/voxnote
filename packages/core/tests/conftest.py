"""Shared fixtures for all tests."""

import pytest

from voxnote.pipeline.models import Segment, TranscriptResult


@pytest.fixture()
def sample_insights() -> dict:
    """A realistic insights dict as returned by Ollama."""
    return {
        "resumen": "Se discutió el lanzamiento del MVP para marzo. El equipo acordó priorizar auth y dashboard.",
        "decisiones": [
            "Usar JWT para autenticación",
            "Lanzar MVP el 15 de marzo",
        ],
        "action_items": [
            {"tarea": "Crear endpoints de auth", "responsable": "Carlos", "deadline": "2025-02-01"},
            {"tarea": "Diseñar mockups del dashboard", "responsable": "Ana", "deadline": "TBD"},
        ],
        "insights": [
            "El equipo está alineado en la prioridad del MVP",
            "Hay riesgo de retraso si no se cierra el diseño esta semana",
        ],
        "preguntas_abiertas": [
            "¿Quién se encarga del despliegue?",
        ],
        "proximos_pasos": [
            "Reunión de seguimiento el viernes",
            "Carlos comparte PR de auth para review",
        ],
    }


@pytest.fixture()
def sample_transcript() -> str:
    return (
        "Bueno, empezamos. El objetivo de hoy es revisar el estado del MVP. "
        "Carlos dice que los endpoints de auth están al 80%. Ana propone usar JWT "
        "en lugar de sessions. El equipo está de acuerdo. Se decide lanzar el 15 de marzo. "
        "Queda pendiente definir quién hace el despliegue."
    )


@pytest.fixture()
def sample_diarized_result() -> TranscriptResult:
    """A TranscriptResult with speaker labels."""
    return TranscriptResult(
        text="Bueno empezamos. Los endpoints están al 80%.",
        segments=[
            Segment(text="Bueno empezamos.", start=0.0, end=2.5, speaker="SPEAKER_00"),
            Segment(text="Los endpoints están al 80%.", start=3.0, end=6.0, speaker="SPEAKER_01"),
        ],
        has_speakers=True,
    )
