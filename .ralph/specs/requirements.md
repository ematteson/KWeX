# KWeX Technical Specifications

## 1. System Overview

**KWeX (Knowledge Worker Experience)** is a knowledge-work observability system designed to measure, diagnose, and improve knowledge-worker productivity, friction, and workflow health across Pearson.

### 1.1 Core Capabilities
- Survey-based measurement of knowledge worker experience
- Faethm-based task and skills ontology integration
- Core 4 metrics calculation (Flow, Friction, Safety, Portfolio Balance)
- RICE-scored opportunity identification
- Team and Executive dashboards

### 1.2 Design Principles
- Kaizen-style continuous improvement
- DEEP framework alignment (Diagnose → Embed → Evaluate → Prioritize)
- Anonymity-first for psychological safety
- System diagnosis, NOT individual performance measurement

---

## 2. Data Models

### 2.1 Occupation
```
Occupation {
  id: UUID
  name: string                    // e.g., "Product Manager"
  faethm_code: string            // Faethm occupation identifier
  tasks: Task[]                  // Tasks from Faethm API
  skills: Skill[]                // Skills/competencies
  work_activities: WorkActivity[] // Work activities from Faethm
  created_at: timestamp
  updated_at: timestamp
}
```

### 2.2 Task
```
Task {
  id: UUID
  occupation_id: UUID
  faethm_task_id: string         // Faethm task identifier
  name: string
  description: string
  category: enum                  // CORE, SUPPORT, ADMIN
  friction_signals: FrictionSignal[]
  created_at: timestamp
}
```

### 2.3 FrictionSignal
```
FrictionSignal {
  id: UUID
  task_id: UUID
  type: enum                      // CLARITY, TOOLING, PROCESS, REWORK, DELAY, SAFETY
  severity: enum                  // LOW, MEDIUM, HIGH
  description: string
}
```

### 2.4 Survey
```
Survey {
  id: UUID
  occupation_id: UUID
  team_id: UUID
  name: string
  questions: Question[]
  status: enum                    // DRAFT, ACTIVE, CLOSED
  anonymous_mode: boolean
  created_at: timestamp
  closes_at: timestamp
}
```

### 2.5 Question
```
Question {
  id: UUID
  survey_id: UUID
  task_id: UUID (optional)
  friction_signal_id: UUID (optional)
  dimension: enum                 // CLARITY, TOOLING, PROCESS, REWORK, DELAY, SAFETY
  text: string
  type: enum                      // LIKERT_5, LIKERT_7, MULTIPLE_CHOICE, FREE_TEXT
  options: string[] (optional)
  order: integer
}
```

### 2.6 Response
```
Response {
  id: UUID
  survey_id: UUID
  anonymous_token: string         // No PII - generated unique token
  submitted_at: timestamp
  completion_time_seconds: integer
  answers: Answer[]
}
```

### 2.7 Answer
```
Answer {
  id: UUID
  response_id: UUID
  question_id: UUID
  value: string                   // Numeric for Likert, text for free-form
  numeric_value: float (optional) // Normalized 0-1 for calculations
}
```

### 2.8 Team
```
Team {
  id: UUID
  name: string
  function: string                // e.g., "Product", "Design", "Sales"
  occupation_id: UUID
  member_count: integer
  created_at: timestamp
}
```

### 2.9 MetricResult
```
MetricResult {
  id: UUID
  team_id: UUID
  survey_id: UUID
  calculation_date: timestamp
  respondent_count: integer

  // Core 4 Metrics (0-100 scale)
  flow_score: float
  friction_score: float
  safety_score: float
  portfolio_balance_score: float

  // Breakdown
  flow_breakdown: JSON
  friction_breakdown: JSON
  safety_breakdown: JSON
  portfolio_breakdown: JSON
}
```

### 2.10 Opportunity
```
Opportunity {
  id: UUID
  team_id: UUID
  survey_id: UUID
  friction_signal_id: UUID

  // RICE Score Components
  reach: integer                  // Number of people affected
  impact: float                   // 0.25 (minimal) to 3 (massive)
  confidence: float               // 0-100%
  effort: float                   // Person-weeks estimate
  rice_score: float               // Calculated: reach * impact * confidence / effort

  title: string
  description: string
  status: enum                    // IDENTIFIED, IN_PROGRESS, COMPLETED, DEFERRED
  created_at: timestamp
}
```

---

## 3. Survey Engine Specifications

### 3.1 Survey Generation
The system must generate DX-style surveys covering 6 friction dimensions:

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
  1. Fetch tasks from Faethm API
  2. For each Task:
     a. Identify applicable friction signals
     b. Generate 1-2 questions per friction type
     c. Map questions to Core 4 metrics
  3. Add occupation-specific throughput questions (Flow)
  4. Add time allocation questions (Portfolio Balance)
  5. Limit total questions to achieve < 7 min completion
