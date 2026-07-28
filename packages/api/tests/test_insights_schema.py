"""InsightsResponse normalizes imperfect LLM output without raising."""

from __future__ import annotations

from voxnote_api.schemas import InsightsResponse


def test_insights_response_enriched_fields() -> None:
    data = {
        "summary": "Summary.",
        "participants": [{"speaker": "SPEAKER_00", "contribution": "Led it."}],
        "key_points": ["Point A"],
        "highlights": [{"speaker": "Ana", "quote": "Quote."}],
    }
    res = InsightsResponse(**data)
    assert res.participants[0].speaker == "SPEAKER_00"
    assert res.key_points == ["Point A"]
    assert res.highlights[0].quote == "Quote."


def test_insights_response_tolerates_malformed_llm_output() -> None:
    # Strings where objects are expected, a bare string for a list, None, dict-in-strlist.
    data = {
        "summary": "Summary.",
        "participants": ["SPEAKER_00", "Ana"],
        "action_items": ["Do X", {"task": "Do Y"}],
        "highlights": "A single quote",
        "key_points": None,
        "decisions": [{"text": "Use JWT"}],
    }
    res = InsightsResponse(**data)
    assert res.participants[0].speaker == "SPEAKER_00"
    assert res.action_items[0].task == "Do X"
    assert res.highlights[0].quote == "A single quote"
    assert res.key_points == []
    assert res.decisions == ["Use JWT"]


def test_insights_response_dict_missing_primary_key_does_not_raise() -> None:
    # A dict that lacks the required key (task/quote) must not blow up the whole payload:
    # the missing key is synthesized from the remaining values, or the item is dropped.
    data = {
        "summary": "Summary.",
        "action_items": [{"owner": "Ana", "deadline": "TBD"}],  # no 'task'
        "highlights": [{"speaker": "Ana"}, {}],  # no 'quote'; empty dict
    }
    res = InsightsResponse(**data)
    # The action_item synthesized its task from the other values instead of raising.
    assert res.action_items[0].task == "Ana — TBD"
    # The highlight with content was kept (quote synthesized); the empty dict was dropped.
    assert len(res.highlights) == 1
    assert res.highlights[0].quote == "Ana"


def test_insights_response_accepts_legacy_spanish_keys_as_aliases() -> None:
    """LLMs are not deterministic; older flows may still emit Spanish keys.

    The normalizer maps Spanish top-level keys and Spanish sub-keys to their English
    equivalents so a legacy payload never silently drops content.
    """
    data = {
        "resumen": "Resumen.",
        "participantes": [{"hablante": "SPEAKER_00", "aporte": "Lideró."}],
        "puntos_clave": ["Punto A"],
        "comentarios_destacados": [{"hablante": "Ana", "cita": "Cita."}],
        "decisiones": ["Usar JWT"],
        "action_items": [{"tarea": "Hacer X", "responsable": "Ana"}],
        "preguntas_abiertas": ["¿Qué?"],
        "proximos_pasos": ["Seguimiento"],
    }
    res = InsightsResponse(**data)
    assert res.summary == "Resumen."
    assert res.participants[0].speaker == "SPEAKER_00"
    assert res.participants[0].contribution == "Lideró."
    assert res.key_points == ["Punto A"]
    assert res.highlights[0].speaker == "Ana"
    assert res.highlights[0].quote == "Cita."
    assert res.decisions == ["Usar JWT"]
    assert res.action_items[0].task == "Hacer X"
    assert res.action_items[0].owner == "Ana"
    assert res.open_questions == ["¿Qué?"]
    assert res.next_steps == ["Seguimiento"]
