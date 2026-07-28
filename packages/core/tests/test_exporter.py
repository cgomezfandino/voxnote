"""Tests for the Obsidian Markdown exporter."""


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

    for heading in [
        "📝 Summary",
        "✅ Decisions",
        "🎯 Action items",
        "💡 Insights",
        "❓ Open questions",
        "🔜 Next steps",
        "Full transcript",
    ]:
        assert heading in content


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

    assert "- [ ] Create auth endpoints @Carlos" in content
    assert "- [ ] Design dashboard mockups @Ana" in content


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

    assert "N/A" in content  # summary fallback
    assert "- [ ] No tasks identified" in content


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


def test_export_string_field_not_split_per_char(tmp_path, sample_transcript):
    """A list-field returned by the LLM as a bare string must render as one bullet.

    Iterating a string yields characters, so the old code emitted one bullet per letter.
    """
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights={"summary": "R", "decisions": "Use JWT", "participants": "Carlos"},
        transcript=sample_transcript,
        audio_name="oneline.mp3",
        output_dir=tmp_path,
    )
    content = note.read_text()

    assert "- Use JWT" in content  # one bullet, whole string
    assert "- U\n" not in content  # NOT split into per-character bullets
    assert "- **Carlos**" in content  # participant string handled as a single entry


def test_export_with_diarized_transcript(tmp_path, sample_insights, sample_diarized_result):
    """Exporter should handle TranscriptResult with speaker labels."""
    from voxnote.pipeline.exporter import export_obsidian

    note = export_obsidian(
        insights=sample_insights,
        transcript=sample_diarized_result,
        audio_name="meeting.mp3",
        output_dir=tmp_path,
    )
    content = note.read_text()

    assert "[SPEAKER_00]:" in content
    assert "[SPEAKER_01]:" in content
    assert "Full transcript" in content
