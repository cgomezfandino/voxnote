# Project Guidelines — Agent Instructions

This file guides AI coding agents working in this repository. No repository-specific configuration files were detected during initial discovery, so these instructions focus on how to discover and follow the project's conventions. Update this file if the project contains a `package.json`, `pyproject.toml`, or other tool config files.

## Code Style
- Detect and follow existing config files if present: `package.json`, `pyproject.toml`, `.prettierrc`, `.eslintrc`, `setup.cfg`, `tox.ini`.
- If a formatter is configured (Prettier/Black/isort), run it and follow its rules. If none found, default to `black` for Python and `prettier` for JS/TS.

## Architecture
- Inspect top-level directories for structure: `src/`, `packages/`, `backend/`, `web/`, `api/`.
- Report the major components you find (services, libraries, CLI, infra scripts) before making large changes.

## Build and Test
- Detect project type and run the canonical commands:
  - Node: if `package.json` exists -> `npm ci` (or `pnpm install` if pnpm lock), then `npm test`.
  - Python: if `pyproject.toml` or `requirements.txt` exists -> create venv, `pip install -r requirements.txt` or `pip install -e .`, then `pytest`.
  - If `Makefile` exists prefer `make test` / `make build`.
- Do not modify CI files without explicit instruction from the user.

## Project Conventions
- Prefer small, focused changes. Aim for minimal diffs and keep public APIs stable.
- Follow existing naming and module patterns found in `src/` or equivalent — point to examples when altering patterns.
- If adding dependencies, update the lockfile (`package-lock.json` / `poetry.lock`) and mention the change.

## Integration Points
- Identify external services or APIs from config files or `.env.example`. Do not commit secrets.
- When integrating, prefer feature flags or configuration toggles and document expected environment variables.

## Security
- Never commit credentials or private keys. If secrets are required for local testing, document how to load them via `.env` or CI secrets.
- For code touching authentication/authorization, ask for the responsible engineer or a test account before making changes.

## Workflow for Agents
1. Scan the repo root for `package.json`, `pyproject.toml`, `README.md`, `Makefile`, `src/`, and `tests/`.
2. Summarize findings to the user and propose the next small change (one logical task).
3. Implement the change, run the relevant tests, and present the failing/passing results.

If this repository has additional conventions or key files, please paste them here or update this file so future agents can follow them precisely.

--
If you prefer a different filename (e.g., `AGENTS.md`) or want nested agent docs per package in a monorepo, tell me where to place them and I'll merge accordingly.
