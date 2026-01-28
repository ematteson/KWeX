# KWeX Technical Specifications

## 1. System Overview

**KWeX (Knowledge Worker Experience)** is a Pearson-developed knowledge-work observability system designed to measure, diagnose, and improve knowledge-worker productivity, friction, and workflow health across the organization.

### 1.1 Product Vision
KWeX extends principles from Developer Experience (DX) into all knowledge-work disciplines, providing a systematic approach to identifying and reducing organizational friction.

### 1.2 Core Capabilities
- Survey-based measurement of knowledge worker experience
- Faethm-based task and skills ontology integration
- Core 4 metrics calculation (Flow, Friction, Safety, Portfolio Balance)
- RICE-scored opportunity identification
- Team and Executive dashboards
- DEEP framework operationalization

### 1.3 Design Principles
- **Kaizen-style continuous improvement** — Small, incremental improvements over big-bang changes
- **DEEP framework alignment** — Diagnose → Embed → Evaluate → Prioritize
- **Anonymity-first** — Psychological safety through data privacy
- **System diagnosis only** — NOT an employee performance measurement system
- **"Go see, ask why"** — Direct observation combined with AI pattern recognition
- **Respect for people** — Trust-based, non-punitive measurement

### 1.4 Non-Goals (MVP)
- NOT an employee performance system
- NOT designed for OKRs or target-based incentives (avoids Goodhart's law)
- Does NOT include automated process mining (future phase)
- Does NOT include agentic automation (future phase)
- Does NOT include behavioral telemetry (future phase)

---

## 2. Data Models

### 2.1 Occupation
```typescript
Occupation {
  id: UUID
  name: string                    // e.g., "Product Manager"
  faethm_code: string            // Faethm occupation identifier
  tasks: Task[]                  // Tasks from Faethm API
  skills: Skill[]                // Skills/competencies
  work_activities: WorkActivity[] // Work activities from Faethm
  ideal_portfolio_ratio: {       // Role-specific ideal Run/Change balance
    run_percentage: float        // e.g., 0.35 for 35%
    change_percentage: float     // e.g., 0.65 for 65%
  }
  throughput_indicators: string[] // Role-specific output measures
  created_at: timestamp
  updated_at: timestamp
}
```

**MVP Occupations:**
| Occupation | Faethm Code | Key Throughput Indicators |
|------------|-------------|---------------------------|
| Product Manager | TBD | Decisions closed, roadmap items shipped |
| Designer | TBD | Designs delivered, iterations completed |
| Sales Operations | TBD | Proposals sent, deals progressed |
| Finance Analyst | TBD | Forecasts delivered, reports completed |
| Customer Experience | TBD | Tickets resolved, CSAT maintained |

### 2.2 Task
```typescript
Task {
  id: UUID
  occupation_id: UUID
  faethm_task_id: string         // Faethm task identifier
  name: string
  description: string
  category: TaskCategory         // CORE, SUPPORT, ADMIN
  friction_signals: FrictionSignal[]
  created_at: timestamp
}

enum TaskCategory {
  CORE,      // Primary value-adding work
  SUPPORT,   // Enabling work
  ADMIN      // Administrative overhead
}
```

### 2.3 FrictionSignal
```typescript
FrictionSignal {
  id: UUID
  task_id: UUID
  type: FrictionType             // CLARITY, TOOLING, PROCESS, REWORK, DELAY, SAFETY
  severity: Severity             // LOW, MEDIUM, HIGH
  description: string
}

enum FrictionType {
  CLARITY,   // Task clarity issues
  TOOLING,   // Tool/system friction
  PROCESS,   // Process/workflow barriers
  REWORK,    // Rework frequency
  DELAY,     // Wait times and blockers
  SAFETY     // Psychological safety concerns
}

enum Severity {
  LOW,       // Minor inconvenience
  MEDIUM,    // Noticeable impact
  HIGH       // Significant productivity loss
}
```

### 2.4 Survey
```typescript
Survey {
  id: UUID
  occupation_id: UUID
  team_id: UUID
  name: string
  questions: Question[]
  status: SurveyStatus           // DRAFT, ACTIVE, CLOSED
  anonymous_mode: boolean        // True = fully anonymous, False = anonymized (team knows participation)
  created_at: timestamp
  closes_at: timestamp
  estimated_completion_minutes: integer  // Target: ≤ 7
}

enum SurveyStatus {
  DRAFT,     // Being configured
  ACTIVE,    // Open for responses
  CLOSED     // No longer accepting responses
}
```

### 2.5 Question
```typescript
Question {
  id: UUID
  survey_id: UUID
  task_id: UUID | null           // Optional link to specific task
  friction_signal_id: UUID | null // Optional link to friction signal
  dimension: FrictionType        // CLARITY, TOOLING, PROCESS, REWORK, DELAY, SAFETY
  metric_mapping: MetricType[]   // Which Core 4 metrics this feeds
  text: string
  type: QuestionType             // LIKERT_5, LIKERT_7, MULTIPLE_CHOICE, PERCENTAGE_SLIDER, FREE_TEXT
  options: string[] | null       // For multiple choice questions
  order: integer
  required: boolean
}

enum QuestionType {
  LIKERT_5,          // 1-5 scale
  LIKERT_7,          // 1-7 scale
  MULTIPLE_CHOICE,   // Discrete options
  PERCENTAGE_SLIDER, // 0-100% slider
  FREE_TEXT          // Open-ended (qualitative only)
}

enum MetricType {
  FLOW,
  FRICTION,
  SAFETY,
  PORTFOLIO_BALANCE
}
```

### 2.6 Response
```typescript
Response {
  id: UUID
  survey_id: UUID
  anonymous_token: string         // Cryptographically random, not traceable to individual
  submitted_at: timestamp
  completion_time_seconds: integer
  answers: Answer[]
  is_complete: boolean           // For save-and-resume functionality
}
```

### 2.7 Answer
```typescript
Answer {
  id: UUID
  response_id: UUID
  question_id: UUID
  value: string                   // Raw value (numeric string for Likert, text for free-form)
  numeric_value: float | null     // Normalized 0-1 for calculations (null for free-text)
}
```

### 2.8 Team
```typescript
Team {
  id: UUID
  name: string
  function: string                // e.g., "Product", "Design", "Sales", "Finance"
  occupation_id: UUID
  member_count: integer           // For reach calculations
  created_at: timestamp
}
```

### 2.9 MetricResult
```typescript
MetricResult {
  id: UUID
  team_id: UUID
  survey_id: UUID
  calculation_date: timestamp
  respondent_count: integer       // Must be ≥ 7 to display
  meets_privacy_threshold: boolean // respondent_count >= 7

  // Core 4 Metrics (0-100 scale)
  flow_score: float
  friction_score: float           // Lower is better (inverted for display)
  safety_score: float
  portfolio_balance_score: float

  // Detailed breakdowns for drill-down
  flow_breakdown: {
    throughput: float,
    value_delivery: float,
    unblocked_time: float
  }
  friction_breakdown: {
    dependency_wait: float,
    approval_latency: float,
    rework_from_unclear: float,
    tooling_pain: float,
    process_confusion: float
  }
  safety_breakdown: {
    rework_events: float,
    quality_escapes: float,
    decision_reversals: float,
    audit_issues: float
  }
  portfolio_breakdown: {
    run_percentage: float,
    change_percentage: float,
    deviation_from_ideal: float
  }

  // Trend data
  previous_result_id: UUID | null
  trend_direction: TrendDirection  // UP, DOWN, STABLE
}

enum TrendDirection {
  UP,      // Improved from previous
  DOWN,    // Declined from previous
  STABLE   // Within ±5% of previous
}
```

### 2.10 Opportunity
```typescript
Opportunity {
  id: UUID
  team_id: UUID
  survey_id: UUID
  friction_signal_id: UUID

  // RICE Score Components
  reach: integer                  // Number of people affected
  impact: float                   // 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
  confidence: float               // 0.5 (low), 0.8 (medium), 1.0 (high)
  effort: float                   // Person-weeks estimate (default: 2)
  rice_score: float               // Calculated: (reach × impact × confidence) / effort

  title: string
  description: string
  status: OpportunityStatus       // IDENTIFIED, IN_PROGRESS, COMPLETED, DEFERRED
  created_at: timestamp
  updated_at: timestamp
}

enum OpportunityStatus {
  IDENTIFIED,   // Newly detected
  IN_PROGRESS,  // Being worked on
  COMPLETED,    // Successfully addressed
  DEFERRED      // Intentionally postponed
}
```

---

## 3. Survey Engine Specifications

### 3.1 Survey Generation Algorithm
The system generates DX-style surveys covering 6 friction dimensions:

| Dimension | Description | Example Questions |
|-----------|-------------|-------------------|
| **Task Clarity** | Understanding of what needs to be done | "How clear are the requirements for your key tasks?" |
| **Tooling Friction** | Pain from tools and systems | "How much time do you spend fighting tools vs. doing work?" |
| **Process Barriers** | Workflow and process obstacles | "How often do unclear processes slow down your work?" |
| **Rework Frequency** | Work that must be redone | "How often do you redo work due to changing requirements?" |
| **Delay Sources** | Wait times and blockers | "How much of your time is spent waiting on others?" |
| **Psychological Safety** | Ability to speak up without fear | "Can you raise concerns without negative consequences?" |

### 3.2 Question Mapping Algorithm
```
For each Occupation:
  1. Fetch tasks from Faethm API (or mock data for MVP)
  2. For each Task:
     a. Identify applicable friction signals based on task category
     b. Generate 1-2 questions per friction type
     c. Map questions to Core 4 metrics (one question may feed multiple metrics)
  3. Add occupation-specific throughput questions → Flow
  4. Add time allocation questions → Portfolio Balance
  5. Add psychological safety questions → Safety (qualitative dimension)
  6. Optimize question set to achieve < 7 min completion:
     - Target: 15-20 questions maximum
     - Prioritize high-signal questions
     - Rotate optional questions across survey cycles
```

### 3.3 Survey Question Templates

**Flow (Throughput) Questions:**
- "In a typical week, how much of your planned work do you complete?" (Likert 1-5)
- "How often are you able to work without significant blockers?" (Likert 1-5)
- "Rate your ability to deliver value consistently" (Likert 1-5)

**Friction Questions:**
- "How much time do you spend waiting on dependencies?" (Likert 1-5)
- "How often do approvals delay your work?" (Likert 1-5)
- "How often do you redo work due to unclear requirements?" (Likert 1-5)
- "How much do tools slow you down vs. help you?" (Likert 1-5)
- "How often do unclear processes slow down your work?" (Likert 1-5)

**Safety Questions:**
- "How often does your work require significant rework?" (Likert 1-5)
- "How often do quality issues escape to customers/stakeholders?" (Likert 1-5)
- "How often are decisions reversed after significant work?" (Likert 1-5)
- "Can you raise concerns without negative consequences?" (Likert 1-5)

**Portfolio Balance Questions:**
- "What percentage of your time is spent on operational/maintenance work?" (Slider 0-100%)
- "What percentage is spent on new initiatives/improvements?" (Slider 0-100%)
- "Do you feel you have enough time for strategic vs. tactical work?" (Likert 1-5)

### 3.4 Survey Delivery Requirements
- **Access**: Unique anonymous link per respondent (no login required for MVP)
- **Platform**: Web-based responsive UI (mobile-friendly)
- **Progress**: Visual progress indicator
- **Resume**: Save and resume capability (optional for MVP)
- **Completion**: Auto-submit on final question
- **Time Target**: ≤ 7 minutes average completion time

### 3.5 Anonymization Requirements
- **No PII collection**: No names, emails, or identifiable information stored with responses
- **Random tokens**: Response tokens are cryptographically random UUIDs, not traceable to individuals
- **Aggregation threshold**: Minimum 7 responses before team data is shown
- **No individual reporting**: Team-level aggregates only, NEVER individual responses
- **Token generation**: New random token generated for each survey response link

---

## 4. Core 4 Metrics Specifications

### 4.1 Flow (Throughput) — 0-100 Scale

**Definition:** Measures value-adding completion of work units.

**Calculation:**
```python
flow_score = weighted_average([
    (normalize(self_reported_throughput), 0.4),      # "I complete my key tasks efficiently"
    (normalize(value_delivery_frequency), 0.35),    # "How often do you deliver completed work?"
    (normalize(unblocked_time_percentage), 0.25)    # "What % of time are you unblocked?"
])

# Role-specific throughput examples:
# PM: decisions closed, roadmap items shipped
# Sales: proposals sent, deals progressed
# Finance: forecasts delivered, reports completed
# Designer: designs delivered, iterations completed
```

**Interpretation:**
- 80-100: Excellent flow, high productivity
- 60-79: Good flow, some blockers
- 40-59: Moderate flow, significant friction
- 0-39: Poor flow, major systemic issues

### 4.2 Friction (Workflow Effectiveness) — 0-100 Scale

**Definition:** Signal of workflow inefficiency. **Lower is better.**

**Calculation:**
```python
friction_score = weighted_average([
    (normalize(dependency_wait_time), 0.25),
    (normalize(approval_latency), 0.20),
    (normalize(rework_from_unclear_requirements), 0.25),
    (normalize(tooling_pain_frequency), 0.15),
    (normalize(process_confusion_frequency), 0.15)
])

# For dashboard display, invert: effectiveness = 100 - friction_score
```

**Interpretation:**
- 0-20: Minimal friction, smooth workflows
- 21-40: Low friction, minor obstacles
- 41-60: Moderate friction, noticeable impact
- 61-80: High friction, significant productivity loss
- 81-100: Critical friction, systemic dysfunction

### 4.3 Safety (Risk/Quality Impact) — 0-100 Scale

**Definition:** Inverse of negative work outcome frequency. **Higher is better.**

**Calculation:**
```python
raw_negative_score = weighted_average([
    (normalize(rework_event_frequency), 0.30),
    (normalize(quality_escape_frequency), 0.25),
    (normalize(decision_reversal_frequency), 0.25),
    (normalize(audit_issue_frequency), 0.20)
])

safety_score = 100 - raw_negative_score
```

**Interpretation:**
- 80-100: High safety, rare negative outcomes
- 60-79: Good safety, occasional issues
- 40-59: Moderate safety, regular issues
- 0-39: Low safety, frequent quality problems

### 4.4 Portfolio Balance (Now vs. New) — 0-100 Scale

**Definition:** Health of the ratio between "keep system running" work (Run) vs "create new value" work (Change).

**Calculation:**
```python
# From survey time allocation questions
run_work_percentage = (operational + maintenance + support) / total_time
change_work_percentage = (new_features + improvements + innovation) / total_time

# Get role-specific ideal ratio (varies by occupation)
ideal_run = occupation.ideal_portfolio_ratio.run_percentage  # e.g., 0.35
ideal_change = occupation.ideal_portfolio_ratio.change_percentage  # e.g., 0.65

# Calculate deviation from ideal
run_deviation = abs(run_work_percentage - ideal_run)
change_deviation = abs(change_work_percentage - ideal_change)
total_deviation = (run_deviation + change_deviation) / 2

# Convert to 0-100 score (100 = perfect balance)
portfolio_balance_score = 100 * (1 - total_deviation)
```

**Ideal Ratios by Role Type:**
| Role Type | Ideal Run % | Ideal Change % |
|-----------|-------------|----------------|
| Product Manager | 30% | 70% |
| Designer | 25% | 75% |
| Sales Operations | 40% | 60% |
| Finance Analyst | 45% | 55% |
| Customer Experience | 50% | 50% |

**Interpretation:**
- 80-100: Well-balanced portfolio
- 60-79: Slightly imbalanced
- 40-59: Moderately imbalanced, strategic work impacted
- 0-39: Severely imbalanced, needs intervention

### 4.5 Normalization Function
```python
def normalize(likert_value: int, scale: int = 5) -> float:
    """Convert Likert scale to 0-100 range."""
    return ((likert_value - 1) / (scale - 1)) * 100

def normalize_percentage(percentage: float) -> float:
    """Percentage is already 0-100, just validate."""
    return max(0, min(100, percentage))
```

---

## 5. RICE Scoring Specifications

### 5.1 RICE Formula
```
RICE_Score = (Reach × Impact × Confidence) / Effort
```

### 5.2 Component Definitions

| Component | Description | Scale | Examples |
|-----------|-------------|-------|----------|
| **Reach** | Number of people affected per measurement cycle | Integer | 50 people, 200 people |
| **Impact** | Expected improvement magnitude | 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive) | Tool upgrade = 1, Process overhaul = 2 |
| **Confidence** | How sure we are about estimates | 0.5 (low), 0.8 (medium), 1.0 (high) | Based on sample size and data quality |
| **Effort** | Person-weeks to implement | Float | 0.5 weeks, 2 weeks, 8 weeks |

