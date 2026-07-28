"""Centralized logging setup for Voxnote.

All log files live under ``settings.log_dir`` (default: an SSD-backed path, see
``config.Settings.log_dir``). They are organized by kind and rotated daily,
keeping the last 7 days::

    <log_dir>/
        api/      api-YYYY-MM-DD.log          ← FastAPI/uvicorn + app loggers
        dev/      dev-YYYY-MM-DD.log          ← stdout/stderr captured by `make dev`
        test/     test-YYYY-MM-DD.log         ← pytest session logs
        errors/   errors-YYYY-MM-DD.log       ← unhandled exceptions tracebacks

Everything is also mirrored to the console (stderr) so the developer experience
during ``make dev`` does not change. The file handlers are added with a higher
level so noisy request logs don't drown the error files.

The location is configurable via the ``VOXNOTE_LOG_DIR`` environment variable,
so this stays portable across machines.
"""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

ROTATE_WHEN = "midnight"  # daily rotation
ROTATE_BACKUP_COUNT = 7   # keep last 7 days

# Subdirectories under log_dir, one per log kind.
DIR_API = "api"
DIR_DEV = "dev"
DIR_TEST = "test"
DIR_ERRORS = "errors"

# Restrictive perms: logs can capture meeting-derived content (LLM output, tracebacks),
# so they must be owner-only — matching audio (0o600) and notes (0o600 / dirs 0o700).
LOG_FILE_MODE = 0o600
LOG_DIR_MODE = 0o700


def _restrict_path(path: Path, mode: int) -> None:
    """Tighten an existing path's permissions; ignore if unsupported (e.g. CIFS share)."""
    try:
        path.chmod(mode)
    except OSError:
        # Network/foreign filesystems may reject chmod; the umask at creation still applies.
        pass


def _file_handler(log_file: Path, level: int, fmt: logging.Formatter) -> TimedRotatingFileHandler:
    """Build a daily-rotating file handler, creating parent dirs as needed.

    Uses :class:`_PrivateFileHandler` so the log file is created ``0o600`` every time
    it is opened (on first write and after each midnight rotation) — the default
    ``TimedRotatingFileHandler`` inherits the process umask (typically ``0o644``),
    and logs can hold meeting-derived content.
    """
    log_file.parent.mkdir(parents=True, exist_ok=True)
    _restrict_path(log_file.parent, LOG_DIR_MODE)
    handler = _PrivateFileHandler(
        log_file,
        when=ROTATE_WHEN,
        backupCount=ROTATE_BACKUP_COUNT,
        encoding="utf-8",
        delay=True,  # don't open until first write; avoids empty files
    )
    handler.setLevel(level)
    handler.setFormatter(fmt)
    return handler


class _PrivateFileHandler(TimedRotatingFileHandler):
    """``TimedRotatingFileHandler`` that writes files owner-only (``0o600``)."""

    def _open(self):  # type: ignore[override]
        stream = super()._open()
        # Applied on first open and after each rotation (doRollover calls _open).
        try:
            os.chmod(self.baseFilename, LOG_FILE_MODE)
        except OSError:
            # Foreign filesystems may reject chmod; umask at creation still applies.
            pass
        return stream


def _formatter() -> logging.Formatter:
    return logging.Formatter(
        fmt="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def _today_filename(stem: str) -> str:
    """Filename using today's date so rotation is predictable on first run."""
    from datetime import date

    return f"{stem}-{date.today().isoformat()}.log"


def setup_logging(log_dir: Path, *, level: int = logging.INFO) -> dict[str, Path]:
    """Configure root + app logging to write to ``log_dir`` and to console.

    Idempotent: removes previously installed Voxnote file handlers so repeated
    calls (e.g. on app reload) don't duplicate log lines.

    Returns a dict mapping kind → resolved log file path, useful for wiring
    other tools (pytest, Makefile) to the same destination.
    """
    log_dir = Path(log_dir).expanduser()
    log_dir.mkdir(parents=True, exist_ok=True)
    _restrict_path(log_dir, LOG_DIR_MODE)
    fmt = _formatter()

    paths = {
        DIR_API: log_dir / DIR_API / _today_filename("api"),
        DIR_ERRORS: log_dir / DIR_ERRORS / _today_filename("errors"),
    }
    # dev/ and test/ are written by external tools (shell redirect, pytest),
    # but we expose their canonical paths for consistency.
    paths[DIR_DEV] = log_dir / DIR_DEV / _today_filename("dev")
    paths[DIR_TEST] = log_dir / DIR_TEST / _today_filename("test")

    root = logging.getLogger()
    root.setLevel(level)

    # Remove any previously installed handlers from this module (idempotency).
    for h in list(root.handlers):
        if getattr(h, "_voxnote_owned", False):
            root.removeHandler(h)

    # Console handler — mirror to stderr so `make dev` still shows logs live.
    console = logging.StreamHandler(stream=sys.stderr)
    console.setLevel(level)
    console.setFormatter(fmt)
    console._voxnote_owned = True  # type: ignore[attr-defined]
    root.addHandler(console)

    # API file handler — full INFO log for the app.
    api_handler = _file_handler(paths[DIR_API], level, fmt)
    api_handler._voxnote_owned = True  # type: ignore[attr-defined]
    root.addHandler(api_handler)

    # Errors file handler — WARNING+ only, separate file for quick triage.
    error_handler = _file_handler(paths[DIR_ERRORS], logging.WARNING, fmt)
    error_handler._voxnote_owned = True  # type: ignore[attr-defined]
    root.addHandler(error_handler)

    return paths


def install_excepthook() -> None:
    """Send unhandled exception tracebacks to the root logger (→ errors/ file)."""

    def _hook(exc_type, exc_value, exc_tb) -> None:  # type: ignore[no-untyped-def]
        if issubclass(exc_type, KeyboardInterrupt):
            # Respect default Ctrl+C behavior.
            sys.__excepthook__(exc_type, exc_value, exc_tb)
            return
        logging.getLogger("voxnote.excepthook").critical(
            "Unhandled exception", exc_info=(exc_type, exc_value, exc_tb)
        )

    sys.excepthook = _hook
