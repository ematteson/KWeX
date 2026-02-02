# KWeX - Knowledge Worker Experience Platform

## Product Specification & Requirements Document

**Version:** 2.0
**Last Updated:** February 2026
**Status:** Reference Implementation Complete (MVP)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [User Personas & Roles](#3-user-personas--roles)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Functional Requirements](#5-functional-requirements)
6. [Data Model Specification](#6-data-model-specification)
7. [API Specification](#7-api-specification)
8. [Frontend Specification](#8-frontend-specification)
9. [AI/LLM Integration](#9-aillm-integration)
10. [Security Requirements](#10-security-requirements)
11. [Performance Requirements](#11-performance-requirements)
12. [Suggested Improvements](#12-suggested-improvements)
13. [Technical Recommendations](#13-technical-recommendations)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

### 1.1 Product Overview

KWeX (Knowledge Worker Experience) is an enterprise platform designed to measure, diagnose, and improve knowledge-worker productivity through systematic friction identification and opportunity generation. The platform combines traditional survey methodology with AI-powered conversational interviews to gather actionable insights about workplace inefficiencies.

### 1.2 Core Value Proposition

- **Identify Hidden Friction**: Surfaces workflow blockers across 6 key dimensions
- **Privacy-First Design**: Anonymous data collection with statistical privacy thresholds
- **AI-Powered Insights**: Conversational surveys and automated opportunity generation
- **RICE-Prioritized Actions**: Data-driven prioritization of improvement initiatives
- **Psychological Safety Assessment**: Validated Edmondson scale integration

### 1.3 Key Metrics (Core 4)

| Metric | Description | Scale |
|--------|-------------|-------|
| **Flow Score** | Throughput and value delivery efficiency | 0-100 (higher = better) |
| **Friction Score** | Workflow inefficiency and blockers | 0-100 (lower = better) |
| **Safety Score** | Risk management and quality impact | 0-100 (higher = better) |
| **Portfolio Balance** | Work allocation health vs. ideal distribution | 0-100 (higher = better) |

### 1.4 Six Friction Dimensions

1. **Clarity** - Requirements understanding, priority clarity, information availability
2. **Tooling** - Tool effectiveness, technical reliability, information access
3. **Process** - Workflow clarity, approval efficiency, handoff effectiveness
4. **Rework** - Rework frequency, unclear requirements impact, decision stability
5. **Delay** - Wait times, dependency blocks, approval latency
6. **Safety** - Mistake tolerance, problem raising ability, risk comfort

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

*"Enable every organization to understand and eliminate the hidden friction that prevents knowledge workers from doing their best work."*

### 2.2 Strategic Goals

1. **Reduce Time-to-Insight**: From friction identification to actionable recommendations in <24 hours
2. **Maximize Participation**: Achieve >80% survey response rates through engaging AI conversations
3. **Protect Privacy**: Maintain complete respondent anonymity while delivering actionable team insights
4. **Drive Measurable Improvement**: Track friction reduction over time with quantified business impact

### 2.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Survey Completion Rate | >85% | Completed / Started |
| Average Completion Time | <7 minutes | Timestamp analysis |
| Privacy Threshold Met | >90% of teams | Teams with ≥7 responses |
| Opportunity Resolution Rate | >60% within 90 days | Status tracking |
| Friction Score Improvement | >15% per quarter | Trend analysis |

---

## 3. User Personas & Roles

### 3.1 Role Definitions

#### Platform Administrator
- **Responsibilities**: System configuration, user management, organization setup
- **Access Level**: Full system access, all teams, all data
- **Key Actions**: Create organizations, manage admins, configure LLM providers

#### Organization Administrator
- **Responsibilities**: Manage teams, occupations, surveys within organization
- **Access Level**: All teams within organization, survey management
- **Key Actions**: Create teams, sync occupations, manage surveys, view all metrics

#### Team Manager
- **Responsibilities**: Manage team surveys, view team metrics, track opportunities
- **Access Level**: Assigned teams only
- **Key Actions**: Create/activate surveys, view results, manage opportunities

#### Survey Respondent
- **Responsibilities**: Complete surveys honestly and anonymously
- **Access Level**: Token-based survey access only (no authentication required)
- **Key Actions**: Complete traditional or chat surveys

#### Executive/Viewer
- **Responsibilities**: Monitor cross-team metrics and trends
- **Access Level**: Read-only access to aggregated metrics
- **Key Actions**: View dashboards, export reports

### 3.2 Role Permission Matrix

| Action | Platform Admin | Org Admin | Team Manager | Viewer | Respondent |
|--------|---------------|-----------|--------------|--------|------------|
| Manage Organizations | ✓ | - | - | - | - |
| Manage Users | ✓ | Org only | - | - | - |
| Create Teams | ✓ | ✓ | - | - | - |
| Manage Teams | ✓ | ✓ | Assigned | - | - |
| Create Surveys | ✓ | ✓ | ✓ | - | - |
| View Team Metrics | ✓ | ✓ | Assigned | ✓ | - |
| View Executive Dashboard | ✓ | ✓ | - | ✓ | - |
| Manage Opportunities | ✓ | ✓ | ✓ | - | - |
| Complete Surveys | - | - | - | - | ✓ |
| Configure LLM | ✓ | - | - | - | - |

---

## 4. Authentication & Authorization

### 4.1 Authentication Strategy

#### 4.1.1 Primary Authentication Methods

**Option A: OAuth 2.0 / OIDC (Recommended for Enterprise)**
```
Supported Providers:
- Microsoft Entra ID (Azure AD)
- Okta
- Google Workspace
- Auth0
- Custom SAML 2.0 IdP
```

**Option B: Email/Password with MFA**
```
- Password requirements: 12+ chars, complexity rules
- MFA: TOTP (authenticator apps) or SMS
- Session management: JWT with refresh tokens
```

**Option C: API Key Authentication (Service-to-Service)**
```
- For integrations and automated systems
- Scoped permissions per key
- Rate limiting per key
```

#### 4.1.2 Survey Respondent Access (Tokenless Auth)

Survey respondents access surveys via unique, time-limited tokens without requiring authentication:

```
URL Format: /survey/{anonymous_token}
Token Properties:
- UUID v4 format
- Linked to specific survey
- Single-use or resumable
- Optional expiration
- No PII stored
```

### 4.2 Authorization Architecture

#### 4.2.1 RBAC (Role-Based Access Control)

```python
# Role Hierarchy
class Role(Enum):
    PLATFORM_ADMIN = "platform_admin"      # Super admin
    ORG_ADMIN = "org_admin"                # Organization-level admin
    TEAM_MANAGER = "team_manager"          # Team-level manager
    VIEWER = "viewer"                      # Read-only access
    RESPONDENT = "respondent"              # Survey access only

# Permission Definitions
class Permission(Enum):
    # Organization
    ORG_CREATE = "org:create"
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"

    # Team
    TEAM_CREATE = "team:create"
    TEAM_READ = "team:read"
    TEAM_UPDATE = "team:update"
    TEAM_DELETE = "team:delete"

    # Survey
    SURVEY_CREATE = "survey:create"
    SURVEY_READ = "survey:read"
    SURVEY_ACTIVATE = "survey:activate"
    SURVEY_CLOSE = "survey:close"
    SURVEY_DELETE = "survey:delete"

    # Metrics
    METRICS_READ = "metrics:read"
    METRICS_CALCULATE = "metrics:calculate"
    METRICS_EXPORT = "metrics:export"

    # Opportunities
    OPP_CREATE = "opportunity:create"
    OPP_READ = "opportunity:read"
    OPP_UPDATE = "opportunity:update"
    OPP_DELETE = "opportunity:delete"

    # Administration
    USER_MANAGE = "user:manage"
    LLM_CONFIGURE = "llm:configure"
    AUDIT_READ = "audit:read"
```

#### 4.2.2 Resource-Based Access Control

```python
# Team Assignment Model
class TeamMembership(Base):
    user_id: UUID
    team_id: UUID
    role: Role  # Role within this team
    assigned_at: datetime
    assigned_by: UUID

# Access Check Logic
def can_access_team(user: User, team_id: UUID) -> bool:
    if user.role == Role.PLATFORM_ADMIN:
        return True
    if user.role == Role.ORG_ADMIN:
        return team.organization_id == user.organization_id
    if user.role in [Role.TEAM_MANAGER, Role.VIEWER]:
        return TeamMembership.exists(user_id=user.id, team_id=team_id)
    return False
```

### 4.3 Session Management

#### 4.3.1 JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "org": "organization_id",
    "role": "team_manager",
    "teams": ["team_1", "team_2"],
    "permissions": ["survey:create", "metrics:read"],
    "iat": 1700000000,
    "exp": 1700003600,
    "jti": "unique_token_id"
  }
}
```

#### 4.3.2 Token Lifecycle

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token | 15 minutes | Via refresh token |
| Refresh Token | 7 days | Sliding window |
| Survey Token | Survey duration or 30 days | None (single-use) |
| API Key | 1 year | Manual rotation |

### 4.4 Multi-Tenancy

#### 4.4.1 Data Isolation Model

```
Organization (Tenant)
├── Users (org-scoped)
├── Teams (org-scoped)
├── Occupations (shared or org-specific)
├── Surveys (team-scoped)
├── Responses (survey-scoped, anonymous)
├── Metrics (team-scoped)
└── Opportunities (team-scoped)
```

#### 4.4.2 Database Strategy

**Option A: Schema-per-tenant (Recommended for compliance)**
```sql
-- Each organization gets own schema
CREATE SCHEMA org_acme;
CREATE TABLE org_acme.teams (...);

-- Query includes schema
SELECT * FROM org_acme.teams WHERE ...;
```

**Option B: Row-level security**
```sql
-- All tenants share tables with org_id column
CREATE POLICY team_isolation ON teams
    USING (org_id = current_setting('app.current_org')::uuid);
```

---

## 5. Functional Requirements

### 5.1 Survey Management

#### FR-SM-001: Survey Creation
**Priority:** P0 (Critical)

| Attribute | Specification |
|-----------|---------------|
| Description | Users can create surveys linked to teams and occupations |
| Input | Team ID, Occupation ID, Survey name, Type, Settings |
| Output | Survey record with draft status |
| Validation | Team exists, Occupation exists, Name unique per team |
| Authorization | `survey:create` permission + team access |

**Survey Types:**
- `CORE_FRICTION` - Standard 6-dimension friction assessment
- `PSYCHOLOGICAL_SAFETY` - Edmondson's 7-item validated scale
- `CUSTOM` - User-defined questions
- `CHAT_SURVEY` - AI-powered conversational interview

#### FR-SM-002: Question Generation
**Priority:** P0

| Attribute | Specification |
|-----------|---------------|
| Description | Generate survey questions covering all friction dimensions |
| Methods | Static templates, Task-specific, LLM-generated |
| Constraints | Max 18 questions (7-minute completion target) |
| Distribution | 3 questions per dimension |
| Output | Questions with metric mappings |

**Question Types:**
- `LIKERT_5` - 5-point agreement scale
- `LIKERT_7` - 7-point scale (psychological safety)
- `PERCENTAGE_SLIDER` - 0-100 continuous scale
- `MULTIPLE_CHOICE` - Predefined options
- `FREE_TEXT` - Open-ended response

#### FR-SM-003: Survey Lifecycle
**Priority:** P0

```
States: DRAFT → ACTIVE → CLOSED

Transitions:
- DRAFT → ACTIVE: Requires ≥1 question, triggers link generation
- ACTIVE → CLOSED: Manual or scheduled, stops accepting responses
- DRAFT → (deleted): Only draft surveys can be deleted
- Any → CLONED: Creates new DRAFT copy
```

#### FR-SM-004: Response Collection
**Priority:** P0

| Attribute | Specification |
|-----------|---------------|
| Access | Token-based, no authentication required |
| Privacy | No PII collected, anonymous tokens |
| Features | Auto-save (5s intervals), Resume capability |
| Completion | All required questions answered |

### 5.2 AI Chat Surveys

#### FR-CS-001: Chat Session Management
**Priority:** P1

| Attribute | Specification |
|-----------|---------------|
| Description | AI conducts conversational interview covering all 6 dimensions |
| Provider | Configurable (Claude/GPT via Azure Foundry) |
| Flow | Opening → Dimension exploration → Rating extraction → Confirmation |
| Output | Extracted ratings, transcript, summary |

**Chat Session States:**
```
STARTED → IN_PROGRESS → RATING_CONFIRMATION → COMPLETED
                     ↘ ABANDONED
```

#### FR-CS-002: Rating Extraction
**Priority:** P1

| Attribute | Specification |
|-----------|---------------|
| Process | AI analyzes conversation, infers 1-5 score per dimension |
| Confidence | 0-1 confidence score per extraction |
| Confirmation | User confirms or adjusts AI-inferred score |
| Evidence | Key quotes extracted for transparency |

#### FR-CS-003: Summary Generation
**Priority:** P2

| Attribute | Specification |
|-----------|---------------|
| Components | Executive summary, Pain points, Positives, Suggestions |
| Sentiment | Overall + per-dimension sentiment analysis |
| Output | Stored for review, contributes to team insights |

### 5.3 Metrics Calculation

#### FR-MC-001: Core 4 Metrics
**Priority:** P0

| Metric | Calculation | Inputs |
|--------|-------------|--------|
| Flow Score | Weighted average of throughput indicators | Clarity, Delay questions |
| Friction Score | Sum of friction indicators | All 6 dimensions |
| Safety Score | Inverse of risk indicators + psych safety | Safety, Rework questions |
| Portfolio Balance | Deviation from ideal allocation | Time allocation data |

#### FR-MC-002: Privacy Threshold
**Priority:** P0

| Attribute | Specification |
|-----------|---------------|
| Threshold | Minimum 7 completed responses |
| Enforcement | Metrics hidden until threshold met |
| Messaging | Clear feedback on responses needed |
| Configurable | Admin can adjust per organization |

#### FR-MC-003: Trend Analysis
**Priority:** P1

| Attribute | Specification |
|-----------|---------------|
| Direction | UP, DOWN, STABLE based on previous result |
| History | Store all calculations with timestamps |
| Visualization | Line charts showing metric evolution |

### 5.4 Opportunity Management

#### FR-OP-001: Opportunity Generation
**Priority:** P1

| Attribute | Specification |
|-----------|---------------|
| Trigger | Survey completion with sufficient responses |
| Source | High-friction dimensions and specific signals |
| Output | RICE-scored improvement recommendations |

#### FR-OP-002: RICE Scoring
**Priority:** P1

```
RICE Score = (Reach × Impact × Confidence) / Effort

Components:
- Reach: Number of affected team members (integer)
- Impact: Severity scale (0.25 minimal → 3.0 massive)
- Confidence: Data quality (0.5 low → 1.0 high)
- Effort: Implementation effort in person-weeks
```

**Default Effort by Dimension:**
| Dimension | Default Effort |
|-----------|----------------|
| Clarity | 2.0 weeks |
| Tooling | 4.0 weeks |
| Process | 3.0 weeks |
| Rework | 3.0 weeks |
| Delay | 2.5 weeks |
| Safety | 2.0 weeks |

#### FR-OP-003: Opportunity Workflow
**Priority:** P1

```
States: IDENTIFIED → IN_PROGRESS → COMPLETED
                  ↘ DEFERRED

Actions by State:
- IDENTIFIED: Start Working, Defer
- IN_PROGRESS: Mark Complete, Defer, Reopen
- COMPLETED: Reopen
- DEFERRED: Reopen
```

### 5.5 Psychological Safety Assessment

#### FR-PS-001: Edmondson Scale Implementation
**Priority:** P1

| Attribute | Specification |
|-----------|---------------|
| Scale | Validated 7-item Edmondson Psychological Safety Scale |
| Scoring | 7-point Likert (Strongly Disagree → Strongly Agree) |
| Reverse Items | Items 1, 3, 5 are reverse-scored |
| Output | Overall score (1-7), dimension breakdown |

**The 7 Items (Do Not Modify):**
1. If you make a mistake on this team, it is often held against you (R)
2. Members of this team are able to bring up problems and tough issues
3. People on this team sometimes reject others for being different (R)
4. It is safe to take a risk on this team
5. It is difficult to ask other members of this team for help (R)
6. No one on this team would deliberately act in a way that undermines my efforts
7. Working with members of this team, my unique skills and talents are valued and utilized

### 5.6 Task & Occupation Management

#### FR-TO-001: Occupation Sync
**Priority:** P2

| Attribute | Specification |
|-----------|---------------|
| Source | Faethm occupation database (or mock) |
| Data | Name, Code, Description, Ideal portfolio allocation |
| Enrichment | LLM can enhance task descriptions |

#### FR-TO-002: Task Library
**Priority:** P2

| Attribute | Specification |
|-----------|---------------|
| Global Tasks | Shared across occupations |
| Assignment | Map tasks to occupations with time allocation |
| Categories | CORE, SUPPORT, ADMIN |
| Custom Tasks | User-created tasks in addition to Faethm |

---

## 6. Data Model Specification

### 6.1 Entity Relationship Diagram

```
┌─────────────────┐
│  Organization   │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐      ┌─────────────────┐
│      User       │──────│  TeamMembership │
└─────────────────┘      └────────┬────────┘
                                  │ N:1
                                  ▼
┌─────────────────┐      ┌─────────────────┐
│   Occupation    │◄─────│      Team       │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │ M:N                    │ 1:N
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│ OccupationTask  │      │     Survey      │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │ N:1                    │ 1:N
         ▼                        ├──────────────┐
┌─────────────────┐               │              │
│   GlobalTask    │               ▼              ▼
└─────────────────┘      ┌─────────────┐  ┌─────────────┐
                         │  Question   │  │  Response   │
                         └──────┬──────┘  └──────┬──────┘
                                │                │
                                │ 1:N            │ 1:1 (optional)
                                ▼                ▼
                         ┌─────────────┐  ┌─────────────┐
                         │   Answer    │  │ ChatSession │
                         └─────────────┘  └──────┬──────┘
                                                 │ 1:N
                         ┌───────────────────────┼───────────────────┐
                         │                       │                   │
                         ▼                       ▼                   ▼
                  ┌─────────────┐       ┌───────────────┐    ┌─────────────┐
                  │ ChatMessage │       │ChatExtracted  │    │ ChatSummary │
                  └─────────────┘       │    Rating     │    └─────────────┘
                                        └───────────────┘
```

### 6.2 Core Entities

#### 6.2.1 Organization (NEW - for multi-tenancy)

```python
class Organization(Base):
    __tablename__ = "organizations"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    name: str = Field(max_length=255)
    slug: str = Field(max_length=100, unique=True)  # URL-safe identifier

    # Settings
    privacy_threshold: int = Field(default=7)
    max_survey_duration_days: int = Field(default=30)
    default_llm_provider: str = Field(default="claude")

    # Subscription (future)
    plan: str = Field(default="free")  # free, pro, enterprise
    seats_limit: Optional[int] = None

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID]  # User ID

    # Relationships
    users: List["User"] = Relationship(back_populates="organization")
    teams: List["Team"] = Relationship(back_populates="organization")
```

#### 6.2.2 User (NEW - for authentication)

```python
class User(Base):
    __tablename__ = "users"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    organization_id: UUID = Field(foreign_key="organizations.id")

    # Identity
    email: str = Field(max_length=255, unique=True)
    name: str = Field(max_length=255)

    # Authentication (if not using external IdP)
    password_hash: Optional[str] = None
    mfa_secret: Optional[str] = None
    mfa_enabled: bool = Field(default=False)

    # External Identity
    external_id: Optional[str] = None  # IdP user ID
    identity_provider: Optional[str] = None  # "azure_ad", "okta", etc.

    # Role & Status
    role: Role = Field(default=Role.VIEWER)
    is_active: bool = Field(default=True)
    last_login_at: Optional[datetime] = None

    # Audit
    created_at: datetime
    updated_at: datetime

    # Relationships
    organization: "Organization" = Relationship(back_populates="users")
    team_memberships: List["TeamMembership"] = Relationship()
```

#### 6.2.3 Team

```python
class Team(Base):
    __tablename__ = "teams"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    organization_id: UUID = Field(foreign_key="organizations.id")
    occupation_id: Optional[UUID] = Field(foreign_key="occupations.id")

    name: str = Field(max_length=255)
    function: Optional[str] = Field(max_length=100)  # Department
    member_count: int = Field(default=0, ge=0)

    # Metadata
    description: Optional[str] = None
    location: Optional[str] = None
    cost_center: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    # Relationships
    organization: "Organization" = Relationship(back_populates="teams")
    occupation: Optional["Occupation"] = Relationship()
    surveys: List["Survey"] = Relationship(back_populates="team")
    metric_results: List["MetricResult"] = Relationship()
    opportunities: List["Opportunity"] = Relationship()
```

#### 6.2.4 Survey

```python
class SurveyType(str, Enum):
    CORE_FRICTION = "core_friction"
    PSYCHOLOGICAL_SAFETY = "psychological_safety"
    CUSTOM = "custom"
    CHAT_SURVEY = "chat_survey"

class SurveyStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"

class Survey(Base):
    __tablename__ = "surveys"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    team_id: UUID = Field(foreign_key="teams.id")
    occupation_id: Optional[UUID] = Field(foreign_key="occupations.id")

    name: str = Field(max_length=255)
    survey_type: SurveyType
    status: SurveyStatus = Field(default=SurveyStatus.DRAFT)

    # Settings
    anonymous_mode: bool = Field(default=True)
    estimated_completion_minutes: int = Field(default=7)
    allow_chat_mode: bool = Field(default=True)

    # Lifecycle
    created_at: datetime
    activated_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Audit
    created_by: Optional[UUID] = None

    # Relationships
    team: "Team" = Relationship(back_populates="surveys")
    questions: List["Question"] = Relationship(back_populates="survey")
    responses: List["Response"] = Relationship(back_populates="survey")
```

#### 6.2.5 Question

```python
class QuestionType(str, Enum):
    LIKERT_5 = "likert_5"
    LIKERT_7 = "likert_7"
    MULTIPLE_CHOICE = "multiple_choice"
    PERCENTAGE_SLIDER = "percentage_slider"
    FREE_TEXT = "free_text"

class FrictionType(str, Enum):
    CLARITY = "clarity"
    TOOLING = "tooling"
    PROCESS = "process"
    REWORK = "rework"
    DELAY = "delay"
    SAFETY = "safety"

class Question(Base):
    __tablename__ = "questions"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    survey_id: UUID = Field(foreign_key="surveys.id")
    task_id: Optional[UUID] = Field(foreign_key="tasks.id")
    friction_signal_id: Optional[UUID] = Field(foreign_key="friction_signals.id")

    text: str = Field(max_length=1000)
    type: QuestionType
    dimension: FrictionType

    # Configuration
    options: Optional[dict] = None  # {choices: [], low_label, high_label}
    metric_mapping: List[str] = Field(default_factory=list)  # ["FLOW", "FRICTION"]
    order: int = Field(default=0)
    required: bool = Field(default=True)

    # LLM Generation
    generation_method: str = Field(default="static")  # static, llm_generated, llm_cached
    llm_template_id: Optional[UUID] = None

    # Relationships
    survey: "Survey" = Relationship(back_populates="questions")
    answers: List["Answer"] = Relationship(back_populates="question")
```

#### 6.2.6 Response & Answer

```python
class Response(Base):
    __tablename__ = "responses"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    survey_id: UUID = Field(foreign_key="surveys.id")

    anonymous_token: UUID = Field(default_factory=uuid4, unique=True)

    # Progress
    is_complete: bool = Field(default=False)
    started_at: datetime
    submitted_at: Optional[datetime] = None
    completion_time_seconds: Optional[int] = None

    # Metadata (anonymous)
    user_agent: Optional[str] = None

    # Relationships
    survey: "Survey" = Relationship(back_populates="responses")
    answers: List["Answer"] = Relationship(back_populates="response")
    chat_session: Optional["ChatSession"] = Relationship(back_populates="response")

class Answer(Base):
    __tablename__ = "answers"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    response_id: UUID = Field(foreign_key="responses.id")
    question_id: UUID = Field(foreign_key="questions.id")

    value: str  # Raw answer value
    numeric_value: Optional[float] = None  # Normalized 0-100
    comment: Optional[str] = None  # Optional free-text comment

    created_at: datetime

    # Relationships
    response: "Response" = Relationship(back_populates="answers")
    question: "Question" = Relationship(back_populates="answers")
```

#### 6.2.7 MetricResult

```python
class MetricType(str, Enum):
    FLOW = "flow"
    FRICTION = "friction"
    SAFETY = "safety"
    PORTFOLIO_BALANCE = "portfolio_balance"

class TrendDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"

class MetricResult(Base):
    __tablename__ = "metric_results"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    team_id: UUID = Field(foreign_key="teams.id")
    survey_id: UUID = Field(foreign_key="surveys.id")

    calculation_date: datetime
    respondent_count: int
    meets_privacy_threshold: bool

    # Core 4 Scores (0-100)
    flow_score: Optional[float] = None
    friction_score: Optional[float] = None
    safety_score: Optional[float] = None
    portfolio_balance_score: Optional[float] = None

    # Breakdowns (JSON)
    flow_breakdown: Optional[dict] = None
    friction_breakdown: Optional[dict] = None
    safety_breakdown: Optional[dict] = None
    portfolio_breakdown: Optional[dict] = None

    # Trend
    previous_result_id: Optional[UUID] = None
    trend_direction: Optional[TrendDirection] = None
```

#### 6.2.8 Opportunity

```python
class OpportunityStatus(str, Enum):
    IDENTIFIED = "identified"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEFERRED = "deferred"

class Opportunity(Base):
    __tablename__ = "opportunities"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    team_id: UUID = Field(foreign_key="teams.id")
    survey_id: Optional[UUID] = Field(foreign_key="surveys.id")
    friction_signal_id: Optional[UUID] = Field(foreign_key="friction_signals.id")

    friction_type: FrictionType
    title: str = Field(max_length=255)
    description: Optional[str] = None

    # RICE Components
    reach: int = Field(ge=0)
    impact: float = Field(ge=0.25, le=3.0)
    confidence: float = Field(ge=0, le=1.0)
    effort: float = Field(gt=0)
    rice_score: float  # Calculated

    source_score: Optional[float] = None  # Triggering metric

    # Workflow
    status: OpportunityStatus = Field(default=OpportunityStatus.IDENTIFIED)
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Assignment (future)
    assigned_to: Optional[UUID] = None
```

#### 6.2.9 Chat Survey Entities

```python
class ChatSessionStatus(str, Enum):
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    RATING_CONFIRMATION = "rating_confirmation"
    COMPLETED = "completed"
    ABANDONED = "abandoned"

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    survey_id: UUID = Field(foreign_key="surveys.id")
    response_id: UUID = Field(foreign_key="responses.id", unique=True)

    anonymous_token: UUID = Field(unique=True)
    status: ChatSessionStatus

    # Progress
    current_dimension: Optional[FrictionType] = None
    dimensions_covered: dict = Field(default_factory=dict)  # {dim: bool}

    # LLM Config
    llm_provider: str  # "claude" or "gpt"

    # Timing
    started_at: datetime
    completed_at: Optional[datetime] = None
    last_activity_at: datetime

    # Usage
    total_tokens_input: int = Field(default=0)
    total_tokens_output: int = Field(default=0)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    session_id: UUID = Field(foreign_key="chat_sessions.id")

    role: str  # "system", "assistant", "user"
    content: str
    dimension_context: Optional[FrictionType] = None
    is_rating_confirmation: bool = Field(default=False)
    sequence: int

    created_at: datetime
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    latency_ms: Optional[int] = None

class ChatExtractedRating(Base):
    __tablename__ = "chat_extracted_ratings"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    session_id: UUID = Field(foreign_key="chat_sessions.id")

    dimension: FrictionType
    ai_inferred_score: float  # 1-5 scale
    ai_confidence: float  # 0-1
    ai_reasoning: Optional[str] = None

    user_confirmed: bool = Field(default=False)
    user_adjusted_score: Optional[float] = None
    final_score: float  # Normalized 0-100

    key_quotes: Optional[list] = None
    summary_comment: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    __table_args__ = (
        UniqueConstraint('session_id', 'dimension'),
    )

class ChatSummary(Base):
    __tablename__ = "chat_summaries"

    id: UUID = Field(primary_key=True, default_factory=uuid4)
    session_id: UUID = Field(foreign_key="chat_sessions.id", unique=True)

    executive_summary: str
    key_pain_points: list  # [{dimension, description, severity}]
    positive_aspects: list
    improvement_suggestions: list
    overall_sentiment: str  # positive, neutral, negative
    dimension_sentiments: dict  # {dimension: sentiment}

    created_at: datetime
```

### 6.3 Audit & Logging Entities

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: UUID = Field(primary_key=True, default_factory=uuid4)

    # Who
    user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # What
    action: str  # "survey.created", "metrics.viewed", etc.
    resource_type: str  # "survey", "team", "metrics"
    resource_id: Optional[UUID] = None

    # Details
    details: Optional[dict] = None

    # When
    created_at: datetime

class LLMGenerationLog(Base):
    __tablename__ = "llm_generation_logs"

    id: UUID = Field(primary_key=True, default_factory=uuid4)

    operation_type: str  # task_enrichment, question_generation, etc.
    model_used: str
    prompt_version: str

    input_context: dict
    output_data: dict

    tokens_input: int
    tokens_output: int
    latency_ms: int

    success: bool
    error_message: Optional[str] = None

    occupation_id: Optional[UUID] = None
    survey_id: Optional[UUID] = None

    created_at: datetime
```

---

## 7. API Specification

### 7.1 API Design Principles

- **RESTful**: Resource-oriented URLs, standard HTTP methods
- **Versioned**: `/api/v1/` prefix for all endpoints
- **JSON**: Request/response bodies in JSON format
- **Paginated**: List endpoints support `skip` and `limit` parameters
- **Authenticated**: Bearer token required except survey response endpoints

### 7.2 Authentication Endpoints

```yaml
POST /api/v1/auth/login
  Description: Authenticate user and receive tokens
  Request:
    email: string
    password: string
    mfa_code?: string
  Response:
    access_token: string
    refresh_token: string
    expires_in: number
    user: UserResponse

POST /api/v1/auth/refresh
  Description: Refresh access token
  Request:
    refresh_token: string
  Response:
    access_token: string
    expires_in: number

POST /api/v1/auth/logout
  Description: Invalidate refresh token
  Headers: Authorization: Bearer <access_token>
  Response: 204 No Content

GET /api/v1/auth/me
  Description: Get current user profile
  Headers: Authorization: Bearer <access_token>
  Response: UserResponse

POST /api/v1/auth/oauth/callback/{provider}
  Description: OAuth callback endpoint
  Query: code, state
  Response: Redirect with tokens
```

### 7.3 Survey Endpoints

```yaml
# Survey Management
GET /api/v1/surveys
  Description: List surveys (filtered by access)
  Query: status?, team_id?, survey_type?, skip?, limit?
  Response: List[SurveyResponse]

POST /api/v1/surveys
  Description: Create new survey
  Request: SurveyCreate
  Response: 201 SurveyResponse

GET /api/v1/surveys/{survey_id}
  Description: Get survey details
  Response: SurveyResponse

PUT /api/v1/surveys/{survey_id}
  Description: Update survey (draft only)
  Request: SurveyUpdate
  Response: SurveyResponse

DELETE /api/v1/surveys/{survey_id}
  Description: Delete survey (draft only)
  Response: 204 No Content

# Survey Lifecycle
POST /api/v1/surveys/{survey_id}/generate-questions
  Description: Generate survey questions
  Query: use_task_specific?, use_llm?, max_questions?
  Response: List[QuestionResponse]

POST /api/v1/surveys/{survey_id}/activate
  Description: Activate survey for responses
  Response: SurveyResponse

POST /api/v1/surveys/{survey_id}/close
  Description: Close survey
  Response: SurveyResponse

POST /api/v1/surveys/{survey_id}/clone
  Description: Clone survey to draft
  Request: {new_name?, new_team_id?}
  Response: 201 SurveyResponse

GET /api/v1/surveys/{survey_id}/link
  Description: Generate response link
  Response: {token: string, url: string}

GET /api/v1/surveys/{survey_id}/stats
  Description: Get response statistics
  Response: SurveyStats

# Anonymous Response Collection (No Auth Required)
GET /api/v1/respond/{token}
  Description: Get survey for anonymous response
  Response: SurveyWithQuestionsResponse

POST /api/v1/respond/{token}
  Description: Submit completed survey
  Request: List[AnswerSubmit]
  Response: {message: string}

PUT /api/v1/respond/{token}
  Description: Save partial progress
  Request: List[AnswerSubmit]
  Response: {message: string}
```

### 7.4 Chat Survey Endpoints

```yaml
POST /api/v1/chat-surveys
  Description: Start new chat survey session
  Request: {survey_id: UUID, llm_provider?: string}
  Response: 201 ChatSessionResponse

GET /api/v1/chat-surveys/{token}
  Description: Get session with messages
  Response: ChatSessionWithMessagesResponse

POST /api/v1/chat-surveys/{token}/message
  Description: Send user message
  Request: {content: string}
  Response: ChatMessageResponse (includes AI response)

POST /api/v1/chat-surveys/{token}/confirm-rating
  Description: Confirm or adjust rating
  Request: {dimension: FrictionType, confirmed: bool, adjusted_score?: float}
  Response: RatingConfirmationResponse

POST /api/v1/chat-surveys/{token}/complete
  Description: Complete session and calculate metrics
  Response: ChatCompletionResponse

GET /api/v1/chat-surveys/{token}/transcript
  Description: Get full transcript
  Response: List[ChatMessageResponse]

POST /api/v1/chat-surveys/{token}/abandon
  Description: Mark session as abandoned
  Response: {message: string}
```

### 7.5 Metrics Endpoints

```yaml
GET /api/v1/teams/{team_id}/metrics
  Description: Get current metrics
  Response: MetricResultResponse | {message: string, meets_privacy_threshold: false}

GET /api/v1/teams/{team_id}/metrics/history
  Description: Get historical metrics
  Query: limit?
  Response: List[MetricResultResponse]

GET /api/v1/teams/{team_id}/metrics/friction-breakdown
  Description: Get friction heatmap data
  Response: {dimensions: List[{dimension, score, label}]}

POST /api/v1/teams/{team_id}/metrics/calculate
  Description: Recalculate metrics from latest survey
  Response: MetricResultResponse
```

### 7.6 Opportunity Endpoints

```yaml
GET /api/v1/teams/{team_id}/opportunities/summary
  Description: Get summary statistics
  Response: OpportunitySummary

GET /api/v1/teams/{team_id}/opportunities
  Description: List opportunities
  Query: status?, friction_type?, skip?, limit?
  Response: List[OpportunityResponse]

POST /api/v1/teams/{team_id}/opportunities
  Description: Create manual opportunity
  Request: OpportunityCreate
  Response: 201 OpportunityResponse

GET /api/v1/teams/{team_id}/opportunities/{opp_id}
  Description: Get opportunity details
  Response: OpportunityResponse

PATCH /api/v1/teams/{team_id}/opportunities/{opp_id}
  Description: Update opportunity
  Request: OpportunityUpdate
  Response: OpportunityResponse

DELETE /api/v1/teams/{team_id}/opportunities/{opp_id}
  Description: Delete opportunity
  Response: 204 No Content

POST /api/v1/teams/{team_id}/surveys/{survey_id}/generate-opportunities
  Description: Generate opportunities from survey
  Response: {opportunities_created: int, opportunities: List[OpportunityResponse]}
```

### 7.7 Team & Organization Endpoints

```yaml
# Teams
GET /api/v1/teams
  Description: List teams (filtered by access)
  Response: List[TeamResponse]

POST /api/v1/teams
  Description: Create team
  Request: TeamCreate
  Response: 201 TeamResponse

GET /api/v1/teams/{team_id}
  Description: Get team details
  Response: TeamResponse

PUT /api/v1/teams/{team_id}
  Description: Update team
  Request: TeamUpdate
  Response: TeamResponse

DELETE /api/v1/teams/{team_id}
  Description: Delete team
  Response: 204 No Content

POST /api/v1/teams/upload-csv
  Description: Bulk upload teams
  Request: multipart/form-data (CSV file)
  Response: {created: int, errors: List[string]}

# Occupations
GET /api/v1/occupations
  Description: List occupations
  Query: skip?, limit?
  Response: List[OccupationResponse]

GET /api/v1/occupations/search
  Description: Search occupations
  Query: q (min 2 chars)
  Response: List[OccupationResponse]

POST /api/v1/occupations/sync
  Description: Sync from Faethm
  Request: {codes?: List[string], search?: string, limit?: int}
  Response: {synced: int, occupations: List[OccupationResponse]}
```

### 7.8 Psychological Safety Endpoints

```yaml
POST /api/v1/surveys/psych-safety
  Description: Create psychological safety survey
  Request: {team_id: UUID, name: string}
  Response: 201 SurveyResponse

GET /api/v1/surveys/{survey_id}/psych-safety-results
  Description: Get overall score
  Response: PsychSafetyResultResponse

GET /api/v1/surveys/{survey_id}/psych-safety-dimensions
  Description: Get dimension breakdown
  Response: PsychSafetyDimensionsResponse
```

### 7.9 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Survey name is required",
    "details": {
      "field": "name",
      "reason": "required"
    }
  },
  "request_id": "uuid"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## 8. Frontend Specification

### 8.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Routing | React Router | 6.x |
| State Management | React Query | 5.x |
| Styling | styled-components | 6.x |
| Charts | Recharts | 2.x |
| HTTP Client | Axios | 1.x |

### 8.2 Page Structure

```
/                       → Redirect to /executive
/login                  → Login page (NEW)
/executive              → Executive dashboard
/teams                  → Teams list
/teams/:teamId          → Team dashboard
/teams/:teamId/opportunities → Opportunity management
/occupations/:occupationId → Task curation
/survey/:token          → Survey landing (mode selection)
/survey/:token/form     → Traditional form survey
/chat/:token            → AI chat survey
/survey/complete        → Completion confirmation
/settings               → User settings (NEW)
/admin                  → Admin panel (NEW)
```

### 8.3 Component Architecture

```
src/
├── api/
│   ├── client.ts           # Axios instance with auth interceptor
│   ├── hooks.ts            # React Query hooks
│   └── types.ts            # TypeScript interfaces
├── auth/
│   ├── AuthContext.tsx     # Authentication state
│   ├── ProtectedRoute.tsx  # Route guard
│   └── useAuth.ts          # Auth hook
├── components/
│   ├── common/             # Shared UI components
│   ├── charts/             # Chart components
│   ├── forms/              # Form components
│   ├── layout/             # Layout components
│   └── modals/             # Modal components
├── design-system/
│   ├── theme.ts            # Design tokens
│   ├── components.ts       # Styled components
│   └── GlobalStyles.ts     # Global CSS
├── hooks/
│   └── usePermissions.ts   # Permission checking
├── pages/
│   └── [page].tsx          # Page components
└── utils/
    └── [utility].ts        # Utility functions
```

### 8.4 Design System

#### Color Palette

```typescript
const colors = {
  primary: {
    50: '#E6F7FC',
    100: '#B3E8F5',
    200: '#80D9EE',
    300: '#4DCAE7',
    400: '#26BEE0',
    500: '#0080A7',  // Primary brand
    600: '#006B8C',
    700: '#005671',
    800: '#004156',
    900: '#002733',
  },
  semantic: {
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  friction: {
    clarity: { bg: '#DBEAFE', text: '#1E40AF' },
    tooling: { bg: '#F3E8FF', text: '#6B21A8' },
    process: { bg: '#FEF3C7', text: '#92400E' },
    rework: { bg: '#FEE2E2', text: '#991B1B' },
    delay: { bg: '#FFEDD5', text: '#9A3412' },
    safety: { bg: '#D1FAE5', text: '#065F46' },
  },
};
```

#### Typography

```typescript
const typography = {
  fontFamily: '"Open Sans", sans-serif',
  sizes: {
    display: '3rem',
    titleXL: '2.5rem',
    titleL: '2rem',
    titleM: '1.5rem',
    titleS: '1.25rem',
    body: '1rem',
    bodySmall: '0.875rem',
    helper: '0.75rem',
  },
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
  },
};
```

#### Spacing

```typescript
const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
};
```

### 8.5 Key User Flows

#### Flow 1: User Login
```
1. Navigate to /login
2. Enter credentials or click SSO provider
3. OAuth redirect (if SSO)
4. Receive tokens, store in memory/httpOnly cookie
5. Redirect to /executive
```

#### Flow 2: Create & Distribute Survey
```
1. Navigate to /teams/:teamId
2. Click "Create Survey"
3. Select type, occupation, enter name
4. Click "Generate Questions" (optional: review/edit)
5. Click "Activate"
6. Click "Get Link" → Copy shareable URL
7. Distribute to team members
```

#### Flow 3: Complete Survey (Traditional)
```
1. Receive survey link (/survey/:token)
2. Choose "Traditional Form" mode
3. Answer questions with Likert scales
4. Add optional comments
5. Progress auto-saves every 5s
6. Click "Submit" when complete
7. View completion confirmation
```

#### Flow 4: Complete Survey (AI Chat)
```
1. Receive survey link (/survey/:token)
2. Choose "Chat with AI" mode
3. AI greets and asks about first dimension
4. User responds naturally
5. AI extracts rating, asks for confirmation
6. User confirms or adjusts (1-5 scale)
7. Repeat for all 6 dimensions
8. Click "Complete" → View summary
```

#### Flow 5: Review Metrics
```
1. Navigate to /teams/:teamId
2. View Core 4 metric cards
3. Review friction heatmap
4. Click "View History" for trends
5. Navigate to opportunities
6. Filter by status, update progress
```

### 8.6 Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
};
```

---

## 9. AI/LLM Integration

### 9.1 Supported Providers

| Provider | Model | Use Cases |
|----------|-------|-----------|
| Anthropic (Claude) | claude-sonnet-4-5 | Chat surveys, question generation |
| OpenAI (GPT) | gpt-4o | Chat surveys, task enrichment |

### 9.2 Integration Architecture

```
┌─────────────────┐
│    KWeX API     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Service    │
│  (Abstraction)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Claude│ │  GPT  │
│(Azure)│ │(Azure)│
└───────┘ └───────┘
```

### 9.3 LLM Operations

#### 9.3.1 Chat Survey Conversation

**System Prompt Structure:**
```
You are a friendly workplace experience interviewer helping understand
friction in daily work. Your goal is to explore 6 dimensions of workflow
friction: clarity, tooling, process, rework, delay, and safety.

Guidelines:
- Be conversational and empathetic
- Ask one question at a time
- Probe deeper when responses are vague
- Extract specific examples when possible
- After exploring a dimension, summarize and confirm understanding
```

**Rating Extraction Prompt:**
```
Based on the conversation about {dimension}, extract a rating from 1-5:
1 = Severe problems, major friction
2 = Significant issues
3 = Moderate, some friction
4 = Minor issues
5 = Excellent, no friction

Provide:
- score: The extracted rating (1-5)
- confidence: Your confidence level (0-1)
- reasoning: Brief explanation
- key_quotes: Supporting quotes from the conversation
```

#### 9.3.2 Question Generation

**Input Context:**
```json
{
  "occupation": "Software Engineer",
  "tasks": [
    {"name": "Code Review", "category": "CORE", "time_pct": 20},
    {"name": "Documentation", "category": "SUPPORT", "time_pct": 10}
  ],
  "dimension": "clarity",
  "existing_questions": ["..."]
}
```

**Output Format:**
```json
{
  "question": "How often do you receive clear requirements before starting a task?",
  "type": "likert_5",
  "options": {
    "low_label": "Never",
    "high_label": "Always"
  },
  "metric_mapping": ["FLOW", "FRICTION"]
}
```

#### 9.3.3 Task Enrichment

**Output Schema:**
```json
{
  "skill_requirements": ["Python", "Code Review", "Communication"],
  "complexity_level": "MEDIUM",
  "collaboration_level": "TEAM",
  "typical_friction_points": [
    {"type": "clarity", "description": "Unclear review criteria"},
    {"type": "delay", "description": "Waiting for reviewer availability"}
  ]
}
```

### 9.4 Caching Strategy

```python
# Question Cache Logic
def get_or_generate_question(task_signature, dimension):
    # Check cache first
    cached = db.query(LLMQuestionTemplate).filter(
        task_signature=task_signature,
        dimension=dimension,
        quality_score >= MIN_QUALITY
    ).first()

    if cached:
        cached.usage_count += 1
        cached.last_used_at = datetime.utcnow()
        return cached.to_question()

    # Generate new
    question = llm_client.generate_question(task_signature, dimension)

    # Cache if quality meets threshold
    if question.quality_score >= MIN_QUALITY:
        db.add(LLMQuestionTemplate(
            task_signature=task_signature,
            dimension=dimension,
            question_text=question.text,
            quality_score=question.quality_score,
            ...
        ))

    return question
```

### 9.5 Token Usage & Limits

| Operation | Est. Input Tokens | Est. Output Tokens | Frequency |
|-----------|-------------------|--------------------|-----------|
| Chat turn | 500-2000 | 100-300 | Per message |
| Rating extraction | 1000-3000 | 100-200 | Per dimension |
| Summary generation | 2000-5000 | 300-500 | Per session |
| Question generation | 500-1000 | 100-200 | Per question |
| Task enrichment | 300-500 | 200-400 | Per task |

**Rate Limits (Recommended):**
- Per-user: 100 requests/minute
- Per-organization: 1000 requests/minute
- Per-session: 50 messages max

---

## 10. Security Requirements

### 10.1 Data Protection

#### 10.1.1 Encryption

| Data State | Method |
|------------|--------|
| In Transit | TLS 1.3 (HTTPS) |
| At Rest | AES-256 |
| Database | Transparent Data Encryption (TDE) |
| Backups | Encrypted with separate key |

#### 10.1.2 PII Handling

**No PII Collected in Surveys:**
- Anonymous tokens (UUID, not linked to user)
- No names, emails, or identifying information
- IP addresses logged separately (audit only)

**User PII (Authenticated Users):**
- Email, name stored encrypted
- Password hashed with bcrypt (cost factor 12)
- MFA secrets encrypted

### 10.2 Access Control

#### 10.2.1 API Security

```yaml
Headers Required:
  Authorization: Bearer <jwt_token>
  X-Request-ID: <uuid>

Rate Limiting:
  - Anonymous: 10 requests/minute
  - Authenticated: 100 requests/minute
  - Admin: 500 requests/minute

CORS:
  - Allowed origins from whitelist
  - Credentials: true
  - Max age: 86400
```

#### 10.2.2 Input Validation

```python
# Pydantic model validation
class SurveyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    team_id: UUID
    survey_type: SurveyType

    @validator('name')
    def sanitize_name(cls, v):
        return html.escape(v.strip())
```

### 10.3 Audit Logging

**Logged Events:**
- Authentication (login, logout, failures)
- Authorization (permission denials)
- Data access (metrics viewed, surveys accessed)
- Data modification (create, update, delete)
- LLM operations (for cost tracking)

**Log Retention:**
- Security events: 2 years
- Access logs: 90 days
- LLM logs: 30 days

### 10.4 Privacy Compliance

#### 10.4.1 Privacy Threshold

```python
PRIVACY_THRESHOLD = 7  # Minimum responses before showing metrics

def check_privacy(survey_id: UUID) -> bool:
    response_count = db.query(Response).filter(
        Response.survey_id == survey_id,
        Response.is_complete == True
    ).count()
    return response_count >= PRIVACY_THRESHOLD
```

#### 10.4.2 GDPR Considerations

- Data minimization: Only collect necessary data
- Purpose limitation: Data used only for friction analysis
- Right to erasure: Organizations can delete their data
- Data portability: Export functionality for metrics

---

## 11. Performance Requirements

### 11.1 Response Time Targets

| Endpoint Category | P50 | P95 | P99 |
|-------------------|-----|-----|-----|
| Static pages | <100ms | <200ms | <500ms |
| API reads | <200ms | <500ms | <1s |
| API writes | <500ms | <1s | <2s |
| Metrics calculation | <2s | <5s | <10s |
| LLM operations | <3s | <8s | <15s |

### 11.2 Scalability Targets

| Metric | MVP | Scale |
|--------|-----|-------|
| Concurrent users | 100 | 10,000 |
| Surveys per day | 50 | 5,000 |
| Teams per organization | 20 | 1,000 |
| Responses per survey | 100 | 10,000 |
| API requests/second | 50 | 5,000 |

### 11.3 Caching Strategy

```yaml
Cache Layers:
  Browser:
    - Static assets: 1 year (versioned)
    - API responses: React Query stale time 5 min

  Application:
    - LLM question templates: Redis, 24 hours
    - Occupation data: Redis, 1 hour
    - Metrics results: Redis, 15 minutes

  Database:
    - Query results: PostgreSQL, connection pooling
    - Prepared statements: Enabled
```

### 11.4 Database Optimization

**Indexes Required:**
```sql
-- Response queries
CREATE INDEX idx_responses_survey_complete
    ON responses(survey_id) WHERE is_complete = true;

-- Metrics lookup
CREATE INDEX idx_metric_results_team_date
    ON metric_results(team_id, calculation_date DESC);

-- Opportunity filtering
CREATE INDEX idx_opportunities_team_status
    ON opportunities(team_id, status);

-- Chat session lookup
CREATE INDEX idx_chat_sessions_token
    ON chat_sessions(anonymous_token);

-- Question cache
CREATE INDEX idx_llm_templates_signature_dimension
    ON llm_question_templates(task_signature, dimension);
```

---

## 12. Suggested Improvements

### 12.1 High Priority

#### 12.1.1 Real-time Chat with WebSockets

**Current State:** Polling-based chat message updates
**Improvement:** WebSocket connection for real-time streaming

```python
# WebSocket endpoint
@router.websocket("/chat-surveys/{token}/ws")
async def chat_websocket(websocket: WebSocket, token: str):
    await websocket.accept()
    session = get_session_by_token(token)

    try:
        while True:
            # Receive user message
            data = await websocket.receive_json()

            # Stream AI response
            async for chunk in generate_response_stream(session, data["content"]):
                await websocket.send_json({
                    "type": "chunk",
                    "content": chunk
                })

            await websocket.send_json({"type": "complete"})
    except WebSocketDisconnect:
        mark_session_inactive(session)
```

#### 12.1.2 Batch Metrics Calculation

**Current State:** Metrics calculated per-request
**Improvement:** Background job queue for calculations

```python
# Celery task
@celery.task
def calculate_team_metrics_async(team_id: UUID, survey_id: UUID):
    with get_db() as db:
        calculator = MetricsCalculator(db)
        result = calculator.calculate_metrics(survey_id)

        # Notify via WebSocket
        notify_team_metrics_ready(team_id, result)
```

#### 12.1.3 Export Functionality

**Feature:** Export metrics and opportunities to PDF/Excel

```yaml
Endpoints:
  GET /api/v1/teams/{team_id}/metrics/export
    Query: format (pdf, xlsx, csv)
    Response: Binary file download

  GET /api/v1/teams/{team_id}/opportunities/export
    Query: format (pdf, xlsx, csv), status
    Response: Binary file download
```

### 12.2 Medium Priority

#### 12.2.1 Notification System

```yaml
Notifications:
  - Survey activated (team managers)
  - Survey closing soon (respondents)
  - Privacy threshold reached (team managers)
  - New opportunities generated (team managers)
  - Opportunity status changed (assignees)

Channels:
  - In-app notifications
  - Email (optional)
  - Slack/Teams integration (future)
```

#### 12.2.2 Survey Scheduling

```python
class SurveySchedule(Base):
    survey_template_id: UUID
    team_id: UUID
    frequency: str  # "weekly", "monthly", "quarterly"
    day_of_week: Optional[int]  # 0-6
    day_of_month: Optional[int]  # 1-31
    next_run: datetime
    last_run: Optional[datetime]
    is_active: bool
```

#### 12.2.3 Benchmark Comparisons

```yaml
Features:
  - Compare team metrics to organization average
  - Industry benchmarks (anonymized aggregate data)
  - Historical self-comparison (vs. 3/6/12 months ago)

API:
  GET /api/v1/teams/{team_id}/metrics/benchmarks
    Response:
      organization_average: MetricScores
      industry_percentile: PercentileScores
      historical_comparison: TrendComparison
```

#### 12.2.4 Custom Question Builder

```yaml
Features:
  - Drag-and-drop question ordering
  - Custom question types
  - Conditional logic (show question based on previous answer)
  - Question bank (save and reuse)
  - Import/export question sets

UI Components:
  - QuestionBuilder (form editor)
  - QuestionPreview (live preview)
  - LogicBuilder (conditional flows)
```

### 12.3 Low Priority (Future)

#### 12.3.1 Mobile Application

```yaml
Platforms: iOS, Android
Framework: React Native (code sharing with web)

Features:
  - Push notifications for survey reminders
  - Offline survey completion
  - Quick metrics dashboard view
  - Chat survey support
```

#### 12.3.2 Integration Hub

```yaml
Integrations:
  HR Systems:
    - Workday (employee data sync)
    - BambooHR (team structure)
    - SAP SuccessFactors

  Communication:
    - Slack (notifications, survey distribution)
    - Microsoft Teams (notifications, bot)

  Project Management:
    - Jira (opportunity → ticket)
    - Azure DevOps (work items)
    - Asana (task creation)

  Analytics:
    - Power BI (embedded dashboards)
    - Tableau (data connector)
```

#### 12.3.3 AI Insights Dashboard

```yaml
Features:
  - Automated insight generation
  - Trend predictions
  - Anomaly detection
  - Natural language querying ("What's causing high friction in Engineering?")
  - Recommended actions with confidence scores
```

---

## 13. Technical Recommendations

### 13.1 Architecture Improvements

#### 13.1.1 Microservices Migration Path

**Current:** Monolithic FastAPI application
**Future:** Domain-driven microservices

```
┌─────────────────────────────────────────────────┐
│                   API Gateway                    │
│              (Kong / AWS API Gateway)            │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
    ▼             ▼             ▼             ▼
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│Survey │   │Metrics│   │ Chat  │   │ Auth  │
│Service│   │Service│   │Service│   │Service│
└───────┘   └───────┘   └───────┘   └───────┘
    │             │             │             │
    └─────────────┴─────────────┴─────────────┘
                  │
            ┌─────┴─────┐
            │  Message  │
            │   Queue   │
            │ (RabbitMQ)│
            └───────────┘
```

#### 13.1.2 Event-Driven Architecture

```python
# Event definitions
class SurveyCompletedEvent(BaseModel):
    event_type: str = "survey.completed"
    survey_id: UUID
    team_id: UUID
    response_count: int
    timestamp: datetime

# Event handlers
@event_handler("survey.completed")
async def on_survey_completed(event: SurveyCompletedEvent):
    # Check privacy threshold
    if event.response_count >= PRIVACY_THRESHOLD:
        # Trigger metrics calculation
        await publish_event(CalculateMetricsEvent(
            survey_id=event.survey_id,
            team_id=event.team_id
        ))

        # Generate opportunities
        await publish_event(GenerateOpportunitiesEvent(
            survey_id=event.survey_id
        ))
```

### 13.2 Database Recommendations

#### 13.2.1 PostgreSQL Extensions

```sql
-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- GiST indexes

-- Full-text search on opportunities
ALTER TABLE opportunities ADD COLUMN search_vector tsvector;
CREATE INDEX idx_opportunities_search ON opportunities USING GIN(search_vector);
```

#### 13.2.2 Connection Pooling

```yaml
# PgBouncer configuration
[databases]
kwex = host=localhost port=5432 dbname=kwex

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

### 13.3 Observability

#### 13.3.1 Monitoring Stack

```yaml
Metrics:
  - Prometheus (collection)
  - Grafana (visualization)

Logging:
  - Structured JSON logs
  - Fluentd/Logstash (aggregation)
  - Elasticsearch (storage)
  - Kibana (search/visualization)

Tracing:
  - OpenTelemetry (instrumentation)
  - Jaeger (distributed tracing)

Alerting:
  - PagerDuty/Opsgenie integration
  - Slack notifications
```

#### 13.3.2 Key Metrics to Monitor

```yaml
Application:
  - Request rate (requests/second)
  - Error rate (% 4xx/5xx)
  - Response time (P50, P95, P99)
  - Active users (concurrent sessions)

Business:
  - Surveys created per day
  - Survey completion rate
  - Average completion time
  - Metrics calculation frequency
  - Opportunity resolution rate

LLM:
  - Token usage (input/output per provider)
  - Cache hit rate
  - Average latency
  - Error rate

Infrastructure:
  - CPU/Memory utilization
  - Database connections
  - Queue depth
  - Cache hit rate
```

### 13.4 Testing Recommendations

```yaml
Unit Tests:
  - Services: MetricsCalculator, OpportunityGenerator, ChatSurveyService
  - Utilities: Normalization, RICE calculation, Privacy checks
  - Coverage target: >80%

Integration Tests:
  - API endpoints: Full request/response cycle
  - Database: Migrations, constraints, queries
  - LLM: Mock provider responses

End-to-End Tests:
  - Survey creation → completion → metrics
  - Chat survey full flow
  - Opportunity workflow
  - Authentication flows

Performance Tests:
  - Load testing with k6/Locust
  - Metrics calculation under load
  - Database query performance
```

---

## 14. Testing Strategy

### 14.1 Test Categories

#### 14.1.1 Unit Tests

```python
# Example: Metrics Calculator Test
class TestMetricsCalculator:
    def test_normalize_likert_5(self):
        assert normalize_answer("1", QuestionType.LIKERT_5) == 0
        assert normalize_answer("3", QuestionType.LIKERT_5) == 50
        assert normalize_answer("5", QuestionType.LIKERT_5) == 100

    def test_privacy_threshold_not_met(self):
        calculator = MetricsCalculator(mock_db)
        result = calculator.calculate_metrics(survey_with_3_responses)
        assert result.meets_privacy_threshold == False
        assert result.flow_score is None

    def test_rice_score_calculation(self):
        score = calculate_rice_score(
            reach=10,
            impact=2.0,
            confidence=0.8,
            effort=4.0
        )
        assert score == 4.0  # (10 * 2.0 * 0.8) / 4.0
```

#### 14.1.2 Integration Tests

```python
# Example: Survey API Test
class TestSurveyAPI:
    async def test_create_survey_success(self, client, auth_token):
        response = await client.post(
            "/api/v1/surveys",
            json={
                "name": "Test Survey",
                "team_id": str(team_id),
                "survey_type": "core_friction"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        assert response.json()["status"] == "draft"

    async def test_create_survey_unauthorized(self, client):
        response = await client.post("/api/v1/surveys", json={...})
        assert response.status_code == 401
```

#### 14.1.3 End-to-End Tests

```python
# Example: Full Survey Flow
class TestSurveyFlow:
    async def test_complete_survey_flow(self):
        # 1. Create team
        team = await create_team(...)

        # 2. Create survey
        survey = await create_survey(team_id=team.id)

        # 3. Generate questions
        await generate_questions(survey.id)

        # 4. Activate survey
        await activate_survey(survey.id)

        # 5. Submit 7 responses
        for i in range(7):
            token = await generate_response_link(survey.id)
            await submit_response(token, answers=[...])

        # 6. Calculate metrics
        metrics = await calculate_metrics(team.id)

        # 7. Verify
        assert metrics.meets_privacy_threshold == True
        assert metrics.flow_score is not None
```

### 14.2 Test Data Management

```python
# Fixtures
@pytest.fixture
def sample_team():
    return Team(
        id=uuid4(),
        name="Engineering Team",
        function="Engineering",
        member_count=15
    )

@pytest.fixture
def sample_survey(sample_team):
    return Survey(
        id=uuid4(),
        team_id=sample_team.id,
        name="Q1 Friction Survey",
        survey_type=SurveyType.CORE_FRICTION,
        status=SurveyStatus.DRAFT
    )

@pytest.fixture
def sample_questions():
    return [
        Question(dimension=d, text=f"Question for {d}", type=QuestionType.LIKERT_5)
        for d in FrictionType
    ]
```

---

## 15. Deployment Architecture

### 15.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN (CloudFront)                     │
│                    Static assets, API caching                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Load Balancer (ALB)                       │
│                   SSL termination, routing                   │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         ┌─────────┐    ┌─────────┐    ┌─────────┐
         │   API   │    │   API   │    │   API   │
         │Instance │    │Instance │    │Instance │
         │  (ECS)  │    │  (ECS)  │    │  (ECS)  │
         └────┬────┘    └────┬────┘    └────┬────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         ┌─────────┐    ┌─────────┐    ┌─────────┐
         │PostgreSQL│    │  Redis  │    │   S3    │
         │   RDS   │    │ Cluster │    │ Bucket  │
         │(Primary)│    │         │    │         │
         └─────────┘    └─────────┘    └─────────┘
```

### 15.2 Environment Configuration

```yaml
# .env.production
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/kwex
REDIS_URL=redis://elasticache-endpoint:6379
AWS_REGION=us-east-1

# Auth
JWT_SECRET_KEY=<secure-random-key>
JWT_ALGORITHM=RS256
SESSION_COOKIE_SECURE=true

# LLM Providers
AZURE_ANTHROPIC_ENDPOINT=https://...
AZURE_ANTHROPIC_API_KEY=<key>
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=<key>

# Feature Flags
FEATURE_CHAT_SURVEYS=true
FEATURE_PSYCH_SAFETY=true
LLM_MOCK=false
```

### 15.3 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          pip install -e ".[dev]"
          pytest --cov=app tests/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t kwex-api .

      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/kwex-api:${{ github.sha }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster kwex --service api --force-new-deployment
```

### 15.4 Scaling Configuration

```yaml
# ECS Service Auto Scaling
Resources:
  ServiceAutoScaling:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: CPUScaling
      ScalingTargetId: !Ref ScalableTarget
      PolicyType: TargetTrackingScaling
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 70.0
        PredefinedMetricSpecification:
          PredefinedMetricType: ECSServiceAverageCPUUtilization
        ScaleInCooldown: 300
        ScaleOutCooldown: 60

# Min/Max instances
MinCapacity: 2
MaxCapacity: 10
```

---

## 16. Appendices

### Appendix A: Question Templates

#### A.1 Core Friction Questions

**Clarity Dimension:**
```yaml
- text: "How often do you receive clear requirements before starting a task?"
  type: likert_5
  options:
    low_label: "Never"
    high_label: "Always"
  metric_mapping: [FLOW, FRICTION]

- text: "How frequently do you need to ask for clarification on your assigned work?"
  type: likert_5
  options:
    low_label: "Never"
    high_label: "Constantly"
  metric_mapping: [FRICTION]
  reverse_scored: true

- text: "How clear are your team's priorities?"
  type: likert_5
  options:
    low_label: "Very unclear"
    high_label: "Crystal clear"
  metric_mapping: [FLOW]
```

**Tooling Dimension:**
```yaml
- text: "How effective are your tools for completing daily tasks?"
  type: likert_5
  options:
    low_label: "Very ineffective"
    high_label: "Very effective"
  metric_mapping: [FLOW, FRICTION]

- text: "How often do technical issues block your work?"
  type: likert_5
  options:
    low_label: "Never"
    high_label: "Daily"
  metric_mapping: [FRICTION]
  reverse_scored: true

- text: "How easy is it to find the information you need?"
  type: likert_5
  options:
    low_label: "Very difficult"
    high_label: "Very easy"
  metric_mapping: [FRICTION]
```

*(Continue for Process, Rework, Delay, Safety...)*

### Appendix B: API Response Examples

#### B.1 Metric Result Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "team_id": "123e4567-e89b-12d3-a456-426614174000",
  "survey_id": "789e0123-e45b-67c8-d901-234567890abc",
  "calculation_date": "2026-02-01T12:00:00Z",
  "respondent_count": 12,
  "meets_privacy_threshold": true,
  "flow_score": 72.5,
  "friction_score": 35.2,
  "safety_score": 68.0,
  "portfolio_balance_score": 78.3,
  "flow_breakdown": {
    "throughput": 75.0,
    "value_delivery": 70.0,
    "unblocked_time": 72.5
  },
  "friction_breakdown": {
    "clarity": 28.5,
    "tooling": 42.0,
    "process": 35.5,
    "rework": 38.0,
    "delay": 32.0,
    "safety": 30.0
  },
  "safety_breakdown": {
    "rework_events": 72.0,
    "quality_escapes": 65.0,
    "decision_reversals": 70.0,
    "psychological_safety": 65.0
  },
  "portfolio_breakdown": {
    "value_adding_pct": 48.0,
    "value_enabling_pct": 35.0,
    "waste_pct": 17.0,
    "health_score": 78.3
  },
  "trend_direction": "up"
}
```

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| **RICE Score** | Prioritization framework: Reach × Impact × Confidence / Effort |
| **Privacy Threshold** | Minimum responses (7) required before displaying metrics |
| **Friction Type** | One of 6 workflow friction categories |
| **Core 4** | The four primary metrics: Flow, Friction, Safety, Portfolio Balance |
| **Chat Survey** | AI-powered conversational interview format |
| **Edmondson Scale** | Validated 7-item psychological safety assessment |
| **Occupation** | Job role from Faethm database with associated tasks |
| **Opportunity** | Identified improvement initiative with RICE scoring |

### Appendix D: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12 | Initial MVP specification |
| 2.0 | 2026-02 | Added auth/authz, chat surveys, psych safety, improvements |

---

## Document Information

**Authors:** KWeX Product Team
**Reviewers:** Engineering, Security, Product
**Approval Status:** Draft for Review
**Next Review:** Q2 2026

---

*This document serves as the authoritative specification for building the KWeX platform. All implementations should reference this document for requirements and design decisions.*