### 5.3 Friction Signal → Opportunity Conversion

```python
def generate_opportunity(signal: FrictionSignal, team: Team, survey_stats: SurveyStats) -> Opportunity:
    """Convert a friction signal into a RICE-scored opportunity."""

    # Only process MEDIUM and HIGH severity signals
    if signal.severity == Severity.LOW:
        return None

    # Calculate Reach: team size × signal prevalence
    prevalence = calculate_prevalence(signal, survey_stats)
    reach = int(team.member_count * prevalence)

    # Estimate Impact based on severity and friction contribution
    impact_map = {
        Severity.MEDIUM: 1.0,
        Severity.HIGH: 2.0
    }
    impact = impact_map[signal.severity]

    # Set Confidence based on sample quality
    response_rate = survey_stats.response_count / team.member_count
    if response_rate >= 0.7:
        confidence = 1.0
    elif response_rate >= 0.5:
        confidence = 0.8
    else:
        confidence = 0.5

    # Default Effort (can be manually adjusted)
    effort = 2.0  # person-weeks

    # Calculate RICE score
    rice_score = (reach * impact * confidence) / effort

    return Opportunity(
        team_id=team.id,
        friction_signal_id=signal.id,
        reach=reach,
        impact=impact,
        confidence=confidence,
        effort=effort,
        rice_score=rice_score,
        title=generate_opportunity_title(signal),
        description=generate_opportunity_description(signal, survey_stats),
        status=OpportunityStatus.IDENTIFIED
    )
```

