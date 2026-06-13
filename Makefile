.PHONY: install install-core install-api install-web dev dev-api dev-web test test-core test-api lint lint-core lint-web format typecheck clean

# ─── Install ──────────────────────────────────────────────────
install: install-core install-api install-web

install-core:
	pip install -e "packages/core[dev]"

install-api:
	pip install -e "packages/api[dev]"

install-web:
	cd packages/web && npm install

# ─── Dev servers ──────────────────────────────────────────────
dev-api:
	cd packages/api && python -m uvicorn voxnote_api.main:app --reload --port 8003

dev-web:
	cd packages/web && npm run dev -- --port 3003

dev:
	@echo "Starting API (port 8003) and Web (port 3003)..."
	@trap 'kill 0' EXIT; \
		(cd packages/api && python -m uvicorn voxnote_api.main:app --reload --port 8003) & \
		(cd packages/web && npm run dev -- --port 3003) & \
		wait

# ─── Test ─────────────────────────────────────────────────────
test: test-core test-api

test-core:
	cd packages/core && pytest tests/ -v

test-api:
	cd packages/api && pytest tests/ -v

# ─── Lint & Format ───────────────────────────────────────────
lint: lint-core lint-web

lint-core:
	ruff check packages/core/ packages/api/

lint-web:
	cd packages/web && npm run lint

format:
	ruff format packages/core/ packages/api/

typecheck:
	mypy packages/core/voxnote/

# ─── Clean ────────────────────────────────────────────────────
clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache .ruff_cache
	rm -rf packages/core/build packages/core/dist packages/core/*.egg-info
	rm -rf packages/api/build packages/api/dist packages/api/*.egg-info
	rm -rf packages/web/.next packages/web/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
