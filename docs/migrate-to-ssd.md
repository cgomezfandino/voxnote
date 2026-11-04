# Migración del repo a la SSD

**Fecha:** 2026-08-16
**Por qué:** el volumen de datos interno (`/System/Volumes/Data`) está al **97%** (~13 GB libres). El repo ocupa **~5 GB** en `~/repos/voxnote`. Los datos de uso (notas, audio, logs) ya viven en la SSD.

Este documento es el runbook para mañana. El estado del producto está en [`session-handoff.md`](session-handoff.md).

---

## Inventario actual (2026-08-16)

| Qué | Dónde ahora | Tamaño | ¿Va a la SSD? |
|-----|-------------|--------|----------------|
| Código (git) | `/Users/cgomezfandino/repos/voxnote` | 16 MB (`.git`) + fuente | **Sí — es el movimiento** |
| `.venv` (Python 3.11.14) | `…/voxnote/.venv` | 1.6 GB | **No copiar** — recrear |
| `packages/web/node_modules` | `…/packages/web/node_modules` | 2.9 GB | **No copiar** — `npm ci` |
| Build estático | `packages/web/out/` | 26 MB | Regenerable (`npm run build`) |
| `.env` (secrets locales) | raíz del repo | 3 KB | **Sí — copiar a mano** (no está en git) |
| Notas + audio CLI | `/Volumes/SSDCX9/data/Voxnote` | 4.6 MB (26 audios) | Ya está |
| Logs | `/Volumes/SSDCX9/data/Voxnote/logs` | 80 KB | Ya está |
| Caché HuggingFace | `~/.cache/huggingface` | 14 GB | Se queda en `$HOME` (no depende del repo) |
| Caché Whisper Python | `~/.cache/whisper` | 3.1 GB | Se queda en `$HOME` |
| Modelo Whisper web | Cache API del navegador (`transformers-cache`) | ~1 GB | Se queda en el browser |
| Notas web (IndexedDB) | Chrome/Safari del usuario | — | Se queda en el browser |
| Config web (API keys) | `localStorage` key `voxnote:config` | — | Se queda en el browser |

**Disco interno:** 460 GB, Data al 97%, ~13 GB libres.
**SSD:** `/Volumes/SSDCX9` — 1.8 TB, ~1.1 TB libres. Volumen APFS `SSDCX9` en disco externo.

---

## Destino recomendado

```
Código:  /Volumes/SSDCX9/repos/voxnote
Datos:   /Volumes/SSDCX9/data/Voxnote          ← no mover (ya está)
Logs:    /Volumes/SSDCX9/data/Voxnote/logs     ← no mover (ya está)
```

Crear `/Volumes/SSDCX9/repos/` si no existe. No mezclar el git con `data/Voxnote/` (ahí están las notas y el audio de uso).

Si prefieres otra ruta, sustituye `NEW` en los comandos de abajo. El resto del runbook no cambia.

---

## Qué sobrevive sin hacer nada

Estos **no** dependen de la ruta del repo:

- Remote git `origin` → `https://github.com/cgomezfandino/voxnote.git`
- Branch `main` @ `7f307ee` (limpio, al día con `origin/main`)
- CI (`.github/workflows/ci.yml`) y deploy (`.github/workflows/deploy-web.yml`)
- Secrets de GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Producción: https://voxnote.pages.dev
- Python 3.11 de Homebrew (`/opt/homebrew/bin/python3.11`)
- Node `v25.5.0` / npm `11.8.0`
- FFmpeg (`~/.local/bin/ffmpeg` 8.0)
- Ollama (`/usr/local/bin/ollama`)
- Cachés de modelos en `~/.cache/`
- Settings y notas de la web en el navegador

---

## Qué se rompe si solo copias la carpeta

1. **`.venv`** — los shebangs de `pip`, `voxnote`, etc. son
   `#!/Users/cgomezfandino/repos/voxnote/.venv/bin/python3.11`.
   Tras el move, `make` / `voxnote` fallan. Recrear el venv.
2. **`packages/web/node_modules`** — a veces tiene paths absolutos de native addons.
   Más barato y seguro: no copiarlo y correr `npm ci`.
3. **`.claude/launch.json`** — tenía paths absolutos al repo viejo.
   Actualizado el 2026-08-16 a paths relativos; si vuelves a generar uno, usa relativos.

