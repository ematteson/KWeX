# KWeX Architecture Documentation

## Overview

KWeX (Knowledge Worker Experience) is a privacy-first platform for measuring and improving knowledge worker productivity. It collects anonymous survey responses, calculates four core metrics (Flow, Friction, Safety, Portfolio Balance), and generates RICE-scored improvement opportunities.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KWEX SYSTEM ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │ Web Browser │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
           ┌────────▼────────┐                          ┌─────────▼─────────┐
           │    FRONTEND     │                          │    API DOCS       │
           │  React/TypeScript│                          │  Swagger/ReDoc    │
           │   Port 5173     │                          │                   │
           │                 │                          │                   │
           │  ┌───────────┐  │                          │  ┌─────────────┐  │
           │  │   Pages   │  │                          │  │ /docs       │  │
           │  ├───────────┤  │                          │  │ /redoc      │  │
           │  │ Dashboard │  │                          │  └─────────────┘  │
           │  │ Teams     │  │                          │                   │
           │  │ Survey    │  │                          └───────────────────┘
           │  │ Metrics   │  │
           │  └───────────┘  │
           └────────┬────────┘
                    │
                    │ HTTP/REST (Axios + React Query)
                    │
┌───────────────────▼─────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND (Port 8000)                            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          API LAYER (/api/v1)                            │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  /occupations  │  /teams  │  /surveys  │  /respond  │  /metrics  │  /llm│    │
│  └────────────────┴──────────┴────────────┴────────────┴────────────┴──────┘    │
│                                      │                                           │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐    │
│  │                        BUSINESS LOGIC SERVICES                          │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐     │    │
│  │  │ FaethmClient    │  │ SurveyGenerator  │  │ MetricsCalculator   │     │    │
│  │  │ (Occupation     │  │ (Static/LLM      │  │ (Core 4 Metrics)    │     │    │
│  │  │  Sync)          │  │  Questions)      │  │                     │     │    │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘     │    │
│  │                                                                          │    │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐     │    │
│  │  │ TaskEnrichment  │  │ QuestionCache    │  │ OpportunityGenerator│     │    │
│  │  │ Service         │  │ Service          │  │ (RICE Scoring)      │     │    │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘     │    │
│  │                                                                          │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                    LLM Integration Layer                        │    │    │
│  │  │  ┌──────────────────┐  ┌────────────────────┐                   │    │    │
│  │  │  │ Azure Foundry    │  │ Mock LLM Client    │                   │    │    │
│  │  │  │ (Claude/GPT)     │  │ (Development)      │                   │    │    │
│  │  │  └──────────────────┘  └────────────────────┘                   │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐    │
│  │                     DATA ACCESS LAYER (SQLAlchemy ORM)                  │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  Models: Occupation │ Task │ FrictionSignal │ Team │ Survey │ Question  │    │
│  │          Response │ Answer │ MetricResult │ Opportunity │ LLMTemplates  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
           ┌────────▼────────┐                    ┌───────▼────────┐
           │  SQLite Database │                    │ External APIs  │
           │   (kwex.db)      │                    ├────────────────┤
           │                  │                    │ Faethm API     │
           │  14 Tables       │                    │ (Occupations)  │
           │                  │                    │                │
           │                  │                    │ Azure Foundry  │
           │                  │                    │ (Claude/GPT)   │
           └──────────────────┘                    └────────────────┘