### 5.4 Opportunity Title/Description Generation

```python
def generate_opportunity_title(signal: FrictionSignal) -> str:
    templates = {
        FrictionType.CLARITY: f"Improve clarity for: {signal.description}",
        FrictionType.TOOLING: f"Address tooling friction: {signal.description}",
        FrictionType.PROCESS: f"Streamline process: {signal.description}",
        FrictionType.REWORK: f"Reduce rework caused by: {signal.description}",
        FrictionType.DELAY: f"Eliminate delay from: {signal.description}",
        FrictionType.SAFETY: f"Improve safety regarding: {signal.description}"
    }
    return templates[signal.type]
```

---

## 6. Dashboard Specifications

### 6.1 Team Dashboard Components

#### 6.1.1 Core 4 Metrics Display
- **Layout**: 4 metric cards in a row/grid
- **Each card shows**:
  - Metric name (Flow, Friction, Safety, Portfolio Balance)
  - Current score (0-100, large font)
  - Trend arrow (↑ improved, ↓ declined, → stable) vs. previous cycle
  - Color coding:
    - Green: Healthy (score ≥ 70, or Friction ≤ 30)
    - Yellow: Attention needed (score 50-69, or Friction 31-50)
    - Red: Critical (score < 50, or Friction > 50)

#### 6.1.2 Friction Heatmap
- **Structure**: Matrix visualization
- **Rows**: Tasks for the occupation
- **Columns**: 6 Friction Dimensions (Clarity, Tooling, Process, Rework, Delay, Safety)
- **Cells**: Color intensity = friction severity (white → yellow → red)
- **Interaction**: Clickable cells for drill-down to specific survey responses

