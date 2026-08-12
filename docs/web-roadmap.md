# Voxnote Web — Roadmap de oportunidades (2025-2026)

Investigación profunda sobre tecnologías y modelos para mejorar la versión web de
Voxnote (IA 100% en navegador, desplegada en Cloudflare Pages). Cada item rankeado por
**esfuerzo** vs **impacto** para el stack actual (Next.js 15.5 static export,
transformers.js v4.2, Web Worker Whisper turbo/small/base, BYO-key LLM).

---

## ✅ Completado (sesión 2026-08-10/12)

| Item | Estado | Notas |
|------|--------|-------|
| **#1 Distil-Whisper** | ✅ Probado y **descartado** | q8 roto para no-inglés; eliminado del catálogo |
| **#2 Moonshine** | ✅ Integrado | Opción English-only (~100 MB) |
| **#3 Structured outputs nativos** | ✅ Hecho | OpenAI json_schema strict + Gemini responseSchema + Anthropic tool-use |
| **#4 PWA (Serwist)** | ✅ Hecho | Network-first SW, instalable, offline |
| **#5 WebLLM** | ⏸ Pospuesto | Calidad sub-4B insuficiente para structured output |
| **#8c Z.ai + Kimi** | ✅ Hecho | Ambos OpenAI-compatible, CORS directo |
| **#8b Ollama Cloud** | ✅ Hecho | Vía proxy (Pages Function), modelos gratuitos first |
| Título temático + timestamp | ✅ Hecho | LLM genera título de 3-6 palabras |
| Export-all ZIP + clear | ✅ Hecho | IndexedDB → ZIP |
| Insights en idioma config | ✅ Hecho | Ya no siempre en inglés |

---


---

## Diarización de hablantes (¿cómo reemplazar pyannote en el navegador?)

**Estado:** NO hay reemplazo drop-in open-source hoy. El backend Python la sigue
ofreciendo; la web no.

| Tier | Opción | Esfuerzo | Calidad |
|------|--------|----------|---------|
| 🥇 1 | Detección de turnos (`onnx-community/pyannote-segmentation-3.0`) | ~1 día | IDs no globalmente consistentes; sirve para "varias voces en este segmento" |
| 🥈 2 | Pipeline real: segmentación + ECAPA-TDNN (`vedk00/ecapa-voxceleb-speaker-embedding-onnx`) + clustering JS | ~1-2 sem | Equivalente a whisperX; nadie lo ha empaquetado para navegador aún |
| 🥉 3 | Picovoice Falcon Web SDK (comercial) | ~1 día | Producción, pero propietario + licencia |
| 4 | Build WASM propia de sherpa-onnx | alto | Mejor open-source, requiere expertise emscripten |

