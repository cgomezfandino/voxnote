.PHONY: install install-core install-api install-web dev dev-api dev-web test test-core test-api lint lint-core lint-web format typecheck clean clean-all ensure-venv ensure-web-deps logs logs-tail logs-prune

# ─── Variables ────────────────────────────────────────────────
PYTHON_VERSION := 3.11
VENV := .venv
# Always resolve to absolute path so `cd packages/... && $(VENV_PY)` works.
VENV_PY := $(abspath $(VENV)/bin/python)
VENV_PIP := $(abspath $(VENV)/bin/pip)
WEB_NODE_MODULES := packages/web/node_modules

# Logs live on the SSD by default (see config.Settings.log_dir). Override with:
#   make dev LOG_DIR=/some/other/path
LOG_DIR ?= /Volumes/SSDCX9/data/Voxnote/logs
DEV_LOG := $(LOG_DIR)/dev/dev-$$(date +%Y-%m-%d).log

# ─── Auto-restore helpers ────────────────────────────────────
# Si no existe .venv, se crea automáticamente. Transparente para el usuario.
ensure-venv:
	@if [ ! -x "$(VENV_PY)" ]; then \
		echo "→ Creando entorno virtual $(VENV) (Python $(PYTHON_VERSION))..."; \
		python$(PYTHON_VERSION) -m venv $(VENV); \
		$(VENV_PIP) install --upgrade pip --quiet; \
	fi

# Si no existe node_modules, se instala automáticamente.
ensure-web-deps:
	@if [ ! -d "$(WEB_NODE_MODULES)" ]; then \
		echo "→ Instalando dependencias web (npm install)..."; \
		cd packages/web && npm install --silent; \
	fi

# ─── Install ──────────────────────────────────────────────────
install: ensure-venv install-core install-api install-web

install-core: ensure-venv
	$(VENV_PIP) install -e "packages/core[dev]"

install-api: ensure-venv
	$(VENV_PIP) install -e "packages/api[dev]"

install-web: ensure-web-deps

# ─── Dev servers ──────────────────────────────────────────────
# All output is tee'd to $(DEV_LOG) on the SSD (created if missing), so
# `make dev` is transparent: you still see live output, and it's persisted.
# Uses the voxnote-api entry point (main:run) which sets up logging to the SSD
# BEFORE uvicorn starts, so our handlers survive (uvicorn would otherwise wipe them).
dev-api: ensure-venv install-core install-api
	@install -d -m 0700 "$(LOG_DIR)/dev"
	@touch "$(DEV_LOG)" && chmod 600 "$(DEV_LOG)"
	@echo "Logging to $(DEV_LOG)"
	@VOXNOTE_API_RELOAD=true VOXNOTE_API_PORT=8003 $(VENV_PY) -m voxnote_api.main 2>&1 | tee -a "$(DEV_LOG)"

dev-web: ensure-web-deps
	@install -d -m 0700 "$(LOG_DIR)/dev"
	@touch "$(DEV_LOG)" && chmod 600 "$(DEV_LOG)"
	@echo "Logging to $(DEV_LOG)"
	@cd packages/web && npm run dev -- --port 3003 2>&1 | tee -a "$(DEV_LOG)"

dev: ensure-venv ensure-web-deps install-core install-api
	@install -d -m 0700 "$(LOG_DIR)/dev"
	@touch "$(DEV_LOG)" && chmod 600 "$(DEV_LOG)"
	@echo "Starting API (port 8003) and Web (port 3003)... logging to $(DEV_LOG)"
	@trap 'kill 0' EXIT; \
		{ VOXNOTE_API_PORT=8003 $(VENV_PY) -m voxnote_api.main \
			& (cd packages/web && npm run dev -- --port 3003) & wait; } 2>&1 | tee -a "$(DEV_LOG)"

# ─── Test ─────────────────────────────────────────────────────
test: test-core test-api

test-core: ensure-venv install-core
	cd packages/core && $(VENV_PY) -m pytest tests/ -v

test-api: ensure-venv install-core install-api
	cd packages/api && $(VENV_PY) -m pytest tests/ -v

# ─── Lint & Format ───────────────────────────────────────────
lint: lint-core lint-web

lint-core: ensure-venv install-core
	$(VENV_PY) -m ruff check packages/core/ packages/api/

lint-web: ensure-web-deps
	cd packages/web && npm run lint

format: ensure-venv install-core
	$(VENV_PY) -m ruff format packages/core/ packages/api/

typecheck: ensure-venv install-core
	$(VENV_PY) -m mypy packages/core/voxnote/

# ─── Logs ─────────────────────────────────────────────────────
# Logs live on the SSD (LOG_DIR). Useful helpers:
logs:
	@echo "Log directory: $(LOG_DIR)"
	@ls -lh "$(LOG_DIR)"/*/  2>/dev/null || echo "(no logs yet)"

logs-tail:
	@tail -f "$(DEV_LOG)" 2>/dev/null || echo "No dev log yet at $(DEV_LOG)"

# Rotate: delete log files older than 7 days (matches TimedRotatingFileHandler).
logs-prune:
	@find "$(LOG_DIR)" -type f -name "*.log*" -mtime +7 -delete 2>/dev/null || true
	@echo "✓ Pruned logs older than 7 days from $(LOG_DIR)"

# ─── Clean ────────────────────────────────────────────────────
# Limpieza segura: borra caches y dependencias instaladas (todo es regenerable).
# Ejecutar al final de una sesión para liberar espacio en disco.
# Los targets de uso (dev, test, install) restauran automáticamente lo borrado.
clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache .ruff_cache
	rm -rf packages/core/build packages/core/dist packages/core/*.egg-info
	rm -rf packages/api/build packages/api/dist packages/api/*.egg-info
	rm -rf packages/web/.next $(WEB_NODE_MODULES)
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Caches y dependencias eliminados (~460 MB)."
	@echo "  Al volver a usar 'make dev' / 'make test' se restauran solos."

# Limpieza profunda: también elimina entornos virtuales (Python + backups).
# Solo ejecutar cuando NO vayas a seguir trabajando en esta sesión.
# Al volver: cualquier target (dev, test, install) recrea .venv automáticamente.
clean-all: clean
	rm -rf $(VENV) .venv.*.bak venv/ env/
	@echo "✓ Entornos virtuales eliminados (~2.7 GB liberados en total)."
	@echo "  Al volver a usar 'make dev' / 'make test' se restaura todo solo."
