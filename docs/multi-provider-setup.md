# Multi-Provider Setup — Voxnote

Voxnote soporta múltiples proveedores de LLM para la extracción de insights. Puedes usar Ollama local (gratis) o APIs comerciales (OpenAI, Kimi, GLM, Google Gemini).

## Proveedores disponibles

| Provider | Descripción | Ventajas | Requiere API key |
|----------|-------------|----------|------------------|
| **ollama** | LLM local (Llama, Mistral, etc.) | ✅ Gratis<br>✅ 100% privado<br>✅ Sin límites | ❌ No |
| **openai** | OpenAI (GPT-4, GPT-3.5) | ✅ Alta calidad<br>✅ JSON mode nativo | ✅ Sí |
| **kimi** | Moonshot AI (Kimi) | ✅ Contexto largo<br>✅ Buen español/chino | ✅ Sí |
| **glm** | Zhipu AI (GLM-4) | ✅ Chino nativo<br>✅ Buena calidad | ✅ Sí |
| **google** | Google Gemini | ✅ Contexto muy largo<br>✅ Multimodal | ✅ Sí |

---

## Instalación por provider

### 1. Ollama (default — ya instalado)

```bash
# Ya está instalado por defecto
# Solo asegúrate de que Ollama esté corriendo
ollama serve &
```

### 2. OpenAI

```bash
# Instalar SDK
pip install -e ".[openai]"

# Configurar API key
export OPENAI_API_KEY="sk-..."

# Opcional: cambiar modelo (default: gpt-4o-mini)
export OPENAI_MODEL="gpt-4o"
```

### 3. Kimi (Moonshot AI)

```bash
# Instalar SDK (usa OpenAI SDK)
pip install -e ".[kimi]"

# Configurar API key
export KIMI_API_KEY="sk-..."

# Opcional: cambiar modelo (default: moonshot-v1-8k)
export KIMI_MODEL="moonshot-v1-32k"
```

Obtén tu API key en: https://platform.moonshot.cn/

### 4. GLM (Zhipu AI)

```bash
# Instalar SDK
pip install -e ".[glm]"

# Configurar API key
export GLM_API_KEY="..."

# Opcional: cambiar modelo (default: glm-4)
export GLM_MODEL="glm-4-plus"
```

Obtén tu API key en: https://open.bigmodel.cn/

### 5. Google Gemini

```bash
# Instalar SDK
pip install -e ".[google]"

# Configurar API key
export GOOGLE_API_KEY="..."

# Opcional: cambiar modelo (default: gemini-2.0-flash-exp)
export GOOGLE_MODEL="gemini-pro"
```

Obtén tu API key en: https://makersuite.google.com/app/apikey

### Instalar todos los providers

```bash
pip install -e ".[all-providers]"
```

---

## Uso

### CLI

Cambia el provider con la variable `VOXNOTE_LLM_PROVIDER`:

```bash
# Ollama (default)
voxnote process recordings/reunion.wav

# OpenAI
VOXNOTE_LLM_PROVIDER=openai voxnote process recordings/reunion.wav

# Kimi
VOXNOTE_LLM_PROVIDER=kimi voxnote process recordings/reunion.wav

# GLM
VOXNOTE_LLM_PROVIDER=glm voxnote process recordings/reunion.wav

# Google
VOXNOTE_LLM_PROVIDER=google voxnote process recordings/reunion.wav
```

### .env

Configura permanentemente en `.env`:

```bash
# Copiar ejemplo
cp .env.example .env

# Editar y cambiar:
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### UI (Streamlit)

La UI tiene un selector de provider en el sidebar. Selecciona el que quieras usar antes de procesar.

```bash
voxnote-ui
```

---

## Comparación de costos (estimado)

Basado en una reunión de 30 minutos (~5000 palabras de transcripción):

| Provider | Costo aprox. | Tokens | Latencia |
|----------|--------------|--------|----------|
| Ollama | $0 (gratis) | N/A | ~10-30s (local) |
| OpenAI (gpt-4o-mini) | ~$0.01 | ~6K tokens | ~5-10s |
| OpenAI (gpt-4o) | ~$0.10 | ~6K tokens | ~10-20s |
| Kimi (moonshot-v1-8k) | ~¥0.05 | ~6K tokens | ~8-15s |
| GLM (glm-4) | ~¥0.10 | ~6K tokens | ~10-20s |
| Google (gemini-2.0-flash) | $0 (gratis con límites) | ~6K tokens | ~5-10s |

> **Nota**: Costos aproximados. Verifica precios actuales en cada proveedor.

---

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable not set"

Asegúrate de exportar la API key:

```bash
export OPENAI_API_KEY="sk-..."
```

O agrégala a tu `.env`:

```bash
OPENAI_API_KEY=sk-...
```

### Error: "openai package not installed"

Instala el provider:

```bash
pip install -e ".[openai]"
```

### Error: "Unknown provider 'xxx'"

Verifica el nombre del provider. Válidos: `ollama`, `openai`, `kimi`, `glm`, `google`.

### Ollama connection refused

Asegúrate de que Ollama esté corriendo:

```bash
ollama serve &
curl http://localhost:11434/api/tags
```

---

## Recomendaciones

- **Desarrollo/pruebas**: Usa `ollama` (gratis, ilimitado)
- **Producción/mejor calidad**: Usa `openai` (gpt-4o-mini o gpt-4o)
- **Privacidad máxima**: Usa `ollama` (100% local)
- **Contexto muy largo** (>1 hora): Usa `google` (gemini-2.0-flash) o `kimi` (moonshot-v1-128k)
- **Español/Chino**: Todos funcionan bien, pero `glm` y `kimi` son nativos en chino
