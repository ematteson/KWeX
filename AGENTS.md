# Repository Guidelines

## Project Structure & Module Organization
- `src/backend/` houses the FastAPI service (`app/`) and `tests/` for pytest.
- `src/frontend/` contains the React + TypeScript app under `src/`.
- `docs/` stores supporting documentation such as `docs/API.md`.
- `scripts/` provides helper shell scripts like `setup.sh`, `dev.sh`, and `prod.sh`.

## Build, Test, and Development Commands
- `./scripts/setup.sh` installs backend and frontend dependencies.
- `./scripts/dev.sh` runs both dev servers (frontend on `:5173`, backend on `:8000`).
- Backend: `cd src/backend && uvicorn app.main:app --reload --port 8000`.
- Frontend: `cd src/frontend && npm install && npm run dev`.
- Tests: `cd src/backend && pytest` and `cd src/frontend && npm test`.

## Coding Style & Naming Conventions
- Python uses `black` for formatting and `ruff` for linting (`cd src/backend`).
- Frontend linting runs via `cd src/frontend && npm run lint`.
- Follow existing module layout: API endpoints live in `src/backend/app/api/v1/endpoints/`.
- Match prevailing naming: Python modules/functions use `snake_case`; React components use `PascalCase`.

## Testing Guidelines
- Backend tests use pytest in `src/backend/tests/` (e.g., `pytest tests/test_surveys.py`).
- Frontend tests use the configured npm scripts (`npm test`, `npm run test:ui`).
- When adding new endpoints or UI features, add or update a focused test file nearby.

## Commit & Pull Request Guidelines
- Git history is minimal; use short, imperative summaries (e.g., "Add survey export endpoint").
- Create feature branches from `main` and keep commits scoped to one change.
- PRs should include a clear description, linked issue (if available), and screenshots for UI changes.

## Configuration & Secrets
- Backend configuration is in `src/backend/.env.example`; copy to `.env` locally.
- Faethm API defaults to mock mode; enable live mode via `.env` values.