**Hallazgos críticos:**
- El demo "Xenova/whisper-speaker-diarization" es **solo segmentación** (IDs no fiables).
- Whisper **no tiene diarización nativa** en ninguna versión; whisperX acopla un modelo aparte por timestamps.
- pyannote no exporta limpio a ONNX porque mete `torchaudio`/Kaldi fbank en el grafo ([pyannote-audio #1929](https://github.com/pyannote/pyannote-audio/discussions/1929)) → por eso Tier 2 exige calcular el filterbank en JS.

---

## Modelos y tecnologías nuevas (rank por impacto/esfuerzo)

### 🥇 TIER 1 — Alta impacto, shippable ya

**1. Distil-Whisper Large v3.5 (ONNX)** — mismo formato, ~1.5× más rápido, ~49% más pequeño.
- Modelo: `onnx-community/distil-large-v3.5-ONNX`. Solo cambiar el ID en el catálogo.
- **La jugada de menor esfuerzo y mayor ganancia inmediata.**

**2. Moonshine (Tiny 27M / Base 61M)** — English-only, tiempo real.
- Modelos: `onnx-community/moonshine-tiny-ONNX`, `onnx-community/moonshine-base-ONNX`.
- Único candidato real para transcripción en vivo (futura feature streaming).

**3. Structured outputs nativos (OpenAI/Gemini)** en vez de "only JSON" por prompt.
- OpenAI: `response_format: { type: "json_schema", json_schema, strict: true }` (decodificación restringida a nivel token).
- Gemini: `response_schema`. Anthropic: tool-use emulation.
- **Mata el bug de fiabilidad más grande** del flujo BYO-key (JSON malformado rompe el export Obsidian).

**4. PWA + offline con Serwist** (`@serwist/next`, sucesor mantenido de next-pwa).
- App instalable + cache del shell estático. El modelo ya se cachea vía transformers.js → app 100% offline (transcripción).
- Recomendado oficialmente por la guía PWA de Next.js.

### 🥈 TIER 2 — Alta impacto, más esfuerzo/tradeoffs

**5. WebLLM para insights 100% offline** (`@mlc-ai/web-llm`).
- Modelos: Qwen2.5-1.5B-Instruct (`struct-q4f16_1-MLC`), Llama-3.2-1B, Phi-3.5-mini.
- JSON mode con decodificación gramatical en WASM (no prompt-hack). ~25-35 tok/s en M2.
- Calidad de structured output en sub-4B notablemente menor que GPT-4o → **tier opcional, no reemplazo** del BYO-key.

**6. Búsqueda semántica en el historial con Orama** (`@orama/orama` ~2KB + plugin-embeddings).
- Embeddings con `Xenova/all-MiniLM-L6-v2` (~23MB) vía transformers.js. Híbrida full-text + vector.

**7. Transcripción streaming/live** (AudioWorklet + chunks WebGPU). Fídido pero farragoso (overlap de chunks, transformers.js #802). Priorizar solo si live captioning es objetivo.

### 🥉 TIER 3 — Cloudflare (introducen backend opcional)

**8. Workers AI como LLM/STT "sin API key"** — onboarding sin fricción.
- `@cf/openai/whisper` ($0.00045/min audio), Llama-3.2-3B, Gemma. 10k Neurons gratis/día.
- Trade-off: introduces un Worker (dejas de ser 100% estático) + asumes coste por usuario.

**8b. Ollama Cloud vía proxy** — la API de Ollama Cloud (`https://ollama.com/v1/chat/completions`)
  es OpenAI-compatible y Bearer-auth, **pero CORS bloqueada** (preflight devuelve 405 sin
  `Access-Control-Allow-Origin`). Para usarla desde la web hace falta un Cloudflare Worker
  que actúe de same-origin proxy con la key del usuario. Modelos cloud actuales: glm-5.2,
  deepseek-v4-pro, kimi-k3, gpt-oss:120b, etc. (lista pública en `ollama.com/api/tags`).
  Pospuesta hasta que se decida añadir un Worker.

**8c. Proveedores OpenAI-compatible ya integrados** — Z.ai (`api.z.ai/api/paas/v4`, modelos
  GLM-4.6) y Kimi/Moonshot (`api.moonshot.ai/v1`, kimi-k2.6) funcionan directo del navegador
  (CORS habilitado, Bearer auth). Añadir más en el futuro es una línea en `OPENAI_COMPATIBLE`.

**9. R2 para sync opcional de notas** — egress $0, $0.015/GB-mes. Multi-dispositivo barato.

### TIER 4 — Vigilar, no adoptar

- **WebNN** (NPU vía ONNX Runtime Web) — cobertura pequeña hoy, relevante en 1-2 años.
- **Parakeet TDT 0.6B** — supera a Whisper pero sin build onnx-community oficial.
- **TranslateGemma 4B** — traducción offline, ~2-4GB. Niche.
- **Audio: opus-media-recorder + AudioWorklet** — solo si se hace live mode o iOS es target.

> Vapor descartado: Canary-1B (sin path WebGPU), "Nimbus", Seamless M4T (sin build navegador mantenido, superado por TranslateGemma).

---

## Roadmap recomendado

1. **Ahora (bajo esfuerzo, alto valor):** Distil-Large-v3.5 (#1), structured outputs OpenAI/Gemini (#3), Serwist PWA (#4). Moonshine para modo rápido EN (#2).
2. **Próximo trimestre:** Orama búsqueda semántica (#6), R2 sync (#9).
3. **Apuesta estratégica (según dirección del producto):** WebLLM insights offline (#5) y/o Workers AI "easy mode" (#8).
4. **Retener/vigilar:** live streaming (#7), WebNN (#10), Parakeet (#11), TranslateGemma (#12).

**Realidad:** las dos jugadas de mayor palanca son las más aburridas — Distil-Large-v3.5 (velocidad/tamaño gratis) y structured outputs nativos (matan el bug de fiabilidad nº1). El resto es estratégico/opcional. El "100% offline incluyendo insights" (WebLLM) es real pero la calidad de structured output sub-4B lo hace un *tier*, no un *reemplazo*, del BYO-key.
