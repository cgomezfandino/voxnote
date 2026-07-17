"""Shared fixtures for API tests."""

from __future__ import annotations

import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from voxnote_api.main import create_app


def pytest_configure(config: pytest.Config) -> None:
    """Route API test logs to <log_dir>/test/ with daily rotation (7-day)."""
    try:
        from voxnote.config import settings
        from voxnote.logging_setup import DIR_TEST, _file_handler, _formatter, _today_filename

        log_file = Path(settings.log_dir) / DIR_TEST / _today_filename("test")
        handler = _file_handler(log_file, logging.INFO, _formatter())
        handler._pytest_owned = True  # type: ignore[attr-defined]
        root = logging.getLogger()
        for h in list(root.handlers):
            if getattr(h, "_pytest_owned", False):
                root.removeHandler(h)
        root.addHandler(handler)
        root.setLevel(logging.INFO)
    except Exception as exc:  # noqa: BLE001
        logging.basicConfig(level=logging.INFO)
        logging.getLogger("voxnote.test").warning(
            "could not write test logs to configured log_dir (%s); console only", exc
        )


@pytest.fixture()
def client() -> TestClient:
    """Create a test client for the API."""
    app = create_app()
    return TestClient(app)
