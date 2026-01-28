# Agent Build Instructions — KWeX

## Project Overview

KWeX (Knowledge Worker Experience) is a knowledge-work observability system with:
- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy / SQLite
- **Frontend**: React 18+ / TypeScript / Tailwind CSS / Vite

## Stack Policy & Migration
- **Frontend standard**: Node.js + TypeScript only.
- **Prototype backend**: Python + FastAPI for rapid iteration.
- **MVP hardening**: Migrate backend to Rust after stability gates are met (OpenAPI stable, DB schema frozen, MVP criteria met).
- **Loop rule**: After the gate, no new Python features; only bug fixes until Rust parity is complete.

## Project Structure

```
KWeX/
├── .ralph/                    # Ralph configuration
│   ├── @AGENT.md             # This file - build instructions
│   ├── @fix_plan.md          # Task list
│   ├── PROMPT.md             # Development instructions
│   └── specs/                # Technical specifications
├── src/
│   ├── backend/              # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/       # API endpoints
│   │   │   ├── core/         # Configuration
│   │   │   ├── db/           # Database setup
│   │   │   ├── models/       # SQLAlchemy models
│   │   │   ├── schemas/      # Pydantic schemas
│   │   │   └── services/     # Business logic
│   │   ├── tests/            # Backend tests
│   │   └── pyproject.toml    # Python dependencies
│   └── frontend/             # React frontend
│       ├── src/
│       │   ├── api/          # API client and hooks
│       │   ├── components/   # Reusable UI components
│       │   └── pages/        # Page components
│       ├── package.json      # npm dependencies
│       └── vite.config.ts    # Vite configuration
└── docker/                   # Docker configuration (TBD)
```

## Backend Setup

```bash
# Navigate to backend directory
cd src/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment file
cp .env.example .env

# Initialize database (happens automatically on startup)
```

## Running the Backend

```bash
# Development server with auto-reload
cd src/backend
uvicorn app.main:app --reload --port 8000

# Or run directly
python -m uvicorn app.main:app --reload
```

## Rust Backend (Post-MVP)

```bash
cd src/backend-rust
cargo run
```

The Rust service should preserve the same OpenAPI contract as the Python MVP.

The API will be available at:
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Frontend Setup

```bash
# Navigate to frontend directory
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Running Tests

### Backend Tests
```bash
# From src/backend directory
cd src/backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/ --cov-report=term-missing

# Run specific test file
pytest tests/test_api_basic.py -v
```

### Frontend Tests
```bash
# From src/frontend directory
cd src/frontend

# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## API Endpoints (Implemented)

### Health & Info
- `GET /` - API info
- `GET /health` - Health check

### Occupations
- `GET /api/v1/occupations` - List occupations
- `POST /api/v1/occupations` - Create occupation
- `GET /api/v1/occupations/{id}` - Get occupation
- `POST /api/v1/occupations/sync` - Sync from Faethm

### Teams
- `GET /api/v1/teams` - List teams
- `POST /api/v1/teams` - Create team
- `GET /api/v1/teams/{id}` - Get team
- `PUT /api/v1/teams/{id}` - Update team

### Surveys
- `GET /api/v1/surveys` - List surveys
- `POST /api/v1/surveys` - Create survey
- `GET /api/v1/surveys/{id}` - Get survey
- `PUT /api/v1/surveys/{id}` - Update survey (draft only)
- `DELETE /api/v1/surveys/{id}` - Delete survey (draft only)
- `POST /api/v1/surveys/{id}/activate` - Activate survey
- `POST /api/v1/surveys/{id}/close` - Close survey
- `GET /api/v1/surveys/{id}/link` - Generate response link
- `GET /api/v1/surveys/{id}/stats` - Get response stats
- `POST /api/v1/surveys/{id}/generate-questions` - Generate questions from occupation

### Survey Responses (Anonymous)
- `POST /api/v1/responses` - Start a new response
- `GET /api/v1/responses/token/{token}` - Get survey by token
- `POST /api/v1/responses/{id}/submit` - Submit answers

