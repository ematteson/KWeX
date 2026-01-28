# Ralph Fix Plan — KWeX MVP

## High Priority

### Phase 0: Foundation (Setup)
- [x] Set up Python backend project structure with FastAPI
- [x] Configure SQLAlchemy with SQLite database
- [x] Create core data models (Occupation, Task, FrictionSignal, Survey, Question, Response, Answer, Team, MetricResult, Opportunity)
- [x] Implement Faethm API client with mock/stub for MVP development
- [x] Set up React frontend project with Tailwind CSS

### Phase 1: Survey Engine
- [x] Implement survey generation from occupation tasks
- [x] Create question mapping algorithm (tasks → friction signals → questions)
- [x] Build 6 friction dimension question templates (Clarity, Tooling, Process, Rework, Delay, Safety)
- [x] Create survey delivery API endpoints (create, get, generate link)
- [x] Build survey response collection endpoint with anonymous token generation
- [x] Implement survey UI with progress indicator and < 7 min target

### Phase 2: Core 4 Metrics
- [x] Implement Flow score calculation (throughput, value delivery, unblocked time)
- [x] Implement Friction score calculation (wait time, approvals, rework, tooling, process)
- [x] Implement Safety score calculation (rework events, quality escapes, reversals)
- [x] Implement Portfolio Balance calculation (Run vs. Change work ratio)
- [x] Create metrics API endpoint with team-level aggregation
- [x] Enforce 7-respondent minimum privacy threshold

## Medium Priority

### Phase 1 Continued: RICE Scoring
- [x] Implement RICE score calculation (Reach × Impact × Confidence / Effort)
- [x] Create friction signal → opportunity conversion logic
- [x] Build opportunity ranking and management endpoints
- [x] Add opportunity status workflow (Identified → In Progress → Completed/Deferred)

### Dashboards
- [x] Build Team Dashboard: Core 4 metric cards with trend indicators
- [x] Create friction heatmap visualization (Tasks × Dimensions matrix)
- [x] Implement RICE-ranked opportunity list component
- [x] Build portfolio balance pie/donut chart (Run vs. Change)
- [x] Create Executive Dashboard: cross-team comparison view
- [x] Add trend line charts for metrics over measurement cycles

### Integration & Refinement
- [ ] Complete Faethm API integration (swap mock for real API when available)
- [ ] Add Pearson SSO integration (optional for MVP)
- [x] Implement survey save-and-resume capability
- [x] Add audit logging for data access

### Stack Standards & Migration
- [ ] Codify stack policy and phase gates in .ralph documentation
- [ ] Stabilize OpenAPI contract for the MVP surface
- [ ] Freeze database schema and document migration plan
- [ ] Create Rust backend skeleton with health + core endpoints
- [ ] Establish parity test suite (Python vs Rust responses)
- [ ] Decommission Python endpoints after Rust parity

## Low Priority

### Post-MVP Enhancements
- [ ] Migrate SQLite → PostgreSQL for production
- [ ] Add database encryption at rest
- [ ] Implement response caching for Faethm API (24-hour TTL)
- [ ] Performance optimization for dashboard load < 3 seconds
- [ ] API response time optimization (P95 < 500ms)
- [ ] Add role-specific throughput indicator configuration
- [ ] Build survey question rotation system (reduce fatigue)
- [ ] Create personalized benchmark lines per occupation

### Future Phases (Out of MVP Scope)
- [ ] Direct system telemetry integration
- [ ] Automated workflow agent suggestions
- [ ] Real-time task-level friction detection
- [ ] Integration with Pearson learning pathways

## Completed
- [x] Project initialization
- [x] Ralph configuration files created
- [x] PRD analysis and requirements extraction
- [x] Backend project structure with FastAPI
- [x] SQLAlchemy database configuration
- [x] All 10 data models created
- [x] Faethm client with mock data (5 occupations)
- [x] API endpoints: occupations, teams, surveys, responses
- [x] Basic test suite
- [x] Survey generation service with question mapping
- [x] 6 friction dimension question templates (18 questions)
- [x] Flow and Portfolio Balance question templates
- [x] POST /surveys/{id}/generate-questions endpoint
- [x] Core 4 Metrics calculation service (MetricsCalculator)
- [x] Flow, Friction, Safety, Portfolio Balance calculations
- [x] Metrics API endpoints (GET /teams/{id}/metrics, history, calculate)
- [x] 7-respondent privacy threshold enforcement
- [x] Trend direction calculation (UP/DOWN/STABLE)
- [x] RICE scoring service (OpportunityGenerator)
- [x] Opportunity generation from survey friction analysis
- [x] Opportunity API endpoints (CRUD + generate)
- [x] Opportunity status workflow implementation
- [x] RICE score recalculation on factor updates
- [x] React frontend project setup (Vite + TypeScript + Tailwind)
- [x] Frontend routing and layout components
- [x] API client with React Query hooks
- [x] Survey UI with progress bar and Likert scale
- [x] Team Dashboard with Core 4 metrics cards
- [x] Opportunity list and card components
- [x] Portfolio balance visualization
- [x] Friction Heatmap component with color-coded dimensions
- [x] GET /teams/{id}/metrics/friction-breakdown endpoint
- [x] MetricsTrendChart component with Recharts
- [x] Executive Dashboard with cross-team comparison
- [x] Radar chart for org health visualization
- [x] Bar chart for team metrics comparison
- [x] Survey save-and-resume: auto-save + resume from existing answers
- [x] Audit logging service with action types and sensitivity levels
- [x] Audit integration in metrics endpoints

## Notes

### MVP Target Occupations
- Product Managers
- Designers
- Sales Operations
- Finance Analysts
- Customer Experience Specialists

### Key Constraints to Remember
- **NO PII**: Anonymous tokens only, never traceable to individuals
- **7-respondent minimum**: Never show team data with fewer responses
- **< 7 minutes**: Survey must be completable in under 7 minutes
- **System diagnosis only**: This is NOT an employee performance system
- **Kaizen approach**: Small continuous improvements, not big-bang changes

### DEEP Framework Mapping
| Phase | KWeX Feature |
|-------|--------------|
| Diagnose | Survey + friction detection |
| Embed | Opportunity tracking + Kaizen cycles |
| Evaluate | Core 4 metrics |
| Prioritize | RICE scoring + dashboards |

### Risk Mitigations Built In
- Goodhart's Law → No individual-level data, metrics for system diagnosis only
- Low trust → Anonymity by design, leadership communication plan needed
- Survey fatigue → Short survey, question rotation, < 7 min target
- Insufficient Faethm data → Manual augmentation capability in MVP