```

### 3.3 Survey Delivery Requirements
- Unique anonymous link per respondent (no login required for MVP)
- Web-based responsive UI
- Progress indicator
- Save and resume capability
- Auto-submit on completion

### 3.4 Anonymization Requirements
- No PII collection
- Response tokens are random UUIDs, not traceable to individuals
- Minimum 7 responses before team data is shown
- No individual-level reporting ever

---

## 4. Core 4 Metrics Specifications

### 4.1 Flow (Throughput) - 0-100 Scale

**Definition:** Measures value-adding completion of work units.

**Calculation:**
```
flow_score = weighted_average(
  self_reported_throughput,      // "I complete my key tasks efficiently"
  value_delivery_frequency,       // "How often do you deliver completed work?"
  unblocked_time_percentage       // "What % of time are you able to work without blockers?"
)

// Role-specific throughput examples:
// PM: decisions closed, roadmap items shipped
// Sales: proposals sent, deals progressed
// Finance: forecasts delivered, reports completed
```

**Survey Questions:**
- "In a typical week, how much of your planned work do you complete?" (1-5 scale)
- "How often are you able to work without significant blockers?" (1-5 scale)
- "Rate your ability to deliver value consistently" (1-5 scale)

### 4.2 Friction (Workflow Effectiveness) - 0-100 Scale (lower is better)

**Definition:** Signal of workflow inefficiency.

**Calculation:**
```
friction_score = weighted_average(
  dependency_wait_time,           // Time waiting on others
  approval_latency,               // Time in approval queues
  rework_from_unclear_requirements,
  tooling_pain_frequency,
  process_confusion_frequency
)

// Invert for display: 100 - friction_score = effectiveness
```

**Survey Questions:**
- "How much time do you spend waiting on dependencies?" (1-5 scale)
- "How often do approvals delay your work?" (1-5 scale)
- "How often do you redo work due to unclear requirements?" (1-5 scale)
- "How much do tools slow you down vs. help you?" (1-5 scale)

### 4.3 Safety (Risk/Quality Impact) - 0-100 Scale

**Definition:** Frequency of negative work outcomes.

**Calculation:**
```
safety_score = 100 - weighted_average(
  rework_event_frequency,
  audit_issue_frequency,
  forecast_miss_frequency,
  decision_reversal_frequency,
  quality_escape_frequency
)

// Higher score = fewer negative outcomes = safer
```

**Survey Questions:**
- "How often does your work require significant rework?" (1-5 scale)
- "How often do quality issues escape to customers/stakeholders?" (1-5 scale)
- "How often are decisions reversed after significant work?" (1-5 scale)

### 4.4 Portfolio Balance (Now vs. New) - 0-100 Scale

**Definition:** Ratio of "keep system running" work vs "create new value" work.

**Calculation:**
```
// Survey time allocation questions
run_work_percentage = (operational + maintenance + support) / total_time
change_work_percentage = (new_features + improvements + innovation) / total_time

// Ideal balance varies by role, but generally:
// 30-40% Run, 60-70% Change is healthy
// Score indicates deviation from ideal

portfolio_balance_score = calculate_balance_health(
  run_work_percentage,
  change_work_percentage,
  role_ideal_ratio
)
```

**Survey Questions:**
- "What percentage of your time is spent on operational/maintenance work?" (slider 0-100%)
- "What percentage is spent on new initiatives/improvements?" (slider 0-100%)
- "Do you feel you have enough time for strategic vs. tactical work?" (1-5 scale)

---

## 5. RICE Scoring Specifications

### 5.1 RICE Formula
```
RICE_Score = (Reach × Impact × Confidence) / Effort
```

### 5.2 Component Definitions

| Component | Description | Scale |
|-----------|-------------|-------|
| **Reach** | Number of people affected per cycle | Integer (e.g., 50 people) |
| **Impact** | Expected improvement magnitude | 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive) |
| **Confidence** | How sure we are about estimates | 0.5 (low), 0.8 (medium), 1.0 (high) |
| **Effort** | Person-weeks to implement | Float (e.g., 2.5 weeks) |

### 5.3 Friction Signal → Opportunity Conversion
```
For each FrictionSignal with severity >= MEDIUM:
  1. Calculate Reach = team_size * signal_prevalence_percentage
  2. Estimate Impact based on friction_score contribution
  3. Set Confidence based on sample_size / total_team
  4. Estimate Effort (default: 2 weeks, adjustable)
  5. Generate opportunity description from signal context
