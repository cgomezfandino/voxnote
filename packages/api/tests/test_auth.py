"""Localhost token auth: required on all routes except health when a token is set."""

from fastapi.testclient import TestClient


def test_token_required_when_set(monkeypatch):
    monkeypatch.setenv("VOXNOTE_API_TOKEN", "s3cret")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    # health is always open (used by the shell readiness probe)
    assert client.get("/api/health").status_code == 200
    # a protected route 401s without the header
    assert client.get("/api/config").status_code == 401
    # and 200s with the correct token
    assert client.get("/api/config", headers={"X-Voxnote-Token": "s3cret"}).status_code == 200
    # wrong token is rejected
    assert client.get("/api/config", headers={"X-Voxnote-Token": "nope"}).status_code == 401


def test_auth_disabled_when_unset(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    assert client.get("/api/config").status_code == 200  # dev: no token configured -> open
