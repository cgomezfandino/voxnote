# Multi-Provider Setup — Voxnote

Voxnote supports multiple LLM providers for insight extraction. You can use local Ollama (free) or commercial APIs (OpenAI, Google Gemini).

## Available providers

| Provider | Description | Advantages | Requires API key |
|----------|-------------|------------|------------------|
| **ollama** | Local LLM (Llama, Mistral, etc.) | ✅ Free<br>✅ 100% private<br>✅ No limits | ❌ No |
| **openai** | OpenAI (GPT-4, GPT-3.5) | ✅ High quality<br>✅ Native JSON mode | ✅ Yes |
| **google** | Google Gemini | ✅ Very long context<br>✅ Multimodal | ✅ Yes |

---

## Configuration per provider

### 1. Ollama (default)

```bash
# Make sure Ollama is running
ollama serve &

# Download the model (if you don't already have it)
ollama pull llama3.1:8b
```

Configuration in `.env`:

```bash
VOXNOTE_LLM_PROVIDER=ollama
VOXNOTE_OLLAMA_MODEL=llama3.1:8b
VOXNOTE_OLLAMA_URL=http://localhost:11434
```

### 2. OpenAI

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."
```

Configuration in `.env`:

```bash
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Optional: change the model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o
```

Get your API key at: https://platform.openai.com/api-keys

### 3. Google Gemini

```bash
export GOOGLE_API_KEY="..."
```

Configuration in `.env`:

```bash
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...

# Optional: change the model (default: gemini-2.0-flash)
GOOGLE_MODEL=gemini-pro
```

Get your API key at: https://makersuite.google.com/app/apikey

---

## Usage

### CLI

Switch the provider using the `VOXNOTE_LLM_PROVIDER` variable:

```bash
# Ollama (default)
voxnote process recordings/reunion.wav

# OpenAI
VOXNOTE_LLM_PROVIDER=openai voxnote process recordings/reunion.wav

# Google
VOXNOTE_LLM_PROVIDER=google voxnote process recordings/reunion.wav
```

### .env file

Set it permanently in `.env`:

```bash
# Copy the example file
cp .env.example .env

# Edit and change:
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### API

Include the `provider` field in your requests:

```bash
curl -X POST "http://127.0.0.1:8003/api/insights" \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "provider": "openai"}'
```

### Web interface

The UI includes a provider selector in the Connection panel. Choose the one you want to use before processing.

---

## Cost comparison (estimated)

Based on a 30-minute meeting (~5000 words of transcription):

| Provider | Approx. cost | Tokens | Latency |
|----------|--------------|--------|---------|
| Ollama | $0 (free) | N/A | ~10-30s (local) |
| OpenAI (gpt-4o-mini) | ~$0.01 | ~6K tokens | ~5-10s |
| OpenAI (gpt-4o) | ~$0.10 | ~6K tokens | ~10-20s |
| Google (gemini-2.0-flash) | $0 (free with limits) | ~6K tokens | ~5-10s |

> **Note**: Costs are approximate. Verify current pricing with each provider.

---

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable not set"

Make sure you export the API key:

```bash
export OPENAI_API_KEY="sk-..."
```

Or add it to your `.env`:

```bash
OPENAI_API_KEY=sk-...
```

### Error: "Unknown provider 'xxx'"

Check the provider name. Valid options: `ollama`, `openai`, `google`.

### Ollama connection refused

Make sure Ollama is running:

```bash
ollama serve &
curl http://localhost:11434/api/tags
```

### Invalid API key

Verify that the API key is correct and has not expired. Each provider shows its status on its dashboard.

---

## Recommendations

| Scenario | Recommended provider |
|-----------|----------------------|
| **Development/testing** | `ollama` (free, unlimited) |
| **Production/best quality** | `openai` (gpt-4o-mini or gpt-4o) |
| **Maximum privacy** | `ollama` (100% local) |
| **Very long context** (>1 hour) | `google` (gemini-2.0-flash) |
| **Spanish** | All providers work well in Spanish |
