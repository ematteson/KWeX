# KWeX Backend

FastAPI-based REST API backend for the KWeX (Knowledge Worker Experience) survey tool.

## Overview

The backend provides:
- **Survey Management**: Create, generate questions, and manage survey lifecycle
- **Anonymous Response Collection**: Privacy-preserving survey submission
- **Core 4 Metrics Calculation**: Flow, Friction, Safety, Portfolio Balance
- **RICE-scored Opportunities**: Prioritized improvement recommendations
- **Faethm Integration**: Occupation and task data (mock or live API)
- **Audit Logging**: Compliance tracking for all data access

## Project Structure

```
src/backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI application entry point
│   ├── api/
│   │   └── v1/
│   │       ├── router.py     # API router aggregation
│   │       └── endpoints/
│   │           ├── occupations.py  # Occupation management
│   │           ├── teams.py        # Team CRUD
│   │           ├── surveys.py      # Survey lifecycle
│   │           ├── responses.py    # Anonymous response collection
│   │           ├── metrics.py      # Core 4 metrics
│   │           └── opportunities.py # RICE opportunities
│   ├── core/
│   │   └── config.py         # Environment-based settings
│   ├── db/
│   │   └── database.py       # SQLAlchemy setup
│   ├── models/
│   │   └── models.py         # ORM models (10 tables)
│   ├── schemas/
│   │   └── schemas.py        # Pydantic request/response schemas
│   └── services/
│       ├── audit_logger.py       # Compliance logging
│       ├── faethm_client.py      # Faethm API client (mock/live)
│       ├── metrics_calculator.py # Core 4 calculations
│       ├── opportunity_generator.py # RICE scoring
│       └── survey_generator.py   # Question generation
├── tests/                    # Pytest test suite
├── pyproject.toml           # Dependencies and config
├── .env.example             # Environment template
└── README.md                # This file
```

## Quick Start

### Prerequisites

- Python 3.11 or higher
- pip or uv package manager

### Installation

```bash
# Navigate to backend directory
cd src/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows

# Upgrade pip (required for pyproject.toml support)
pip install --upgrade pip

# Install dependencies (with dev tools)
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env
```

### Running the Server

**Development mode (with auto-reload):**
```bash
uvicorn app.main:app --reload --port 8000
```

**Production mode:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Accessing the API

- **API Base URL**: http://localhost:8000/api/v1
- **OpenAPI Documentation**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Application
APP_NAME="KWeX API"
DEBUG=true
API_V1_PREFIX="/api/v1"

# Database
DATABASE_URL="sqlite:///./kwex.db"

# Faethm API
FAETHM_API_URL=""
FAETHM_API_KEY=""
FAETHM_API_MOCK=true

# Privacy settings
MIN_RESPONDENTS_FOR_DISPLAY=7

# Survey settings
MAX_SURVEY_COMPLETION_MINUTES=7
```

### Faethm API Configuration

**Mock Mode (Default):**
```env
FAETHM_API_MOCK=true
```
Uses built-in sample data for 5 occupations (Product Manager, Designer, Sales Operations, Finance Analyst, Customer Experience).

**Live Mode:**
Set the `FaethmPROD` environment variable:
```bash
export FaethmPROD="your-api-key"
```

Or configure directly in `.env`:
```env
FAETHM_API_MOCK=false
FAETHM_API_KEY=your-api-key
FAETHM_API_URL=https://api.faethm.com
```

## Database

### Schema

The backend uses SQLite (easily swappable to PostgreSQL for production) with 10 main tables:

| Table | Description |
|-------|-------------|
| `occupations` | Job roles from Faethm (name, code, ideal run/change %) |
| `tasks` | Work activities within occupations |
| `friction_signals` | Identified friction points on tasks |
| `teams` | Organizational units linked to occupations |
| `surveys` | Survey instances with status lifecycle |
| `questions` | Auto-generated survey questions |
| `responses` | Anonymous survey submissions |
| `answers` | Individual question answers |
| `metric_results` | Calculated Core 4 metrics |
| `opportunities` | RICE-scored improvement opportunities |

### Database Initialization

The database is automatically created on first startup. To reset:

```bash
rm kwex.db
uvicorn app.main:app --reload
```

## API Endpoints

### Occupations (`/api/v1/occupations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List all occupations |
| `POST` | `/` | Create occupation |
| `GET` | `/{id}` | Get occupation details |
| `POST` | `/sync` | Sync from Faethm API |

### Teams (`/api/v1/teams`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List all teams |
| `POST` | `/` | Create team |
| `GET` | `/{id}` | Get team details |
| `PUT` | `/{id}` | Update team |

