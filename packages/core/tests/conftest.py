"""Shared fixtures for all tests."""

from __future__ import annotations

import logging
from pathlib import Path

import pytest
from voxnote.pipeline.models import Segment, TranscriptResult


def pytest_configure(config: pytest.Config) -> None:
    """Route test logs to <log_dir>/test/ with daily rotation (7-day retention).

    Falls back to console-only logging if the configured log dir is not writable
    (e.g. external SSD not mounted on CI / another machine).
    """
    try:
        from voxnote.config import settings
        from voxnote.logging_setup import _file_handler, _formatter, _today_filename, DIR_TEST

        log_file = Path(settings.log_dir) / DIR_TEST / _today_filename("test")
        handler = _file_handler(log_file, logging.INFO, _formatter())
        handler._pytest_owned = True  # type: ignore[attr-defined]
        root = logging.getLogger()
        # Avoid stacking handlers across re-configurations.
        for h in list(root.handlers):
            if getattr(h, "_pytest_owned", False):
                root.removeHandler(h)
        root.addHandler(handler)
        root.setLevel(logging.INFO)
    except Exception as exc:  # noqa: BLE001 — never let logging break tests
        logging.basicConfig(level=logging.INFO)
        logging.getLogger("voxnote.test").warning(
            "could not write test logs to configured log_dir (%s); console only", exc
        )


@pytest.fixture()
def sample_insights() -> dict:
    """A realistic insights dict as returned by Ollama."""
    return {
        "resumen": (
            "Se discutió el lanzamiento del MVP para marzo. "
            "El equipo acordó priorizar auth y dashboard."
        ),
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
