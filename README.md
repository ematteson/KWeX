# KWeX - Knowledge Worker Experience

KWeX is a Pearson-developed knowledge-work observability system designed to measure, diagnose, and improve knowledge-worker productivity, friction, and workflow health across the organization. It extends principles from Developer Experience (DX) into all knowledge-work disciplines.

## Overview

The MVP focuses on **survey-based measurement** for selected occupations, leveraging:
- **Faethm skills ontology** (core tasks, competencies, work activities)
- **Pearson Career Architecture**
- **Kaizen-style continuous improvement loops**
- **DEEP framework** (Diagnose -> Embed -> Evaluate -> Prioritize)

## Core 4 Metrics

KWeX measures four key dimensions of knowledge worker experience:

| Metric | Description | Goal |
|--------|-------------|------|
| **Flow** | Throughput and value-adding work completion | Higher is better (0-100) |
| **Friction** | Workflow inefficiency indicators | Lower is better (0-100) |
| **Safety** | Risk/quality impact and psychological safety | Higher is better (0-100) |
| **Portfolio Balance** | Run (operational) vs. Change (innovation) work ratio | Closer to ideal is better |

## Architecture

```
kwex/
├── src/
│   ├── backend/          # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── api/v1/   # REST API endpoints
│   │   │   ├── core/     # Configuration
│   │   │   ├── db/       # Database setup
│   │   │   ├── models/   # SQLAlchemy ORM models
│   │   │   ├── schemas/  # Pydantic schemas
│   │   │   └── services/ # Business logic
│   │   └── tests/        # Pytest test suite
│   └── frontend/         # React TypeScript frontend
│       └── src/
│           ├── api/      # API client
│           ├── components/
│           └── pages/
├── scripts/              # Starter scripts
└── docs/                 # Additional documentation
```

## Tech Stack

**Backend:**
- Python 3.11+
- FastAPI 0.109+
- SQLAlchemy 2.0+ (ORM)
- SQLite (MVP database)
- Uvicorn (ASGI server)
- Pydantic (validation)

**Frontend:**
- React 18.2
- TypeScript 5.3
- Vite (build tool)
- Tailwind CSS
- React Query (data fetching)
- Recharts (visualizations)

## Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18+ and npm
- Git

### Option 1: Using Starter Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Initial setup (installs all dependencies)
./scripts/setup.sh

# Start development servers
./scripts/dev.sh

# Or start production servers
./scripts/prod.sh
```

### Option 2: Manual Setup

**Backend:**
```bash
cd src/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd src/frontend
npm install
npm run dev
```

### Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Faethm API Integration

KWeX integrates with the Faethm API for occupation and task data. By default, it runs in **mock mode** with sample data for 5 occupations.

### Mock Mode (Default)

No configuration needed. Uses built-in mock data for:
- Product Manager (PM001)
- Designer (DES001)
- Sales Operations (SALES001)
- Finance Analyst (FIN001)
- Customer Experience Specialist (CX001)

### Live Mode

To use the live Faethm API, set the environment variable:

```bash
export FaethmPROD="your-api-key-here"
```

Or configure in `src/backend/.env`:
```env
FAETHM_API_KEY=${FaethmPROD}
FAETHM_API_MOCK=false
FAETHM_API_URL=https://api.faethm.com
```

The system automatically detects the `FaethmPROD` environment variable and switches to live mode when present.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | "KWeX API" |
| `DEBUG` | Enable debug mode | true |
| `DATABASE_URL` | Database connection string | sqlite:///./kwex.db |
| `FAETHM_API_URL` | Faethm API base URL | (empty) |
| `FAETHM_API_KEY` | Faethm API key | (empty) |
| `FAETHM_API_MOCK` | Use mock Faethm data | true |
| `MIN_RESPONDENTS_FOR_DISPLAY` | Privacy threshold | 7 |
| `MAX_SURVEY_COMPLETION_MINUTES` | Target survey duration | 7 |

## Usage Workflow

### 1. Setup Occupations

```bash
# Sync occupations from Faethm (mock or live)
curl -X POST http://localhost:8000/api/v1/occupations/sync
```

### 2. Create a Team

```bash
curl -X POST http://localhost:8000/api/v1/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Team Alpha",
    "function": "Product Management",
    "occupation_id": 1,
    "member_count": 12
  }'
```

### 3. Create and Launch Survey

```bash
# Create survey
curl -X POST http://localhost:8000/api/v1/surveys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2024 KWeX Survey",
    "occupation_id": 1,
    "team_id": 1,
    "anonymous_mode": true
  }'

# Generate questions (uses LLM if available, falls back to static)
curl -X POST http://localhost:8000/api/v1/surveys/1/generate-questions

