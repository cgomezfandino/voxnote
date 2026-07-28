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
