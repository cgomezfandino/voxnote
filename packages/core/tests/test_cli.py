"""Tests for the CLI commands."""

from unittest.mock import patch

from click.testing import CliRunner
from voxnote.cli import main
from voxnote.pipeline.models import TranscriptResult


def test_cli_help():
    """voxnote --help should exit 0 and show usage."""
    runner = CliRunner()
    result = runner.invoke(main, ["--help"])
    assert result.exit_code == 0
    assert "record" in result.output
    assert "transcribe" in result.output
    assert "process" in result.output


def test_cli_version():
    """voxnote --version should print the version."""
    runner = CliRunner()
    result = runner.invoke(main, ["--version"])
    assert result.exit_code == 0
    assert "0.1.0" in result.output


def test_process_command(tmp_path):
    """voxnote process should chain transcribe → insights → export."""
    audio = tmp_path / "test.mp3"
    audio.write_bytes(b"fake audio data")

    fake_insights = {
        "summary": "Test",
        "decisions": [],
        "action_items": [],
        "insights": [],
        "open_questions": [],
        "next_steps": [],
    }

    with (
        patch(
            "voxnote.pipeline.transcriber.transcribe",
            return_value=TranscriptResult(text="Test transcription"),
        ),
        patch(
            "voxnote.pipeline.insights.extract_insights",
            return_value=fake_insights,
        ),
        patch(
            "voxnote.pipeline.exporter.export_obsidian",
            return_value=tmp_path / "note.md",
        ),
    ):
        runner = CliRunner()
        result = runner.invoke(main, ["process", str(audio)])

    assert result.exit_code == 0