# Activate survey
curl -X POST http://localhost:8000/api/v1/surveys/1/activate

# Get anonymous response link
curl http://localhost:8000/api/v1/surveys/1/link

# Clone survey for next quarter (copies all questions)
curl -X POST "http://localhost:8000/api/v1/surveys/1/clone?new_name=Q2%202024%20KWeX%20Survey"
```

### 4. Collect Responses

Share the anonymous link with team members. They can:
- Access the survey via the anonymous token URL
- Save progress and resume later
- Submit responses anonymously

### 5. View Results

After collecting responses (minimum 7 for privacy):

```bash
# Calculate metrics
curl -X POST http://localhost:8000/api/v1/teams/1/metrics/calculate

# View Core 4 metrics
curl http://localhost:8000/api/v1/teams/1/metrics

# Generate improvement opportunities
curl -X POST http://localhost:8000/api/v1/teams/1/surveys/1/generate-opportunities

# View RICE-scored opportunities
curl http://localhost:8000/api/v1/teams/1/opportunities
```

## API Reference

See [docs/API.md](docs/API.md) for complete API documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/occupations/sync` | Sync occupations from Faethm |
| `GET` | `/api/v1/teams` | List all teams |
| `POST` | `/api/v1/surveys` | Create a new survey |
| `POST` | `/api/v1/surveys/{id}/generate-questions` | Generate survey questions |
| `POST` | `/api/v1/surveys/{id}/activate` | Launch survey |
| `POST` | `/api/v1/surveys/{id}/clone` | Clone survey for recurring use |
| `GET` | `/api/v1/respond/{token}` | Get survey for anonymous response |
| `POST` | `/api/v1/respond/{token}` | Submit survey response |
| `GET` | `/api/v1/teams/{id}/metrics` | Get Core 4 metrics |
| `GET` | `/api/v1/teams/{id}/opportunities` | Get RICE-scored opportunities |
| `GET` | `/api/v1/status` | System status and version |
| `POST` | `/api/v1/status/generate-sample-data` | Generate test data |

## Development & Testing

### Sample Data Generation

For development and testing, you can generate sample survey responses:

```bash
# Generate 10 random responses for survey ID 1
curl -X POST http://localhost:8000/api/v1/status/generate-sample-data \
  -H "Content-Type: application/json" \
  -d '{"survey_id": "1", "count": 10, "mode": "random"}'

# Generate realistic persona-based responses (requires LLM)
curl -X POST http://localhost:8000/api/v1/status/generate-sample-data \
  -H "Content-Type: application/json" \
  -d '{"survey_id": "1", "count": 8, "mode": "persona"}'
```

The persona mode uses 8 predefined employee personas (Eager Newcomer, Burned Out Veteran, Process Perfectionist, etc.) to generate realistic response patterns.

### Survey Cloning

Clone surveys for recurring quarterly assessments:

```bash
# Clone with auto-generated name
curl -X POST http://localhost:8000/api/v1/surveys/1/clone

# Clone with custom name
curl -X POST "http://localhost:8000/api/v1/surveys/1/clone?new_name=Q2%202024%20Survey"

# Clone to a different team
curl -X POST "http://localhost:8000/api/v1/surveys/1/clone?new_team_id=2"
```

## Privacy & Security

- **Anonymous Survey Responses**: Responses use UUID tokens with no user identification
- **Privacy Threshold**: Metrics only display when 7+ respondents to prevent identification
- **Audit Logging**: All data access is logged for compliance
- **Team-Level Aggregation**: Data is never exposed at individual level

## Testing

**Backend:**
```bash
cd src/backend
pytest
pytest --cov=app  # With coverage
```

**Frontend:**
```bash
cd src/frontend
npm test
npm run test:ui  # With UI
```

## Development

### Code Quality

**Backend:**
```bash
cd src/backend
ruff check .     # Linting
black .          # Formatting
```

**Frontend:**
```bash
cd src/frontend
npm run lint
```

### Project Structure Details

See individual READMEs for more details:
- [Backend README](src/backend/README.md)
- [Frontend README](src/frontend/README.md)

## Roadmap

### Phase 0 - Setup (Current)
- Confirm pilot occupations
- Connect to Faethm API
- Build survey templates

### Phase 1 - MVP Release
- Run surveys
- Produce dashboards
- Generate RICE opportunity list

### Phase 2 - Post-MVP Extensions
- Direct system telemetry
- Automated workflow agent suggestions
- Real-time task-level friction detection
- Integration with Pearson learning pathways

## Contributing

1. Create a feature branch from `main`
2. Make changes with tests
3. Run linting and formatting
4. Submit a pull request

## License

Pearson Internal Use Only

## Support

For questions or issues, contact the KWeX team.