```

---

## 6. Dashboard Specifications

### 6.1 Team Dashboard Components

#### Core 4 Metrics Display
- 4 metric cards with current scores (0-100)
- Trend arrows (up/down/stable vs. previous cycle)
- Color coding: Green (healthy), Yellow (attention), Red (critical)

#### Friction Heatmap
- Matrix: Tasks × Friction Dimensions
- Color intensity = friction severity
- Clickable cells for drill-down

#### Opportunity List
- RICE-ranked list of improvement opportunities
- Status tags (Identified, In Progress, Completed)
- Assignee field (optional)
- Quick actions: Start, Defer, Complete

#### Portfolio Chart
- Pie/donut chart: Run vs. Change allocation
- Comparison to ideal ratio
- Historical trend line

### 6.2 Executive Dashboard Components

#### Cross-Team Comparison
- Bar/radar chart comparing teams on Core 4
- Non-identifying (no individual names)
- Function-level aggregation

#### Trend Lines
- Line charts showing metrics over measurement cycles
- Organization-wide averages
- Benchmark lines

---

## 7. API Specifications

### 7.1 Faethm API Integration (Read-Only)

**Endpoints Used:**
```
GET /occupations                  // List occupations
GET /occupations/{id}/tasks       // Get tasks for occupation
GET /occupations/{id}/skills      // Get skills/competencies
GET /occupations/{id}/activities  // Get work activities
```

**Authentication:** API key (stored securely in environment)

**Caching:** Cache Faethm data for 24 hours (tasks don't change frequently)

### 7.2 KWeX Internal API

```
// Survey Management
POST   /api/surveys               // Create survey
GET    /api/surveys/{id}          // Get survey details
PUT    /api/surveys/{id}          // Update survey
DELETE /api/surveys/{id}          // Delete survey
GET    /api/surveys/{id}/link     // Generate anonymous response link

// Response Collection
POST   /api/responses             // Submit survey response
GET    /api/responses/{survey_id}/stats  // Get response statistics

// Metrics
GET    /api/metrics/{team_id}     // Get Core 4 metrics for team
GET    /api/metrics/{team_id}/history  // Get metric history

// Opportunities
GET    /api/opportunities/{team_id}  // Get RICE-ranked opportunities
PUT    /api/opportunities/{id}    // Update opportunity status

// Admin
GET    /api/teams                 // List teams
POST   /api/teams                 // Create team
GET    /api/occupations           // List configured occupations
```

---

## 8. Security Requirements

### 8.1 Data Protection
- No PII stored in survey responses
- Anonymous tokens are cryptographically random
- Database encryption at rest
- HTTPS only for all communications

### 8.2 Access Control
- Admin users can create/manage surveys
- Response submission requires no authentication
- Dashboard access requires Pearson authentication (SSO, optional for MVP)
- Executive dashboard restricted to leadership roles

### 8.3 Aggregation Privacy
- Minimum 7 responses before showing ANY team data
- Individual responses never visible, only aggregated statistics
- Audit logging for all data access

---

## 9. Performance Requirements

| Metric | Requirement |
|--------|-------------|
| Survey completion time | ≤ 7 minutes |
| Dashboard page load | < 3 seconds |
| Survey page load | < 2 seconds |
| API response time (95th percentile) | < 500ms |
| Concurrent survey responses | 100+ |
| Data retention | 2 years |

---

## 10. Technology Stack (MVP)

### Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI
- **Database:** SQLite (MVP) → PostgreSQL (production)
- **ORM:** SQLAlchemy

### Frontend
- **Framework:** React 18+
- **Styling:** Tailwind CSS
- **Charts:** Recharts or Chart.js
- **State Management:** React Context (MVP)

### Infrastructure
- **Hosting:** Containerized (Docker)
- **API Documentation:** OpenAPI/Swagger (auto-generated by FastAPI)

---

## 11. Success Criteria

### Product Metrics
- [ ] ≥ 60% survey response rate
- [ ] ≥ 80% of participants agree survey reflects their work
- [ ] At least 3 "early win" improvements identified per pilot team
- [ ] Positive qualitative feedback from functional leaders

### Technical Metrics
- [ ] Survey completion ≤ 7 minutes
- [ ] Dashboard load < 3 seconds
- [ ] Zero PII exposure
- [ ] 7-respondent minimum enforced

### Business Outcomes
- [ ] Reduction in top friction sources (cycle 1 → 2)
- [ ] Clear evidence of workflow constraints surfaced
- [ ] KWeX adopted by at least one additional Pearson function

---

## 12. Appendix: MVP Occupations

| Occupation | Faethm Code | Key Throughput Indicators |
|------------|-------------|---------------------------|
| Product Manager | TBD | Decisions closed, roadmap items shipped |
| Designer | TBD | Designs delivered, iterations completed |
| Sales Operations | TBD | Proposals sent, deals progressed |
| Finance Analyst | TBD | Forecasts delivered, reports completed |
| Customer Experience | TBD | Tickets resolved, CSAT maintained |
