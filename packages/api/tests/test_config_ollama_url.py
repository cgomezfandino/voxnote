"""The Ollama URL Base is wired through PUT /api/config (was display-only before)."""

import pytest
from fastapi.testclient import TestClient


def test_ollama_url_roundtrip(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": "http://my-ollama:1234"})
    assert res.status_code == 200
    assert res.json()["ollama_url"] == "http://my-ollama:1234"


def test_ollama_url_empty_resets_to_default(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    client.put("/api/config", json={"ollama_url": "http://x:1"})
    res = client.put("/api/config", json={"ollama_url": "   "})
    assert res.status_code == 200
    # A cleared field falls back to the local default, not an empty/broken URL.
    assert res.json()["ollama_url"] == "http://localhost:11434"


# --- SSRF mitigation: ollama_url is operator-settable and the Ollama provider POSTs
# the meeting transcript + a Bearer key to it, so it must reject cloud metadata sinks
# and non-http schemes. Local/private hosts remain valid (legitimate Ollama backends).
def test_ollama_url_rejects_cloud_metadata_ipv4(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": "http://169.254.169.254/latest/meta-data/"})
    assert res.status_code == 422  # validation error
    # The local default is untouched on rejection.
    assert res.json().get("ollama_url") is None


def test_ollama_url_rejects_gcp_metadata_host(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": "http://metadata.google.internal/"})
    assert res.status_code == 422


@pytest.mark.parametrize(
    "bad_url",
    [
        "file:///etc/passwd",
        "gopher://attacker.example/x",
        "javascript:alert(1)",
        "ftp://localhost/ollama",
        "localhost:11434",  # no scheme
        "//localhost:11434",  # scheme-relative
    ],
)
def test_ollama_url_rejects_non_http_schemes(monkeypatch, bad_url):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": bad_url})
    assert res.status_code == 422


@pytest.mark.parametrize(
    "good_url",
    [
        "http://localhost:11434",
        "https://my-ollama.example.com",
        "http://192.168.1.10:11434",
        "http://10.0.0.5:11434",
        "https://api.ollama.com",
    ],
)
def test_ollama_url_accepts_legitimate_backends(monkeypatch, good_url):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": good_url})
    assert res.status_code == 200
    assert res.json()["ollama_url"] == good_url