```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KWEX DATA FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 1: SETUP & CONFIGURATION                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
    │   Admin      │───────▶ │ POST /occupations│────────▶│  FaethmClient   │
    │   User       │         │     /sync        │         │                 │
    └──────────────┘         └──────────────────┘         └────────┬────────┘
                                                                    │
                                     ┌──────────────────────────────┼──────────┐
                                     │                              ▼          │
                              ┌──────┴──────┐              ┌───────────────┐   │
                              │ faethm_jobs │              │  Faethm API   │   │
                              │    .csv     │              │   (Live)      │   │
                              │  (Mock)     │              └───────────────┘   │
                              └─────────────┘                                  │
                                     │                              │          │
                                     └──────────────┬───────────────┘          │
                                                    ▼                          │
                                        ┌───────────────────┐                  │
                                        │   Occupation &    │                  │
                                        │   Task Records    │                  │
                                        │   (Database)      │                  │
                                        └───────────────────┘                  │
                                                                               │
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 2: TEAM & SURVEY CREATION                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
    │   Admin      │───────▶ │   POST /teams    │────────▶│   Team Record   │
    │   User       │         │                  │         │   (Database)    │
    └──────────────┘         └──────────────────┘         └─────────────────┘
           │
           │                 ┌──────────────────┐         ┌─────────────────┐
           └───────────────▶ │  POST /surveys   │────────▶│  Survey Record  │
                             │ {team, occupation}│         │  (status=DRAFT) │
                             └──────────────────┘         └─────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 3: QUESTION GENERATION                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────────────────────────────────────────────────────────────────┐
    │              POST /surveys/{id}/generate-questions                        │
    └────────────────────────────────┬─────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                  │
           ┌────────▼────────┐              ┌─────────▼─────────┐
           │  STATIC PATH    │              │    LLM PATH       │
           │  (Default)      │              │  (When Enabled)   │
           └────────┬────────┘              └─────────┬─────────┘
                    │                                  │
                    │                        ┌─────────▼─────────┐
                    │                        │ TaskEnrichment    │
                    │                        │ Service           │
                    │                        └─────────┬─────────┘
                    │                                  │
                    │                        ┌─────────▼─────────┐
                    │                        │ Azure Foundry     │
                    │                        │ (Claude/GPT)      │
                    │                        └─────────┬─────────┘
                    │                                  │
                    │                        ┌─────────▼─────────┐
                    │                        │ QuestionCache     │
                    │                        │ Service           │
                    │                        └─────────┬─────────┘
                    │                                  │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │  Question Records     │
                         │  (~18 questions)      │
                         │  - friction_dimension │
                         │  - metric_mapping     │
                         │  - question_type      │
                         └───────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 4: SURVEY DISTRIBUTION & RESPONSE COLLECTION                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌────────────────┐       ┌───────────────────┐      ┌────────────────────┐
    │ POST /surveys/ │──────▶│ Survey Activated  │─────▶│ Generate Anonymous │
    │  {id}/activate │       │ (status=ACTIVE)   │      │ Response Tokens    │
    └────────────────┘       └───────────────────┘      └─────────┬──────────┘
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────┐
                                                    │   Shareable Survey URL   │
                                                    │   /survey/{token}        │
                                                    └────────────┬─────────────┘
                                                                 │
    ┌───────────────────────────────────────────────────────────┐│
    │                     ANONYMOUS RESPONDENT                   ││
    │                                                            ││
    │   ┌───────────────┐      ┌────────────────┐               ││
    │   │ GET /respond/ │◀─────│  Access Link   │◀──────────────┘│
    │   │   {token}     │      │                │                │
    │   └───────┬───────┘      └────────────────┘                │
    │           │                                                 │
    │           ▼                                                 │
    │   ┌───────────────┐      ┌────────────────┐                │
    │   │ Survey Form   │─────▶│ POST /respond/ │                │
    │   │ (Likert Scale)│      │   {token}      │                │
    │   └───────────────┘      └───────┬────────┘                │
    │                                   │                         │
    └───────────────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │  Response Record      │
                            │  - anonymous_token    │
                            │  - is_complete=true   │
                            │                       │
                            │  Answer Records       │
                            │  - numeric_value      │
                            │  - text_value         │
                            └───────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 5: METRICS CALCULATION                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌──────────────────────────┐
    │ POST /teams/{id}/metrics │
    │       /calculate         │
    └────────────┬─────────────┘
                 │
                 ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │                        METRICS CALCULATOR                                  │
    │                                                                            │
    │   ┌─────────────────────┐                                                  │
    │   │ Fetch Completed     │                                                  │
    │   │ Responses           │                                                  │
    │   └──────────┬──────────┘                                                  │
    │              │                                                             │
    │              ▼                                                             │
    │   ┌─────────────────────────────────────────────────────────────────┐     │
    │   │              CORE 4 METRIC CALCULATIONS                         │     │
    │   ├─────────────────────────────────────────────────────────────────┤     │
    │   │                                                                 │     │
    │   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │     │
    │   │  │ FLOW SCORE   │  │ FRICTION     │  │ SAFETY       │          │     │
    │   │  │              │  │ SCORE        │  │ SCORE        │          │     │
    │   │  │ • Throughput │  │              │  │              │          │     │
    │   │  │ • Value      │  │ • Dependency │  │ • Rework     │          │     │
    │   │  │   Delivery   │  │   Wait       │  │   Events     │          │     │
    │   │  │ • Unblocked  │  │ • Approval   │  │ • Quality    │          │     │
    │   │  │   Time       │  │   Latency    │  │   Escapes    │          │     │
    │   │  │              │  │ • Rework     │  │ • Decision   │          │     │
    │   │  │              │  │ • Tooling    │  │   Reversals  │          │     │
    │   │  │              │  │ • Process    │  │ • Psych      │          │     │
    │   │  │              │  │              │  │   Safety     │          │     │
    │   │  └──────────────┘  └──────────────┘  └──────────────┘          │     │
    │   │                                                                 │     │
    │   │  ┌──────────────────────────────────────────────────────┐      │     │
    │   │  │ PORTFOLIO BALANCE                                    │      │     │
    │   │  │                                                      │      │     │
    │   │  │ • Run (Operational) Work %                           │      │     │
    │   │  │ • Change (Innovation) Work %                         │      │     │
    │   │  │ • Deviation from Ideal (35/65)                       │      │     │
    │   │  └──────────────────────────────────────────────────────┘      │     │
    │   └─────────────────────────────────────────────────────────────────┘     │
    │              │                                                             │
    │              ▼                                                             │
    │   ┌─────────────────────┐                                                  │
    │   │ PRIVACY CHECK       │                                                  │
    │   │ respondents >= 7    │                                                  │
    │   └──────────┬──────────┘                                                  │
    │              │                                                             │
    └──────────────┼─────────────────────────────────────────────────────────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │   MetricResult        │
       │   - flow_score        │
       │   - friction_score    │
       │   - safety_score      │
       │   - portfolio_balance │
       │   - meets_threshold   │
       │   - breakdown_json    │
       └───────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 6: OPPORTUNITY GENERATION                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌────────────────────────────────────────┐
    │ POST /teams/{id}/surveys/{survey_id}/ │
    │       generate-opportunities           │
    └─────────────────────┬──────────────────┘
                          │
                          ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │                     OPPORTUNITY GENERATOR                                  │
    │                                                                            │
    │   ┌─────────────────────────────────────────────────────────────────┐     │
    │   │                   RICE SCORING                                  │     │
    │   ├─────────────────────────────────────────────────────────────────┤     │
    │   │                                                                 │     │
    │   │   For each friction type:                                       │     │
    │   │   (clarity, tooling, process, rework, delay, safety)           │     │
    │   │                                                                 │     │
    │   │   ┌─────────────────────────────────────────────────────────┐  │     │
    │   │   │                                                         │  │     │
    │   │   │   REACH × IMPACT × CONFIDENCE                           │  │     │
    │   │   │   ─────────────────────────────  = RICE Score           │  │     │
    │   │   │            EFFORT                                       │  │     │
    │   │   │                                                         │  │     │
    │   │   │   • Reach: Team member count                            │  │     │
    │   │   │   • Impact: Severity (0.25 - 3.0)                       │  │     │
    │   │   │   • Confidence: Data quality (0.5 - 1.0)                │  │     │
    │   │   │   • Effort: Implementation estimate (person-weeks)      │  │     │
    │   │   │                                                         │  │     │
    │   │   └─────────────────────────────────────────────────────────┘  │     │
    │   │                                                                 │     │
    │   └─────────────────────────────────────────────────────────────────┘     │
    │                                                                            │
    └───────────────────────────────────┬────────────────────────────────────────┘
                                        │
                                        ▼
                           ┌───────────────────────┐
                           │   Opportunity Records │
                           │   (Ranked by RICE)    │
                           │                       │
                           │   - title             │
                           │   - description       │
                           │   - friction_type     │
                           │   - rice_score        │
                           │   - status=IDENTIFIED │
                           └───────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 7: DASHBOARD VISUALIZATION                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

    ┌───────────────────────────────────────────────────────────────────────────┐
    │                          FRONTEND DASHBOARD                                │
    │                                                                            │
    │   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐          │
    │   │ GET /teams/    │    │ GET /teams/    │    │ GET /executive │          │
    │   │  {id}/metrics  │    │ {id}/          │    │   /metrics     │          │
    │   │                │    │ opportunities  │    │                │          │
    │   └───────┬────────┘    └───────┬────────┘    └───────┬────────┘          │
    │           │                     │                     │                   │
    │           ▼                     ▼                     ▼                   │
    │   ┌─────────────────────────────────────────────────────────────────┐     │
    │   │                                                                 │     │
    │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │     │
    │   │  │ METRIC      │  │ FRICTION    │  │ METRICS     │  │ OPPORT │ │     │
    │   │  │ CARDS       │  │ HEATMAP     │  │ TREND       │  │ LIST   │ │     │
    │   │  │             │  │             │  │ CHART       │  │        │ │     │
    │   │  │ Flow: 78    │  │ ████████    │  │    ╱──╲     │  │ 1. ██  │ │     │
    │   │  │ Friction:62 │  │ ██████      │  │   ╱    ╲    │  │ 2. ██  │ │     │
    │   │  │ Safety: 85  │  │ ████        │  │  ╱      ╲   │  │ 3. ██  │ │     │
    │   │  │ Balance: 71 │  │ ██          │  │ ╱        ╲  │  │ 4. ██  │ │     │
    │   │  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘ │     │
    │   │                                                                 │     │
    │   └─────────────────────────────────────────────────────────────────┘     │
    │                                                                            │
    └───────────────────────────────────────────────────────────────────────────┘

```

