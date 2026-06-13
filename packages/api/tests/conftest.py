"""Shared fixtures for API tests."""

import pytest
from fastapi.testclient import TestClient
from voxnote_api.main import create_app


@pytest.fixture()
def client() -> TestClient:
    """Create a test client for the API."""
    app = create_app()
    return TestClient(app)
