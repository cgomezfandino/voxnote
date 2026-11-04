# Session Handoff — Voxnote Web

**Última actualización:** 2026-11-04
**Estado:** Migrado a TanStack Start en Cloudflare Workers, en producción en https://voxnote.cgomezfandino.workers.dev (proyecto Pages antiguo eliminado 2026-11-04)
**HEAD:** `9f7ca77` en `main` (limpio, sync con `origin/main`)
**Auto-deploy:** GitHub Action `.github/workflows/deploy-web.yml` → `wrangler deploy -c dist/server/wrangler.json` en cada push a `main` que toque `packages/web/`

Documento para retomar el trabajo en una futura sesión sin rediscover el contexto.

## Entorno local (máquina de Carlos, 2026-11-04)

| Pieza | Valor |
|-------|--------|
| Repo | `/Volumes/SSDCX9/repos/voxnote` (ya en la SSD) |
| Remote | `https://github.com/cgomezfandino/voxnote.git` |
| Node / npm | v25.5.0 / 11.8.0 |
| Dev web | `cd packages/web && npm run dev` → :3001 (Vite + runtime Workers) |
| Worker construido (verificación) | `cd packages/web && npx wrangler dev -c dist/server/wrangler.json --port 4173` |
| Versión web | `0.5.0` (`packages/web/package.json`) |
| Python | 3.11.14 (`/opt/homebrew/bin/python3.11`) — **no usar 3.14** |
| CI / Deploy | verdes en el último push (`Deploy Web` 50s, `CI` Web + Python) |

## Arquitectura actual (post-migración 2026-11-04)

TanStack Start (React 19 + Vite) en **Cloudflare Workers**. El Worker solo sirve el
shell + la ruta de servidor `src/routes/api/ollama/chat/completions.ts` (proxy CORS
endurecido: allowlist de orígenes, tope 128 KB, timeout 60 s, sin logs de clave/cuerpo).
Todo el ML sigue en el navegador; el Worker nunca recibe audio, transcripciones ni claves.

- Transcripción: Whisper en Web Worker (transformers.js 4.2.0 **fijado exacto**),
  desde Hugging Face a revisión SHA fijada, caché `transformers-cache`, WebGPU con
  preflight de adapter → WASM (fp32 en modelos pequeños; **Turbo q8 requiere WebGPU**).
- Insights: BYO-key a 6 proveedores + **Chrome built-in AI (Gemini Nano, local)**.
  Campo de modelo de **texto libre con sugerencias** por proveedor
  (incluye `glm-4.7-flash` y `gemini-3.5-flash-lite`).
- UI: tema **blanco por defecto**, oscuro suave opt-in, navbar fijo, logo SVG nuevo
  + `voxnote` en minúsculas, flujo guiado en 4 pasos, Settings con “Before you start”.
- Borrador persistente: audio + transcripción + edición + insights + nota viven en
  contexto global y en IndexedDB (store `drafts`, DB v2) — navegar o recargar no
  pierde trabajo.
- Seguridad: CSP estricta con **nonce por petición** (sin `unsafe-inline`), COOP/COEP,
  claves con modo “solo sesión” + borrado total, enlaces de notas saneados, allowlist
  estricta de modelos.

## Verificado hoy (Chrome real + curl/Node)

- App servida por el Worker: `/`, `/notes`, `/settings` 200, proxy rechaza sin auth
  (401) y cuerpo gigante (413).
- Transcripción end-to-end (audio español, modelo base): texto correcto; **0
  peticiones a Hugging Face** en segunda pasada; etiqueta honesta
  “Loading model from this device…” vs “Downloading model…”.
- Notas (lista, búsqueda, detalle), Settings (Before-you-start, descarga, claves),
  borrador sobrevive a Settings + reload con banner de restauración.
- Gemini: esquema convertido validado contra la API real (antes daba
  `Unknown name "additionalProperties"`; ahora solo error de clave falsa).
- `npm run build`, `lint` limpios; `npm audit` **0 vulnerabilidades**;
  `wrangler deploy --dry-run` OK.

## Decisiones nuevas (2026-11-04, no repetir el descubrimiento)

