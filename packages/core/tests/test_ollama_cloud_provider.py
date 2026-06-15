"""'ollama-cloud' resolves to the standard OllamaProvider (URL+key from settings)."""

from voxnote.providers import OllamaProvider, get_provider


def test_ollama_cloud_maps_to_ollama_provider():
    assert isinstance(get_provider("ollama-cloud"), OllamaProvider)
