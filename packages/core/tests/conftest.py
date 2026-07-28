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
        from voxnote.logging_setup import DIR_TEST, _file_handler, _formatter, _today_filename

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
    """A realistic insights dict as returned by an LLM provider."""
    return {
        "summary": (
            "We discussed launching the MVP for March. "
            "The team agreed to prioritize auth and the dashboard."
        ),
        "decisions": [
            "Use JWT for authentication",
            "Launch the MVP on March 15",
        ],
        "action_items": [
            {"task": "Create auth endpoints", "owner": "Carlos", "deadline": "2025-02-01"},
            {"task": "Design dashboard mockups", "owner": "Ana", "deadline": "TBD"},
        ],
        "insights": [
            "The team is aligned on the MVP priority",
            "There is a risk of delay if the design is not closed this week",
        ],
        "open_questions": [
            "Who is in charge of deployment?",
        ],
        "next_steps": [
            "Follow-up meeting on Friday",
            "Carlos shares the auth PR for review",
        ],
    }


@pytest.fixture()
def sample_transcript() -> str:
    return (
        "Alright, let's get started. Today's goal is to review the MVP status. "
        "Carlos says the auth endpoints are 80% done. Ana proposes using JWT "
        "instead of sessions. The team agrees. We decide to launch on March 15. "
        "It remains to decide who handles deployment."
    )


@pytest.fixture()
def sample_diarized_result() -> TranscriptResult:
    """A TranscriptResult with speaker labels."""
    return TranscriptResult(
        text="Alright, let's start. The endpoints are at 80%.",
        segments=[
            Segment(text="Alright, let's start.", start=0.0, end=2.5, speaker="SPEAKER_00"),
            Segment(text="The endpoints are at 80%.", start=3.0, end=6.0, speaker="SPEAKER_01"),
        ],
        has_speakers=True,
    )