### Surveys (`/api/v1/surveys`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List surveys (filter by status/team) |
| `POST` | `/` | Create survey |
| `GET` | `/{id}` | Get survey with questions |
| `PUT` | `/{id}` | Update survey (DRAFT only) |
| `DELETE` | `/{id}` | Delete survey (DRAFT only) |
| `POST` | `/{id}/generate-questions` | Auto-generate questions |
| `POST` | `/{id}/activate` | Change status to ACTIVE |
| `POST` | `/{id}/close` | Change status to CLOSED |
| `GET` | `/{id}/link` | Get anonymous response link |
| `GET` | `/{id}/stats` | Response statistics |

### Responses (`/api/v1/respond`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/{token}` | Get survey for anonymous response |
| `POST` | `/{token}` | Submit complete response |
| `PUT` | `/{token}` | Save partial response (resume later) |

### Metrics (`/api/v1/teams/{team_id}/metrics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get latest Core 4 metrics |
| `GET` | `/history` | Historical trends |
| `GET` | `/friction-breakdown` | Dimension heatmap data |
| `GET` | `/{survey_id}` | Metrics for specific survey |
| `POST` | `/calculate` | Trigger calculation |

### Opportunities (`/api/v1/teams/{team_id}/opportunities`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List opportunities (RICE-sorted) |
| `GET` | `/{id}` | Get opportunity details |
| `PATCH` | `/{id}` | Update opportunity |
| `POST` | `/` | Create manual opportunity |
| `DELETE` | `/{id}` | Delete opportunity |
| `POST` | `/surveys/{survey_id}/generate-opportunities` | Auto-generate from survey |
| `GET` | `/summary` | Summary statistics |

## Core Services

### Survey Generator (`services/survey_generator.py`)

Generates survey questions from occupation data:
- 6 friction dimensions: Clarity, Tooling, Process, Rework, Delay, Safety
- 3 Flow questions (throughput measurement)
- 3 Portfolio Balance questions (run vs. change work)
- Target: 15-18 questions per survey (~7 minutes)

### Metrics Calculator (`services/metrics_calculator.py`)

Calculates Core 4 metrics from survey responses:

**Flow (0-100, higher is better):**
- Throughput (40%): Planned work completion
- Value Delivery (35%): Consistent value delivery
- Unblocked Time (25%): Working without blockers

**Friction (0-100, lower is better):**
- Dependency Wait (25%), Approval Latency (20%)
- Rework from Unclear (25%), Tooling Pain (15%)
- Process Confusion (15%)

**Safety (0-100, higher is better):**
- Rework Events, Quality Escapes, Decision Reversals
- Psychological Safety (equally weighted)

**Portfolio Balance (0-100, higher is better):**
- Deviation from ideal Run/Change ratio per occupation

### Opportunity Generator (`services/opportunity_generator.py`)

Creates RICE-scored improvement opportunities:

```
RICE Score = (Reach x Impact x Confidence) / Effort
```

- **Reach**: People affected based on team size and low score prevalence
- **Impact**: 0.25-3.0 multiplier based on severity
- **Confidence**: 0.5-1.0 based on response count and variance
- **Effort**: Person-weeks by friction type (2.0-4.0)

### Faethm Client (`services/faethm_client.py`)

Provides occupation and task data:

**Mock Mode:**
Returns hardcoded data for 5 occupations with tasks, throughput indicators, and ideal portfolio ratios.

**Live Mode:**
Calls Faethm API with Bearer token authentication.

### Audit Logger (`services/audit_logger.py`)

Tracks all data access for compliance:
- Sensitivity levels: LOW, MEDIUM, HIGH, CRITICAL
- Respects anonymity (no IP/user-agent for responses)
- All metric views logged with privacy check results

## Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app

# Verbose output
pytest -v

# Specific test file
pytest tests/test_surveys.py
```

## Code Quality

```bash
# Linting
ruff check .

# Auto-fix issues
ruff check --fix .

# Formatting
black .

# Check formatting
black --check .
```

## Development Tips

### Adding a New Endpoint

1. Create schema in `schemas/schemas.py`
2. Create endpoint in `api/v1/endpoints/`
3. Register in `api/v1/router.py`
4. Add tests in `tests/`

### Adding a New Model

1. Define model in `models/models.py`
2. Database auto-creates on restart
3. Add corresponding Pydantic schemas
4. Create CRUD endpoints as needed

### Database Migrations

For production, add Alembic:

```bash
pip install alembic
alembic init alembic
# Configure alembic.ini with DATABASE_URL
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Troubleshooting

**Database locked error:**
SQLite doesn't support concurrent writes. For production, switch to PostgreSQL:
```env
DATABASE_URL=postgresql://user:pass@localhost/kwex
```

**Import errors:**
Ensure you're in the activated virtual environment and installed with `-e`:
```bash
pip install -e ".[dev]"
```

**Faethm API errors:**
Check that `FaethmPROD` environment variable is set correctly, or verify mock mode is enabled.

## Related Documentation

- [Main Project README](../../README.md)
- [Frontend README](../frontend/README.md)
- [API Documentation](../../docs/API.md)
- [KWeX PRD](../../KWeX_PRD.md)
