"""Tests for the Obsidian Markdown exporter."""

from pathlib import Path


def test_export_creates_file(tmp_path, sample_insights, sample_transcript):
    """export_obsidian should write a .md file in the output dir."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_transcript,
        audio_name="standup_2025-01-15.mp3",
        output_dir=tmp_path,
    )

    assert note.exists()
    assert note.suffix == ".md"
    assert note.parent == tmp_path


def test_export_contains_frontmatter(tmp_path, sample_insights, sample_transcript):
    """The generated note should have YAML frontmatter with tags and date."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_transcript,
        audio_name="standup.mp3",
        output_dir=tmp_path,
    )
    content = note.read_text()

    assert content.startswith("---\n")
    assert "tags: [meeting," in content
    assert "date:" in content
    assert "audio:" in content


def test_export_contains_all_sections(tmp_path, sample_insights, sample_transcript):
    """The note should contain every expected section."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_transcript,
        audio_name="retro.wav",
        output_dir=tmp_path,
    )
    content = note.read_text()

    for heading in ["Resumen", "Decisiones", "Action Items", "Insights Clave",
                    "Preguntas Abiertas", "Próximos Pasos", "Transcripción Completa"]:
        assert f"## {heading}" in content


def test_export_action_items_as_checkboxes(tmp_path, sample_insights, sample_transcript):
    """Action items should render as Obsidian-compatible checkboxes."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_transcript,
        audio_name="planning.mp3",
        output_dir=tmp_path,
    )
    content = note.read_text()

    assert "- [ ] Crear endpoints de auth @Carlos" in content
    assert "- [ ] Diseñar mockups del dashboard @Ana" in content


def test_export_empty_insights(tmp_path, sample_transcript):
    """Should handle an empty insights dict gracefully."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights={},
        transcript=sample_transcript,
        audio_name="empty.mp3",
        output_dir=tmp_path,
    )
    content = note.read_text()

    assert "N/A" in content  # resumen fallback
    assert "- [ ] Sin action items identificados" in content


def test_export_slug_from_audio_name(tmp_path, sample_insights, sample_transcript):
    """The filename should include the audio stem as slug."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_transcript,
        audio_name="weekly_sync.m4a",
        output_dir=tmp_path,
    )

    assert "weekly_sync" in note.name