El código commiteado **no** hardcodea `~/repos/voxnote`. El único path absoluto en git es el default de logs (`/Volumes/SSDCX9/data/Voxnote/logs` en `config.py` y el `Makefile`), que no cambia.

---

## Runbook (mañana)

Hazlo con la SSD montada. Comprueba antes: `ls /Volumes/SSDCX9`.

### 0. Snapshot de seguridad

```bash
cd /Users/cgomezfandino/repos/voxnote
git status          # tiene que salir clean
git log -1 --oneline
# Esperado: 7f307ee docs: session handoff updated…   (o un commit posterior si documentaste esto)
```

Si hay cambios sin commitear, commitéalos o `git stash`. No muevas un working tree sucio.

Copia de seguridad del `.env` (tiene tokens; no lo subas a git):

```bash
cp .env /Volumes/SSDCX9/tmp/voxnote.env.bak
chmod 600 /Volumes/SSDCX9/tmp/voxnote.env.bak
```

### 1. Clonar en la SSD (recomendado)

Más limpio que rsync: no arrastras `.venv`, `node_modules`, caches.

```bash
mkdir -p /Volumes/SSDCX9/repos
git clone https://github.com/cgomezfandino/voxnote.git /Volumes/SSDCX9/repos/voxnote
cd /Volumes/SSDCX9/repos/voxnote

# Secretos y config local (no están en git)
cp /Users/cgomezfandino/repos/voxnote/.env .
cp /Users/cgomezfandino/repos/voxnote/packages/web/.env.development packages/web/
# Opcional: planes/sesiones locales de agentes
mkdir -p .claude .zcode
cp /Users/cgomezfandino/repos/voxnote/.claude/settings.local.json .claude/ 2>/dev/null || true
cp /Users/cgomezfandino/repos/voxnote/.claude/launch.json .claude/ 2>/dev/null || true
```

Alternativa si quieres conservar historial local no pusheado (hoy no hay):

```bash
# rsync del árbol git sin dependencias regenerables
mkdir -p /Volumes/SSDCX9/repos
rsync -a --progress \
  --exclude '.venv' \
  --exclude 'packages/web/node_modules' \
  --exclude 'packages/web/.next' \
  --exclude 'packages/web/out' \
  --exclude '__pycache__' \
  --exclude '.mypy_cache' \
  --exclude '.ruff_cache' \
  --exclude '.pytest_cache' \
  /Users/cgomezfandino/repos/voxnote/ \
  /Volumes/SSDCX9/repos/voxnote/
```

### 2. Reinstalar dependencias

```bash
cd /Volumes/SSDCX9/repos/voxnote
make install
# crea .venv con python3.11, instala core+api, npm install en packages/web
```

Requisitos que ya tienes en esta máquina (no se mueven):

- Python **3.11** (no 3.14 — whisperX/diarización no soporta 3.13/3.14)
- Node ≥ 18.18
- FFmpeg
- Ollama (opcional, solo CLI local)

### 3. Verificar

```bash
# Python
source .venv/bin/activate
voxnote --help
make test-core
make test-api

# Web
cd packages/web && npm run lint && npm run build

# Dev local (API :8003 + Web :3003), logs siguen en la SSD
cd /Volumes/SSDCX9/repos/voxnote
make dev
```

Comprueba:

- [ ] `which voxnote` apunta al `.venv` **nuevo**
- [ ] `.env` tiene `VOXNOTE_OUTPUT_DIR=/Volumes/SSDCX9/data/Voxnote`
- [ ] `make logs` lista `/Volumes/SSDCX9/data/Voxnote/logs`
- [ ] Las notas/audio viejos siguen visibles (mismo `output_dir`)
- [ ] https://voxnote.pages.dev no se tocó (el move es solo local)

### 4. Abrir el proyecto desde la ruta nueva

En Cursor / Claude Code / Grok / VS Code: **File → Open Folder** →
`/Volumes/SSDCX9/repos/voxnote`.

No dejes las dos copias abiertas. El remote es el mismo; el riesgo es commitear en la vieja.

### 5. Symlink opcional (músculo memoria)

Si scripts o herramientas aún apuntan a `~/repos/voxnote`:

```bash
mv /Users/cgomezfandino/repos/voxnote /Users/cgomezfandino/repos/voxnote.bak
ln -s /Volumes/SSDCX9/repos/voxnote /Users/cgomezfandino/repos/voxnote
```

Cuando confirmes que todo va, borra el backup (libera ~5 GB en el disco interno):

```bash
rm -rf /Users/cgomezfandino/repos/voxnote.bak
# y el .env backup si ya no lo necesitas
rm -f /Volumes/SSDCX9/tmp/voxnote.env.bak
```

**No borres** `/Volumes/SSDCX9/data/Voxnote` — son las notas y el audio reales.

### 6. Si la SSD no está montada

El default de logs (`VOXNOTE_LOG_DIR`) apunta a `/Volumes/SSDCX9/data/Voxnote/logs`.
Si arrancas el API sin el volumen, el logging cae a consola (no rompe).
El `output_dir` de `.env` sí necesita el volumen: sin él no escribe notas.

Override temporal:

```bash
make dev LOG_DIR=./logs
# o en .env:
# VOXNOTE_LOG_DIR=./logs
# VOXNOTE_OUTPUT_DIR=./output
```

---

## Archivos locales que hay que llevar (no están en git)

| Archivo | Por qué |
|---------|---------|
| `.env` | Tokens: `VOXNOTE_HF_TOKEN`, `VOXNOTE_OLLAMA_API_KEY`, `VOXNOTE_OUTPUT_DIR=…/data/Voxnote` |
| `packages/web/.env.development` | `NEXT_PUBLIC_API_BASE=http://localhost:8003/api` (solo modo CLI local) |
| `.claude/settings.local.json` | Permisos locales de Claude |
| `.claude/launch.json` | Launch configs (paths relativos desde 2026-08-16) |
| `.claude/plans/` | Planes de sesión (si los quieres) |
| `.zcode/plans/` | Idem ZCode |

Plantilla pública: `.env.example`. Nunca commitear `.env`.

---

## Paths absolutos en el repo

| Archivo | Path | Acción al mover el **código** |
|---------|------|-------------------------------|
| `packages/core/voxnote/config.py` | default `log_dir=/Volumes/SSDCX9/data/Voxnote/logs` | Ninguna (datos no se mueven) |
| `Makefile` | `LOG_DIR ?= /Volumes/SSDCX9/data/Voxnote/logs` | Ninguna |
| `.env.example` | `VOXNOTE_LOG_DIR=/Volumes/SSDCX9/data/Voxnote/logs` | Ninguna |
| `.env` (local) | `VOXNOTE_OUTPUT_DIR=/Volumes/SSDCX9/data/Voxnote` | Ninguna |
| `.claude/launch.json` | era `~/repos/voxnote/…` | Ya relativo; no retocar |

Si algún día la SSD cambia de nombre de volumen, busca `SSDCX9` y actualiza esos cuatro.

---

## Lo que NO hay que rehacer

- No redeployar Cloudflare.
- No rotar secrets de GitHub.
- No volver a descargar el modelo Whisper en el navegador.
- No reconfigurar API keys de la web (están en `localStorage`).
- No mover `~/.cache/huggingface` ni `~/.cache/whisper` (siguen sirviendo al CLI).

Si más adelante también quieres esos caches en la SSD (otros ~17 GB del disco interno):

```bash
# Solo si te quedas sin espacio en $HOME. Opcional, no es parte del move del repo.
mv ~/.cache/huggingface /Volumes/SSDCX9/data/huggingface-cache
ln -s /Volumes/SSDCX9/data/huggingface-cache ~/.cache/huggingface
```

---

## Checklist de cierre

- [ ] `pwd` = `/Volumes/SSDCX9/repos/voxnote`
- [ ] `git status` clean, `git remote -v` sigue siendo GitHub
- [ ] `make test` pasa
- [ ] `make dev` levanta :8003 y :3003
- [ ] Una nota CLI nueva cae en `/Volumes/SSDCX9/data/Voxnote/`
- [ ] La copia vieja de `~/repos/voxnote` está en symlink o borrada
- [ ] El editor abre la ruta nueva
- [ ] Backup de `.env` en `tmp/` borrado o con `chmod 600`

Cuando esto esté tildado, el handoff de producto (`session-handoff.md`) sigue siendo válido: el move no cambia arquitectura, deploy ni roadmap.
