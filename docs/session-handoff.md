# Session Handoff — Voxnote Web

**Última actualización:** 2026-08-14
**Estado:** Producción funcional en https://voxnote.pages.dev
**Auto-deploy:** GitHub Action `.github/workflows/deploy-web.yml` (wrangler, en cada push a `main` que toque `packages/web/` o `functions/`)

Documento para retomar el trabajo en una futura sesión sin rediscover el contexto.

---

## Estado actual

### ✅ Funciona (verificado)
- **Transcripción** Whisper en navegador (turbo q8, multilingüe). Modelo se descarga una
  vez (~1 GB) y se cachea en Cache API. Funciona offline tras la primera descarga.
  **Verificado 2026-08-14 con audio real en producción** (modelo base, 20s, WebGPU).
- **Caché del modelo verificado empíricamente**: tras recargar la página, la segunda
  transcripción hace **0 peticiones a Hugging Face** (0 MB) y produce texto idéntico.
  El modelo vive en Cache API (`transformers-cache`) — una descarga por modelo y navegador.
- **Auditoría UI/UX completa 2026-08-14** (Chrome real, producción): tema dark/light,
  tabs, estados vacíos, sidebar móvil, selectores, campo API key enmascarado — sin
  errores de consola. Descargas .md/.docx/.zip verificadas con archivos válidos.
- **6 proveedores de insights**: OpenAI, Google Gemini, Anthropic, Z.ai (GLM), Kimi
  (Moonshot), Ollama Cloud. Todos con BYO API key (localStorage).
- **Structured outputs nativos**: OpenAI (json_schema strict + fallback), Gemini
  (responseSchema), Anthropic (forced tool-use), OpenAI-compatible (json_object).
- **Notas**: generación Markdown (Obsidian-compatible) + export .docx, todo en el cliente.
- **Historial**: IndexedDB, con títulos temáticos + timestamp. Export-all a ZIP.
- **PWA**: instalable, service worker network-first (JS siempre actualizado).
- **Ollama Cloud proxy**: Cloudflare Pages Function en `/api/ollama/chat/completions`
  (necesario porque Ollama bloquea CORS). Modelos gratuitos: gemma4:31b (default),
  gpt-oss:120b/20b, nemotron-3-nano:30b, minimax-m3.
- **Despliegue**: Cloudflare Pages, `main` branch, headers COOP/COEP (crossOriginIsolated).

### ⚠️ No verificado por el usuario (sí verificado por mí con curl/Node)
- El flujo **insights con API key real** no se ha probado end-to-end (requiere key del
  usuario). La transcripción, descargas y caché sí están verificados en producción.

### ❌ Pendiente / no hecho
- **Diarización de hablantes** en el navegador (Tier 2 del roadmap — 1-2 semanas).
- **Búsqueda semántica** en el historial (Orama).
- **WebLLM** para insights 100% offline sin API key.
- **8 vulnerabilidades Dependabot** en el branch default (backend Python, no web).
- **Reintentar hash-CSP** cuando los navegadores arreglen el soporte de hashes para
  scripts inline (ver decisión 9 abajo — permitiría quitar 'unsafe-inline').

---

## Decisiones técnicas importantes (y por qué)

