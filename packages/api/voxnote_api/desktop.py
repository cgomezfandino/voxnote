"""Single-process entrypoint for the packaged desktop app.

Picks a per-user data dir and a free port BEFORE importing settings, then runs uvicorn
in-process (the app OBJECT, not an import string — survives a frozen/relocated
interpreter) with reload OFF. The desktop shell reads the printed ``VOXNOTE_READY`` line
to learn the port, and injects VOXNOTE_API_TOKEN + VOXNOTE_WEB_DIR via the environment.
"""

from __future__ import annotations

import os
import socket


def _pick_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def main() -> None:
    from platformdirs import user_data_dir

    # Per-user, app-managed data dir for notes. Must be set before settings import so the
    # singleton reads it; never falls back to a relative ./output in a frozen app.
    data_dir = os.getenv("VOXNOTE_OUTPUT_DIR") or os.path.join(
        user_data_dir("Voxnote", "Voxnote"), "notes"
    )
    os.environ["VOXNOTE_OUTPUT_DIR"] = data_dir

    host = "127.0.0.1"
    env_port = os.getenv("VOXNOTE_API_PORT")
    if env_port and env_port.isdigit() and int(env_port) > 0:
        port = int(env_port)
    else:
        port = _pick_free_port()

    # Announce the port so the shell can build the URL and inject the token.
    print(f"VOXNOTE_READY host={host} port={port}", flush=True)

    import uvicorn

    from voxnote_api.main import app

    uvicorn.run(app, host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