### Metrics
- `GET /api/v1/teams/{id}/metrics` - Get current team metrics
- `GET /api/v1/teams/{id}/metrics/history` - Get metrics history
- `GET /api/v1/teams/{id}/metrics/{survey_id}` - Get metrics for specific survey
- `POST /api/v1/teams/{id}/metrics/calculate` - Trigger metrics calculation

### Opportunities
- `GET /api/v1/teams/{id}/opportunities` - List opportunities (RICE sorted)
- `GET /api/v1/teams/{id}/opportunities/{opp_id}` - Get opportunity
- `POST /api/v1/teams/{id}/opportunities` - Create opportunity manually
- `PATCH /api/v1/teams/{id}/opportunities/{opp_id}` - Update opportunity
- `DELETE /api/v1/teams/{id}/opportunities/{opp_id}` - Delete opportunity
- `POST /api/v1/teams/{id}/surveys/{survey_id}/generate-opportunities` - Generate opportunities from survey
- `GET /api/v1/teams/{id}/opportunities/summary` - Get summary statistics

## Frontend Pages

- `/teams` - Team list
- `/teams/:teamId` - Team dashboard with Core 4 metrics
- `/teams/:teamId/opportunities` - Opportunities list
- `/survey/:token` - Survey taking interface
- `/survey/complete` - Survey completion confirmation

## Key Services

### MetricsCalculator (`app/services/metrics_calculator.py`)
- Calculates Core 4 Metrics (Flow, Friction, Safety, Portfolio Balance)
- Enforces 7-respondent privacy threshold
- Tracks trend direction (UP/DOWN/STABLE)

### OpportunityGenerator (`app/services/opportunity_generator.py`)
- Converts friction signals to improvement opportunities
- Calculates RICE scores: (Reach × Impact × Confidence) / Effort
- Manages opportunity status workflow

### SurveyGenerator (`app/services/survey_generator.py`)
- Generates questions from 6 friction dimension templates
- Maps questions to metrics

### FaethmClient (`app/services/faethm_client.py`)
- Mock mode with 5 pilot occupations
- Ready for real API integration

## Key Learnings

### Database
- SQLite for MVP, easy migration path to PostgreSQL
- SQLAlchemy 2.0 with declarative mapping
- Automatic table creation on startup via `init_db()`

### Testing
- Use in-memory SQLite for fast tests
- TestClient from FastAPI for integration tests
- pytest fixtures for database session management

### Faethm Integration
- Mock mode enabled by default (`FAETHM_API_MOCK=true`)
- Mock data covers 5 MVP occupations with tasks
- Real API integration ready when credentials available

### Frontend
- Vite for fast development builds
- React Query for API state management
- Tailwind CSS with Pearson brand colors
- Anonymous survey tokens for privacy

## Feature Development Quality Standards

**CRITICAL**: All new features MUST meet the following mandatory requirements before being considered complete.

### Testing Requirements

- **Minimum Coverage**: 85% code coverage ratio required for all new code
- **Test Pass Rate**: 100% - all tests must pass, no exceptions
- **Test Types Required**:
  - Unit tests for all business logic and services
  - Integration tests for API endpoints
- **Coverage Validation**: Run coverage reports before marking features complete:
  ```bash
  pytest --cov=app tests/ --cov-report=term-missing
  ```

### Git Workflow Requirements

Before moving to the next feature, ALL changes must be:

1. **Committed with Clear Messages**:
   ```bash
   git add .
   git commit -m "feat(module): descriptive message following conventional commits"
   ```

2. **Pushed to Remote Repository** (when remote is configured)

3. **Ralph Integration**:
   - Update .ralph/@fix_plan.md with new tasks before starting work
   - Mark items complete in .ralph/@fix_plan.md upon completion

### Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] All tests pass: `pytest`
- [ ] Code coverage meets 85% minimum threshold
- [ ] All changes committed with conventional commit messages
- [ ] .ralph/@fix_plan.md task marked as complete
- [ ] .ralph/@AGENT.md updated (if new patterns introduced)