1. **transformers fijado a 4.2.0.** `audit fix` lo subió a 4.3.2 y su WASM de ONNX
   (25,6 MiB) supera el límite de 25 MiB por asset de Workers → el deploy fallaría.
   No subir sin resolver ese tamaño primero.
2. **dtype por dispositivo.** q8 en WASM falla al crear sesión
   (“TransposeDQWeightsForMatMulNBits Missing required scale”); en WASM los modelos
   pequeños usan fp32. Turbo conserva q8 porque su fp32 supera 2 GB.
3. **WebGPU solo con adapter real.** `navigator.gpu` existente no basta; se hace
   preflight de `requestAdapter()` y si falla se va directo a WASM.
4. **transformers.js reporta progreso 0–99% también leyendo de caché.** El worker
   comprueba por archivo si está en caché y la UI lo rotula en consecuencia.
5. **Gemini rechaza `additionalProperties`.** `toGoogleSchema()` lo elimina
   recursivamente solo para Google; OpenAI/Anthropic conservan el esquema original.
6. **CSP sin unsafe-inline gracias al nonce.** TanStack inyecta scripts inline del
   stream; van con nonce por request (`getGlobalStartContext().nonce` →
   `router ssr.nonce` → meta `csp-nonce`) y la CSP del middleware lo refleja.
7. **Thr phases de publish se mantienen** (plan original cumplido en 1 solo día de
   trabajo; ver COMMITS abajo).

## COMMITS (todos en main)

- `bdba3b4` feat(web): migrate to TanStack Start on Cloudflare Workers
- `6afbb69` docs: session handoff + runbook SSD
- `9f7ca77` fix(web): resolve all Dependabot vulnerabilities (npm audit 0)

## Pendiente

- **Corte de producción:** hecho 2026-11-04 — proyecto Pages `voxnote` eliminado,
  producción = https://voxnote.cgomezfandino.workers.dev. Sin rollback de Pages;
  ante un problema se revierte el Worker con `wrangler rollback`.
- **CLAUDE.md desactualizado:** sigue describiendo Next.js + Pages + paths viejos
  (whisper “q8 string”, COOP/COEP en `_headers`, proxy en `functions/`, comandos).
  Reescribir la sección web antes de que confunda a la próxima sesión.
- `public/favicon.ico` viejo y generico; el lockup usa `logo.svg` + `icon-*.png`.
- Diarización en navegador, búsqueda semántica, live transcription (ver roadmap).
- La lista web de alertas Dependabot tarda en reflejar cierres (todas constan
  `fixed` en la API).

## Cómo deployar

### Automático
Cada push a `main` que toque `packages/web/` dispara el Action, que hace
`npm ci && lint && build` y `wrangler deploy -c dist/server/wrangler.json`.

### Manual
```bash
cd packages/web
npm run build
npx wrangler deploy -c dist/server/wrangler.json
```

## Cómo debuggear transcripción

```bash
# Worker local sobre el build real:
cd packages/web && npx wrangler dev -c dist/server/wrangler.json --port 4173

# Verificación rápida de rutas y proxy:
curl -s -o /dev/null -w "root %{http_code}\n" http://localhost:4173/
curl -s -X POST http://localhost:4173/api/ollama/chat/completions -d '{}' -w "\nnoauth %{http_code}\n"

# Caché del modelo en el navegador (DevTools o CDP):
# caches.keys() → debe incluir "transformers-cache"; sus keys contienen el SHA fijado.
```

## Gotchas que mordieron hoy

1. **macOS no tiene `setsid`**: los dev servers viven solo durante la sesión; el
   handoff al usuario es comando + URL, nunca “proceso persistente”.
2. **Vite preview no sirve SSR**: para probar el build de producción se usa
   `wrangler dev -c dist/server/wrangler.json`, nunca `vite preview`.
3. **HEADless + `--dump-dom` congela promesas de storage** (efecto confundido con
   bug real): verificar IndexedDB/Cache con CDP (`Runtime.evaluate` + sleep real).
4. **Dev server de Vite no recarga `wrangler dev`**: tras cada build hay que
   reiniciar el Worker.
5. **py + `py` vs `python3`**: tests/vendoring usan python3 del sistema en esta
   máquina para scripts auxiliares; el proyecto Python sigue en 3.11.