---

## Component Descriptions

### Backend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **FastAPI Application** | `src/backend/app/main.py` | Main application entry point with CORS and lifespan management |
| **API Router** | `src/backend/app/api/v1/router.py` | Aggregates all API endpoints |
| **Endpoints** | `src/backend/app/api/v1/endpoints/` | RESTful API handlers for each domain |
| **Models** | `src/backend/app/models/models.py` | SQLAlchemy ORM definitions (14 tables) |
| **Schemas** | `src/backend/app/schemas/schemas.py` | Pydantic request/response validation |
| **Services** | `src/backend/app/services/` | Business logic implementation |
| **Config** | `src/backend/app/core/config.py` | Environment configuration management |
| **Database** | `src/backend/app/db/database.py` | SQLAlchemy engine and session management |

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **App Entry** | `src/frontend/src/main.tsx` | React application bootstrap |
| **Router** | `src/frontend/src/App.tsx` | React Router configuration |
| **API Client** | `src/frontend/src/api/client.ts` | Axios HTTP client with interceptors |
| **API Hooks** | `src/frontend/src/api/hooks.ts` | React Query data fetching hooks |
| **Pages** | `src/frontend/src/pages/` | Page-level components |
| **Components** | `src/frontend/src/components/` | Reusable UI components |

### External Integrations

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| **Faethm API** | Occupation and task data | `FAETHM_API_KEY`, `FAETHM_API_MOCK` |
| **Azure Foundry (Claude)** | LLM-powered question generation | `AZURE_ANTHROPIC_ENDPOINT`, `AZURE_ANTHROPIC_API_KEY` |
| **Azure Foundry (GPT)** | Alternative LLM provider | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` |

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
    │  Occupation  │──────▶│    Task      │──────▶│ FrictionSignal   │
    │              │  1:M  │              │  1:M  │                  │
    │  - id        │       │  - id        │       │  - id            │
    │  - code      │       │  - name      │       │  - dimension     │
    │  - name      │       │  - description│       │  - description   │
    │  - category  │       │  - occupation_id│    │  - task_id       │
    └──────┬───────┘       └──────────────┘       └──────────────────┘
           │
           │ 1:M
           ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
    │    Team      │──────▶│   Survey     │──────▶│    Question      │
    │              │  1:M  │              │  1:M  │                  │
    │  - id        │       │  - id        │       │  - id            │
    │  - name      │       │  - name      │       │  - text          │
    │  - description│       │  - status    │       │  - question_type │
    │  - occupation_id│    │  - team_id   │       │  - friction_dim  │
    └──────────────┘       │  - occupation_id│    │  - survey_id     │
                           └──────┬───────┘       └──────────────────┘
                                  │
                                  │ 1:M
                                  ▼
                           ┌──────────────┐       ┌──────────────────┐
                           │   Response   │──────▶│     Answer       │
                           │              │  1:M  │                  │
                           │  - id        │       │  - id            │
                           │  - anon_token│       │  - numeric_value │
                           │  - is_complete│       │  - text_value    │
                           │  - survey_id │       │  - question_id   │
                           └──────┬───────┘       │  - response_id   │
                                  │               └──────────────────┘
                                  │
    ┌──────────────────────────────┴──────────────────────────────────┐
    │                                                                  │
    ▼                                                                  ▼
┌──────────────────┐                                    ┌──────────────────┐
│  MetricResult    │                                    │  Opportunity     │
│                  │                                    │                  │
│  - id            │                                    │  - id            │
│  - flow_score    │                                    │  - title         │
│  - friction_score│                                    │  - description   │
│  - safety_score  │                                    │  - friction_type │
│  - portfolio_bal │                                    │  - rice_score    │
│  - survey_id     │                                    │  - status        │
│  - team_id       │                                    │  - survey_id     │
└──────────────────┘                                    └──────────────────┘

Supporting Tables:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ LLMQuestionTempl │  │  EnrichedTask    │  │ LLMGenerationLog │
│                  │  │                  │  │                  │
│  - id            │  │  - id            │  │  - id            │
│  - occupation_id │  │  - task_id       │  │  - operation     │
│  - template_data │  │  - enriched_data │  │  - model_used    │
│  - created_at    │  │  - created_at    │  │  - timestamp     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Core 4 Metrics

| Metric | Description | Inputs |
|--------|-------------|--------|
| **Flow Score** | Measures work throughput and value delivery | Throughput, value delivery, unblocked time |
| **Friction Score** | Measures impediments to work (inverted) | Dependency wait, approval latency, rework, tooling issues, process confusion |
| **Safety Score** | Measures quality and psychological safety | Rework events, quality escapes, decision reversals, psychological safety |
| **Portfolio Balance** | Measures run vs. change work distribution | Operational work %, innovation work %, deviation from ideal (35/65) |

---

## Privacy & Security

- **Anonymous Responses**: Survey responses use UUID tokens only - no PII stored
- **Privacy Threshold**: Metrics only displayed when >= 7 respondents
- **Audit Logging**: All LLM operations logged for compliance
- **CORS Configuration**: Restricted to configured origins

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Query, Recharts |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| **Database** | SQLite (MVP), PostgreSQL-ready |
| **LLM** | Azure Foundry (Claude Sonnet 4.5, GPT-4o) |
| **External Data** | Faethm API |

---

## Configuration

### Environment Variables

```bash
# Application
APP_NAME=KWeX API
DEBUG=true

