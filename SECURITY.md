# Security policy

## Reporting a vulnerability

If you find a security issue in Voxnote, **do not open a public issue**.
Report it privately through one of these channels:

- **GitHub Private Vulnerability Reporting** (recommended): the **Security → Report a vulnerability**
  tab on the repository. It is private and visible only to maintainers.
- **Email:** cgomezfandino@gmail.com

We will try to respond within a reasonable timeframe (best-effort; this is an open-source project
maintained by one person). Please include reproduction steps and the expected impact.

## Supported versions

Security support is provided only for the `main` branch (and the latest published release). Earlier
versions do not receive patches.

## Security model (local-first)

Voxnote is designed to run **100% locally**. Keep in mind:

- **The API listens on `127.0.0.1` by default.** Do not expose it to `0.0.0.0` or to a shared public/Wi-Fi
  network without first adding authentication (token auth is on the roadmap, Phase 0.5).
- **`output_dir` holds your transcriptions, audio, and notes.** Keep it in a private location; files are
  created with `0o600` permissions and the audio directory with `0o700`.
- **Never commit your `.env`** or provider keys (HuggingFace, OpenAI, Google) to the repository. Use
  `.env.example` as a template. If you leak a key, **revoke and rotate it immediately**.
- **Third-party models:** diarization downloads models from HuggingFace (gated). They are loaded with
  `torch.load`; use only checkpoints from sources you trust.

## Best practices for operators

- Rotate LLM provider keys periodically.
- Keep dependencies up to date (Dependabot is active in this repo).
- Do not process sensitive audio with cloud providers (OpenAI/Google) if you need total privacy;
  use local Ollama instead.

## Known incidents

- **HuggingFace token leaked via `.env.example` (Feb 2026).** A real HuggingFace access token was
  committed to `.env.example` in commit `d1213d8` (2026-02-10) instead of a placeholder, and removed
  in commit `5492eee` (2026-02-12). Although it no longer appears at `HEAD`, it remains recoverable
  from the public git history. **The token was rotated/revoked at huggingface.co/settings/tokens.**
  Note: rewriting public history does not undo exposure (automated scrapers had already captured it),
  so rotation is the effective mitigation, not history rewriting. `.env` (the live secrets file) was
  never committed. Lesson reinforced below.

## If you leak a key

1. **Revoke and rotate it at the provider first** (HuggingFace, OpenAI, Anthropic, Google, Ollama
   Cloud). This is the only action that actually closes the risk — a leaked key must be treated as
   compromised forever, even after it is removed from history.
2. Then remove it from the current code (`HEAD`) and audit where else it may be referenced.
3. Consider rewriting history only for hygiene; do **not** treat it as a substitute for rotation.