### 1. Whisper dtype debe ser un STRING `"q8"`, no un objeto
transformers.js busca dtypes por **session key** (`"model"`, `"decoder_model_merged"`), no
por rol (`"encoder"`/`"decoder"`). Si pasas `{ encoder: "q8" }`, la clave no coincide → cae
al default del dispositivo → fp32 en WebGPU → carga `encoder_model.onnx_data` (>2GB) →
error `Module.MountedFiles is not available` (onnxruntime-web no puede montar external data,
issue microsoft/onnxruntime#19752 cerrado sin fix). **Usar siempre dtype string.**

### 2. Distil-Whisper fue eliminado
Distil q8 devuelve texto vacío para español/idiomas no-inglés. Mismo tamaño de descarga
que Turbo (~1 GB) que sí funciona multilingüe. Moonshine ya cubre "inglés rápido y pequeño"
(~100 MB). Distil no aportaba valor único.

### 3. fp16 descartado para Whisper
Bug de precisión conocido en WebGPU para el encoder de Whisper (transformers.js #1590).
q8 (8-bit quantized) es la opción segura: single-file, sin bug de precisión, calidad casi
idéntica a fp32.

### 4. Service Worker network-first
El precache del SW causaba que los usuarios vieran JS viejo tras cada deploy (tuvimos que
limpiar site data repetidamente). Cambiado a network-first para JS/HTML → siempre busca la
versión nueva del servidor. Los assets son content-hashed, sin riesgo de partial updates.

### 5. Ollama Cloud requiere proxy (CORS bloqueado)
Ollama Cloud no envía `Access-Control-Allow-Origin` → browser bloquea el fetch directo.
Solución: Cloudflare Pages Function en `/api/ollama/chat/completions` que reenvía con la
key del usuario (Bearer, nunca almacenada). Es la **única pieza server-side** de la app.

### 6. Modelos de Ollama Cloud: cuidado con el tier
Muchos modelos (glm-5.2, deepseek-v4-pro, kimi-k3, qwen3.5, mistral-large-3) requieren
**suscripción de pago**. Los gratuitos son: gemma4:31b, gpt-oss:120b/20b,
nemotron-3-nano:30b, minimax-m3. Verificado empíricamente con una key real.

### 7. Almacenamiento: solo export/download
Decisión de producto: **sin sync multi-dispositivo ni backend de datos**. Cada navegador
es una isla. Las notas viven en IndexedDB y se exportan al SO (ZIP o individual). Coherente
con la promesa "100% privado". Ver `docs/web-roadmap.md` sección persistencia.

### 8. CSP: blob: obligatorio; hash-CSP roto en navegadores actuales (2026-08-14)
La CSP de `public/_headers` necesita **`blob:` en `script-src`** porque onnxruntime-web
(WebGPU) importa dinámicamente su bundle .mjs desde una URL `blob:` — sin ello TODA
transcripción falla con "no available backend found". También **`blob:` en
`connect-src`** porque WaveSurfer hace `fetch()` del audio grabado (URL blob:).

El `script-src` usa `'unsafe-inline'` (los scripts inline del Flight payload de Next.js
App Router deben ejecutarse). Se intentó allowlisting por hash sha256 generado en
post-build y **no funciona**: verificado en Chrome 151 stable y WebKit 26.5 que un
script inline con hash CORRECTO sigue bloqueado (los nonces sí funcionan, pero un
static export no puede generarlos por-request; además algunos hashes se marcan
"invalid source" sin causa aparente). La protección real anti-exfiltración es el
`connect-src` estricto (solo proveedores LLM + Hugging Face). Revisar si los
navegadores arreglan los hashes.

Historia del bug: el commit bdcecbc añadió la CSP con un hash manual que caducó al
reconstruir → la web servía HTML en blanco (scripts Flight bloqueados) y la
transcripción fallaba (blob: bloqueado). Arreglado en a63d226 + fcd8d8d.

### 9. Worker: fallback WebGPU → WASM
El worker de transcripción intenta WebGPU primero y, si el pipeline falla al
inicializar (sin adapter, driver blocklist, CSP vieja), reintenta con WASM en vez de
fallar toda la transcripción. La elección de dispositivo es estable por navegador,
así que el caché en memoria del worker va keyed solo por model id.

---

## Cómo deployar

### Automático (recomendado — ya configurado)

Cada `git push` a `main` que toque `packages/web/` o `functions/` dispara el GitHub Action
`.github/workflows/deploy-web.yml`, que construye y despliega con wrangler. **No hay que
hacer nada manual.**

El Action usa los secrets `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (ya configurados
en GitHub). La integración Git nativa de Cloudflare está **desactivada** porque no detecta
las Pages Functions en un monorepo.

### Manual (fallback)

```bash
# Desde la RAÍZ del repo (no desde packages/web), para que wrangler encuentre functions/
npm --prefix packages/web run build
npx wrangler pages deploy packages/web/out --project-name voxnote --branch main
```

**Importante:** `functions/` está en la raíz del repo, NO en `packages/web/functions/`.
Wrangler la detecta cuando se ejecuta desde la raíz. Si se ejecuta desde `packages/web/`,
no la encuentra y el proxy de Ollama no se despliega.

---

## Cómo debuggear transcripción

```bash
# Test rápido con audio real (Node, replica el pipeline exacto del worker):
cd packages/web
# Crear script temporal que use @huggingface/transformers con dtype "q8"
# Ver historial de commits para ejemplos (test-transcribe.mjs, test-e2e.mjs — borrados
# pero recuperables del git history)

# Verificar el proxy de Ollama:
OLLAMA_KEY=<key>
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "https://voxnote.pages.dev/api/ollama/chat/completions" \
  -H "Authorization: Bearer $OLLAMA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma4:31b","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'

# Verificar qué modelo default tiene el deploy:
PAGE=$(curl -s https://voxnote.pages.dev/ | grep -oE 'page-[a-f0-9]+\.js' | head -1)
curl -s "https://voxnote.pages.dev/_next/static/chunks/app/$PAGE" | grep -oE 'ollama_model:"[^"]*"'

# Verificar headers COOP/COEP:
curl -sI https://voxnote.pages.dev/ | grep -i cross-origin
```

---

## Modelo de datos (tipos clave)

```
src/types/index.ts:
- AppConfig: whisper_model, language, llm_provider, *_model, api_key_*
- InsightsResult: title, summary, participants?, key_points?, decisions, action_items,
                  insights, highlights?, open_questions, next_steps
- TranscriptionResult: text, segments[], has_speakers, audio_filename?
- NoteListItem: filename, created_at, preview, size_bytes, title
```

---

## Roadmap priorizado (ver docs/web-roadmap.md para detalle)

| Prioridad | Feature | Esfuerzo | Estado |
|-----------|---------|----------|--------|
| 🔴 Alta | Diarización de hablantes (Tier 2) | 1-2 sem | No empezado — diferenciador clave |
| 🟡 Media | Búsqueda semántica (Orama) | ~1 día | No empezado |
| 🟡 Media | Conectar CF↔GitHub auto-deploy | 5 min | Pendiente (acción del usuario) |
| 🟢 Baja | WebLLM (insights offline) | Alto | No empezado — calidad sub-4B limitada |
| 🟢 Baja | Live/streaming transcription | Alto | No empezado |

---

## Gotchas y cosas que mordieron

1. **`functions/api/ollama.ts` vs `functions/api/ollama/chat/completions.ts`**: la app llama
   a `/api/ollama/chat/completions` (callOpenAICompatible añade `/chat/completions`). La
   función debe estar en la ruta exacta. El catch-all `[[...path]]` NO funciona en
   `wrangler pages deploy` (error "invalid catchall route parameter").
2. **AudioRecorder produce WebM**, no WAV, a pesar del `type: "audio/wav"` del Blob.
   `decodeAudioData` lo maneja, pero el usuario puede descargar archivos `.wav` que son
   WebM por dentro.
3. **macOS bloquea ~/Downloads** desde procesos automatizados. Para testear audio del
   usuario, pedir que lo copie al repo o a un volumen accesible.
4. **transformers.js progress ya es 0-100** (no 0-1 como asumí inicialmente).
5. **Anthropic requiere header** `anthropic-dangerous-direct-browser-access: true` para CORS.
6. **Serwist `defaultCache`** incluye estrategias para rutas SSR/RSC que no existen en un
   static export — usar runtime caching explícito, no defaultCache.

---

## Auditoría de seguridad (2026-08-12)

### Arreglado

| Hallazgo | Severidad | Fix |
|----------|-----------|-----|
| **Content-Security-Policy ausente** | Media | Añadida en `public/_headers`: restringe connect-src a los 6 providers + HuggingFace CDN, bloquea XSS exfiltration de keys en localStorage |
| **postcss 8.4.31 vulnerable** (3 high: path traversal, file disclosure) | Alta | npm override `"$postcss"` fuerza 8.5.26 en todo el árbol (Next.js incluido) |
| **Google API key en query string** | Info | Movida a header `x-goog-api-key` (no aparece en logs/proxy) |
| **Ollama proxy CORS `Allow-Origin: *`** | Media | Restringido al origen de la app (voxnote.pages.dev + previews); sitios terceros no pueden usarlo de relay |
| **UI "never to our servers" falso para Ollama** | Baja | Texto honesto: aclara que la key pasa por el proxy (sin almacenarse) |

### Riesgo aceptado (sin vector de ataque real)

| Dependencia | Severidad | Por qué es aceptable |
|-------------|-----------|---------------------|
| **sharp** <0.35 (libvips CVEs) | Alta | Image optimization deshabilitada (`images: { unoptimized: true }`); sharp no se usa en runtime |
| **adm-zip** <0.6 (4GB alloc) | Alta | Solo procesa ZIPs de huggingface.co (fuente confiable); requiere attacker-controlled ZIP |
| **nanoid** (loop en size=0) | Alta | Usado para IDs en build tooling; las libs no usan custom generators con size=0 |
| **Prompt injection** del transcript | Media (inherente) | Mitigado con delimiter wrapping + JSON schema estricto + render seguro; blast radius limitado a insights garbage |

**Nota:** sharp, adm-zip y nanoid son dependencias transitivas de `@huggingface/transformers` que no se pueden parchear sin que la librería actualice sus deps. Revisar periódicamente si `@huggingface/transformers` publica una versión con deps actualizadas.

### XSS: seguro por defecto
react-markdown no renderiza HTML crudo (no `rehype-raw`, no `allowDangerousHtml`). El transcript se renderiza como plain text. InsightsDisplay usa React children sin `dangerouslySetInnerHTML`. El único `dangerouslySetInnerHTML` (layout.tsx theme script) es estático y hasheado en el CSP.