#### 6.1.3 Opportunity List
- **Sorting**: RICE-ranked (highest score first)
- **Each item shows**:
  - Title
  - RICE score
  - Status tag (Identified/In Progress/Completed/Deferred)
  - Reach (N people affected)
- **Actions**: Quick status change buttons (Start, Complete, Defer)
- **Filtering**: By status, by friction type

#### 6.1.4 Portfolio Chart
- **Type**: Donut/pie chart
- **Segments**: Run work % vs. Change work %
- **Overlay**: Ideal ratio line/indicator for the role
- **Secondary**: Small trend line showing historical balance

### 6.2 Executive Dashboard Components

#### 6.2.1 Cross-Team Comparison
- **Type**: Radar/spider chart OR grouped bar chart
- **Axes/Groups**: Core 4 metrics
- **Series**: Each team (anonymized if needed)
- **Requirement**: Non-identifying (no individual names)
- **Aggregation**: Function-level (e.g., "Product", "Design", "Sales")

#### 6.2.2 Trend Lines
- **Type**: Line chart
- **X-axis**: Measurement cycles (survey periods)
- **Y-axis**: Metric scores (0-100)
- **Lines**:
  - Organization-wide average
  - Individual team trends (if drilling down)
  - Benchmark lines (industry or internal targets)