# Database
DATABASE_URL=sqlite:///./kwex.db

# Faethm Integration
FAETHM_API_MOCK=true
FAETHM_API_KEY=${FaethmPROD}

# LLM Configuration
LLM_MOCK=true
LLM_DEFAULT_MODEL=claude
AZURE_ANTHROPIC_ENDPOINT=https://...
AZURE_ANTHROPIC_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...

# Privacy
MIN_RESPONDENTS_FOR_DISPLAY=7
MAX_SURVEY_COMPLETION_MINUTES=7
```

---

## Startup Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup.sh` | Install dependencies (backend venv + frontend npm) |
| `scripts/dev.sh` | Start development servers (backend + frontend) |
| `scripts/prod.sh` | Build and run production servers |

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/occupations/sync` | POST | Sync occupations from Faethm |
| `/api/v1/teams` | GET/POST | Team management |
| `/api/v1/surveys` | GET/POST | Survey management |
| `/api/v1/surveys/{id}/generate-questions` | POST | Generate survey questions |
| `/api/v1/surveys/{id}/activate` | POST | Activate survey for responses |
| `/api/v1/respond/{token}` | GET/POST | Anonymous survey response |
| `/api/v1/teams/{id}/metrics` | GET | Get team metrics |
| `/api/v1/teams/{id}/metrics/calculate` | POST | Calculate metrics |
| `/api/v1/teams/{id}/opportunities` | GET | Get improvement opportunities |
| `/api/v1/llm/config` | GET/PUT | LLM configuration |
| `/api/v1/status` | GET | System health check |
