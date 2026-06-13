"""InsightsResponse normalizes imperfect LLM output without raising."""

from __future__ import annotations

from voxnote_api.schemas import InsightsResponse


def test_insights_response_enriched_fields() -> None:
    data = {
        "resumen": "Resumen.",
        "participantes": [{"hablante": "SPEAKER_00", "aporte": "Lideró."}],
        "puntos_clave": ["Punto A"],
        "comentarios_destacados": [{"hablante": "Ana", "cita": "Cita."}],
    }
    res = InsightsResponse(**data)
    assert res.participantes[0].hablante == "SPEAKER_00"
    assert res.puntos_clave == ["Punto A"]
    assert res.comentarios_destacados[0].cita == "Cita."


def test_insights_response_tolerates_malformed_llm_output() -> None:
    # Strings where objects are expected, a bare string for a list, None, dict-in-strlist.
    data = {
        "resumen": "Resumen.",
        "participantes": ["SPEAKER_00", "Ana"],
        "action_items": ["Hacer X", {"tarea": "Hacer Y"}],
        "comentarios_destacados": "Una sola cita",
        "puntos_clave": None,
        "decisiones": [{"texto": "Usar JWT"}],
    }
    res = InsightsResponse(**data)
    assert res.participantes[0].hablante == "SPEAKER_00"
    assert res.action_items[0].tarea == "Hacer X"
    assert res.comentarios_destacados[0].cita == "Una sola cita"
    assert res.puntos_clave == []
    assert res.decisiones == ["Usar JWT"]