### 6.3 Privacy Enforcement in Dashboards
- **Minimum threshold check**: Before rendering ANY team data, verify respondent_count ≥ 7
- **Insufficient data message**: "Not enough responses to display results (minimum 7 required)"
- **No individual drill-down**: Never show anything that could identify individual responses

---

## 7. API Specifications

### 7.1 Faethm API Integration (Read-Only)

**Base URL**: (To be configured via environment variable)

**Endpoints Used:**
```
GET /occupations                      # List all occupations
GET /occupations/{id}                 # Get occupation details
GET /occupations/{id}/tasks           # Get tasks for occupation
GET /occupations/{id}/skills          # Get skills/competencies
GET /occupations/{id}/activities      # Get work activities
```

**Authentication**: API key via header (stored securely in environment)
```
Authorization: Bearer {FAETHM_API_KEY}
```

**Caching Strategy**:
- Cache Faethm data for 24 hours (occupation/task data doesn't change frequently)
- Cache invalidation on demand via admin endpoint

**Mock Mode for MVP**:
- When `FAETHM_API_MOCK=true`, return static mock data for pilot occupations
- Mock data should cover all 5 MVP occupations with realistic tasks

### 7.2 KWeX Internal API

**Base URL**: `/api/v1`

#### Survey Management
```
POST   /surveys                       # Create new survey
GET    /surveys                       # List surveys (with filters)
GET    /surveys/{id}                  # Get survey details
PUT    /surveys/{id}                  # Update survey (DRAFT only)
DELETE /surveys/{id}                  # Delete survey (DRAFT only)
POST   /surveys/{id}/activate         # Activate survey
POST   /surveys/{id}/close            # Close survey
GET    /surveys/{id}/link             # Generate anonymous response link
```

#### Response Collection
```
GET    /respond/{token}               # Get survey for anonymous respondent
POST   /respond/{token}               # Submit survey response
PUT    /respond/{token}               # Update partial response (save progress)
GET    /surveys/{id}/stats            # Get response statistics (respects privacy threshold)
```

#### Metrics
```
GET    /teams/{team_id}/metrics                # Get current Core 4 metrics
GET    /teams/{team_id}/metrics/history        # Get historical metrics
GET    /teams/{team_id}/metrics/{survey_id}    # Get metrics for specific survey
```

#### Opportunities
```
GET    /teams/{team_id}/opportunities          # Get RICE-ranked opportunities
GET    /opportunities/{id}                     # Get opportunity details
PUT    /opportunities/{id}                     # Update opportunity (status, effort)
POST   /opportunities/{id}/start               # Mark as in progress
POST   /opportunities/{id}/complete            # Mark as completed
POST   /opportunities/{id}/defer               # Mark as deferred
```

#### Admin / Configuration
```
GET    /teams                         # List teams
POST   /teams                         # Create team
PUT    /teams/{id}                    # Update team
GET    /occupations                   # List configured occupations (from Faethm)
POST   /occupations/sync              # Sync occupations from Faethm API
```

### 7.3 API Response Formats

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "INSUFFICIENT_RESPONSES",
    "message": "Minimum 7 responses required to view team data",
    "details": { "current_count": 5, "minimum_required": 7 }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

---

## 8. Security Requirements

### 8.1 Data Protection
- **No PII storage**: Survey responses contain NO personally identifiable information
- **Anonymous tokens**: Cryptographically random UUIDs, generated using secure random
- **Database encryption**: At-rest encryption required for production
- **Transport encryption**: HTTPS only, TLS 1.2+ required
- **Token storage**: Response tokens are one-way (cannot reverse to identify user)

### 8.2 Access Control
- **Survey response submission**: No authentication required (anonymous by design)
- **Dashboard access**: Pearson SSO authentication (optional for MVP, required for production)
- **Admin functions**: Role-based access control
- **Executive dashboard**: Restricted to leadership roles
- **API authentication**: API key for Faethm, JWT tokens for internal APIs

### 8.3 Aggregation Privacy
- **7-respondent minimum**: NEVER display team data with fewer than 7 responses
- **Individual responses**: NEVER visible, only aggregated statistics
- **Audit logging**: All data access logged with timestamp, user, and action
- **Data retention**: 2 years, with secure deletion after

### 8.4 Compliance
- Full compliance with Pearson assessment/psychometric standards
- GDPR-ready architecture (data minimization, right to deletion)
- No cross-team individual data sharing

---

## 9. Performance Requirements

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Survey completion time | ≤ 7 minutes | Median completion time |
| Survey page load | < 2 seconds | Time to interactive |
| Dashboard page load | < 3 seconds | Time to full render |
| API response time (P95) | < 500ms | 95th percentile latency |
| Concurrent survey responses | 100+ | Simultaneous submissions |
| Database query time | < 100ms | P95 for dashboard queries |
| Data retention | 2 years | Survey responses and metrics |
| System uptime | 99.5% | Monthly availability |

---

## 10. Technology Stack (MVP)

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI (async, auto-docs)
- **Database**: SQLite for MVP → PostgreSQL for production
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **Testing**: pytest, pytest-asyncio

### Post-MVP Backend (Hardened)
- **Language**: Rust (framework TBD)
- **Contract**: Preserve MVP OpenAPI surface and schema semantics
- **Cutover**: Only after OpenAPI stability, schema freeze, and MVP success criteria are met

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts or Chart.js
- **State Management**: React Context (MVP), consider Zustand for scale
- **HTTP Client**: Axios or fetch
- **Testing**: Jest, React Testing Library

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **API Documentation**: OpenAPI/Swagger (auto-generated by FastAPI)
- **Environment Management**: python-dotenv, .env files
- **Logging**: Python logging, structured JSON logs

### Development Tools
- **Linting**: ruff (Python), ESLint (TypeScript)
- **Formatting**: black (Python), Prettier (TypeScript)
- **Pre-commit**: pre-commit hooks for quality gates

---

## 11. Success Criteria

### 11.1 Product Metrics (MVP Validation)
- [ ] ≥ 60% survey response rate in pilot teams
- [ ] ≥ 80% of participants agree survey reflects their actual work experience
- [ ] At least 3 "early win" improvement opportunities identified per pilot team
- [ ] Positive qualitative feedback from functional leaders

### 11.2 Technical Metrics
- [ ] Survey completion time ≤ 7 minutes (median)
- [ ] Dashboard load time < 3 seconds
- [ ] Zero PII exposure (verified by security review)
- [ ] 7-respondent minimum consistently enforced
- [ ] All Core 4 metrics calculating correctly

### 11.3 Business Outcomes (Post-MVP)
- [ ] Measurable reduction in top friction sources (survey cycle 1 → 2)
- [ ] Clear evidence of workflow constraints surfaced and addressed
- [ ] KWeX adopted by at least one additional Pearson function beyond pilots

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Goodhart's Law** (metric gaming) | No individual-level data; metrics used only for system diagnosis, not performance evaluation |
| **Low trust / psychological safety** | Anonymity by design; leadership communication plan; no punitive use of data |
| **Insufficient task detail from Faethm** | Manual augmentation capability in MVP; mock data for development |
| **Survey fatigue** | Short survey (< 7 min); question rotation across cycles; clear value communication |
| **Low response rates** | Leadership endorsement; clear anonymity messaging; convenient access (no login) |
| **Data privacy concerns** | 7-respondent minimum; no individual reporting; audit logging |

---

## 13. Appendix: DEEP Framework Alignment

KWeX operationalizes Pearson's DEEP transformation model:

| DEEP Phase | KWeX MVP Capability | Key Features |
|------------|---------------------|--------------|
| **Diagnose** | Survey engine + friction detection | Occupation-specific surveys, 6 friction dimensions, task mapping |
| **Embed** | Kaizen cycle & opportunity tracking | RICE-scored opportunities, status workflow, continuous measurement |
| **Evaluate** | Core 4 metrics tracking | Flow, Friction, Safety, Portfolio Balance with trend analysis |
| **Prioritize** | RICE scoring + dashboards | Ranked opportunity list, team and executive views |

---

## 14. Appendix: Source Document Principles

From the KWeX Working Document:

1. **Start with survey-based measurement** — Direct observation before automation
2. **Layer in direct outcome measurement later** — Phase 2+ capability
3. **Kaizen over big-bang** — Small continuous improvements
4. **Respect for people** — Trust-based, non-punitive measurement
5. **Start with value, not technology** — Focus on outcomes, not tools
6. **"Go see, ask why"** — Direct observation combined with AI pattern recognition
