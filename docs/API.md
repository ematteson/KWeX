# KWeX API Documentation

Complete REST API reference for the KWeX (Knowledge Worker Experience) backend.

**Base URL:** `http://localhost:8000/api/v1`

**Interactive Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Table of Contents

- [Authentication](#authentication)
- [Occupations](#occupations)
- [Teams](#teams)
- [Surveys](#surveys)
- [Responses](#responses)
- [Metrics](#metrics)
- [Opportunities](#opportunities)
- [Data Models](#data-models)

---

## Authentication

The MVP uses no authentication. For production, implement OAuth2 or API key authentication.

---

## Occupations

Manage job role definitions from Faethm.

### List Occupations

```http
GET /occupations
```

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Product Manager",
    "faethm_code": "PM001",
    "ideal_run_percentage": 30,
    "ideal_change_percentage": 70,
    "throughput_indicators": ["decisions closed", "roadmap items shipped"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### Create Occupation

```http
POST /occupations
Content-Type: application/json

{
  "name": "Software Engineer",
  "faethm_code": "ENG001",
  "ideal_run_percentage": 25,
  "ideal_change_percentage": 75,
  "throughput_indicators": ["PRs merged", "stories completed"]
}
```

**Response:** `201 Created`

### Get Occupation

```http
GET /occupations/{occupation_id}
```

**Response:** `200 OK`

Returns occupation with associated tasks:

```json
{
  "id": 1,
  "name": "Product Manager",
  "faethm_code": "PM001",
  "ideal_run_percentage": 30,
  "ideal_change_percentage": 70,
  "throughput_indicators": ["decisions closed", "roadmap items shipped"],
  "tasks": [
    {
      "id": 1,
      "name": "Requirements gathering",
      "description": "Collect and document product requirements",
      "category": "CORE",
      "faethm_task_id": "PM001-T1"
    }
  ]
}
```

### Sync from Faethm

```http
POST /occupations/sync
```

Syncs occupation data from the Faethm API (or mock data if configured).

**Response:** `200 OK`

```json
{
  "synced": 5,
  "created": 3,
  "updated": 2,
  "occupations": ["Product Manager", "Designer", "Sales Operations", "Finance Analyst", "Customer Experience Specialist"]
}
```

---

## Teams

Manage organizational units.

### List Teams

```http
GET /teams
```

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Product Team Alpha",
    "function": "Product Management",
    "occupation_id": 1,
    "occupation_name": "Product Manager",
    "member_count": 12,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Create Team

```http
POST /teams
Content-Type: application/json

{
  "name": "Product Team Alpha",
  "function": "Product Management",
  "occupation_id": 1,
  "member_count": 12
}
```

**Response:** `201 Created`

### Get Team

```http
GET /teams/{team_id}
```

**Response:** `200 OK`

### Update Team

```http
PUT /teams/{team_id}
Content-Type: application/json

{
  "name": "Product Team Beta",
  "member_count": 15
}
```

**Response:** `200 OK`

### Upload Teams CSV

```http
POST /teams/upload-csv
Content-Type: multipart/form-data

file: teams.csv
update_existing: false
```

Upload teams from a CSV file.

**CSV Format:**

| Column | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Team name |
| `function` | Yes | Department/function name |
| `occupation_code` | Yes | Faethm occupation code (e.g., PM001) or occupation name |
| `member_count` | No | Number of team members (default: 0) |

**Example CSV:**
```csv
name,function,occupation_code,member_count
Product Team Alpha,Product Management,PM001,12
Design Team Beta,Design,DES001,8
Sales Ops Team,Sales Operations,SALES001,15
```

**Query Parameters:**
- `update_existing` (boolean): If true, updates teams with matching names. Default: false

**Response:** `200 OK`

```json
{
  "total_rows": 3,
  "created": 2,
  "updated": 1,
  "errors": [
    {"row": 4, "error": "Occupation not found: INVALID001"}
  ],
  "teams": [...]
}
```

### Download CSV Template

```http
GET /teams/csv-template
```

Downloads a sample CSV template with example data.

**Response:** `200 OK` (CSV file download)

---

## Surveys

Manage survey lifecycle.

### List Surveys

```http
GET /surveys
GET /surveys?status=ACTIVE
GET /surveys?team_id=1
```

**Query Parameters:**
- `status` (optional): Filter by status (DRAFT, ACTIVE, CLOSED)
- `team_id` (optional): Filter by team

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Q1 2024 KWeX Survey",
    "occupation_id": 1,
    "team_id": 1,
    "status": "ACTIVE",
    "anonymous_mode": true,
    "estimated_completion_minutes": 7,
    "closes_at": "2024-02-15T23:59:59Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Create Survey

```http
POST /surveys
Content-Type: application/json

{
  "name": "Q1 2024 KWeX Survey",
  "occupation_id": 1,
  "team_id": 1,
  "anonymous_mode": true,
  "closes_at": "2024-02-15T23:59:59Z"
}
```

**Response:** `201 Created`

Survey is created in DRAFT status.

### Get Survey

```http
GET /surveys/{survey_id}
```

**Response:** `200 OK`

Returns survey with questions:

```json
{
  "id": 1,
  "name": "Q1 2024 KWeX Survey",
  "status": "ACTIVE",
  "questions": [
    {
      "id": 1,
      "text": "How clear are the requirements and expectations for your key tasks?",
      "dimension": "CLARITY",
      "type": "LIKERT_5",
      "order": 1
    }
  ]
}
```

### Update Survey

```http
PUT /surveys/{survey_id}
Content-Type: application/json

{
  "name": "Updated Survey Name",
  "closes_at": "2024-03-01T23:59:59Z"
}
```

**Note:** Only DRAFT surveys can be updated.

**Response:** `200 OK`

### Delete Survey

```http
DELETE /surveys/{survey_id}
```

**Note:** Only DRAFT surveys can be deleted.

**Response:** `204 No Content`

### Generate Questions

```http
POST /surveys/{survey_id}/generate-questions
Content-Type: application/json

{
  "use_task_specific": true,
  "max_questions": 18
}
```

**Parameters:**
- `use_task_specific` (boolean): Use occupation-specific task questions
- `max_questions` (int): Maximum questions (default: 18)

**Response:** `200 OK`

```json
{
  "survey_id": 1,
  "questions_generated": 15,
  "estimated_completion_minutes": 7,
  "dimensions_covered": ["CLARITY", "TOOLING", "PROCESS", "REWORK", "DELAY", "SAFETY"]
}
```

### Activate Survey

```http
POST /surveys/{survey_id}/activate
```

Changes status from DRAFT to ACTIVE.

**Response:** `200 OK`

### Close Survey

```http
POST /surveys/{survey_id}/close
```

Changes status from ACTIVE to CLOSED.

**Response:** `200 OK`

### Get Response Link

```http
GET /surveys/{survey_id}/link
```

Generates an anonymous response link.

**Response:** `200 OK`

```json
{
  "survey_id": 1,
  "response_url": "/survey/550e8400-e29b-41d4-a716-446655440000",
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Survey Stats

```http
GET /surveys/{survey_id}/stats
```

**Response:** `200 OK`

```json
{
  "survey_id": 1,
  "total_responses": 15,
  "complete_responses": 12,
  "incomplete_responses": 3,
  "average_completion_time_seconds": 420,
  "meets_privacy_threshold": true
}
```

---

## Responses

Anonymous survey response collection.

### Get Survey for Response

```http
GET /respond/{token}
```

**Response:** `200 OK`

```json
{
  "survey_id": 1,
  "survey_name": "Q1 2024 KWeX Survey",
  "questions": [
    {
      "id": 1,
      "text": "How clear are the requirements and expectations for your key tasks?",
      "dimension": "CLARITY",
      "type": "LIKERT_5",
      "order": 1
    }
  ],
  "existing_answers": {},
  "is_complete": false
}
```

### Submit Response

```http
POST /respond/{token}
Content-Type: application/json

{
  "answers": [
    {"question_id": 1, "value": 4},
    {"question_id": 2, "value": 3},
    {"question_id": 3, "value": "Some free text feedback"}
  ]
}
```

**Response:** `201 Created`

```json
{
  "response_id": 1,
  "survey_id": 1,
  "is_complete": true,
  "completion_time_seconds": 385
}
```

### Save Partial Response

```http
PUT /respond/{token}
Content-Type: application/json

{
  "answers": [
    {"question_id": 1, "value": 4},
    {"question_id": 2, "value": 3}
  ]
}
```

Saves progress for later completion.

**Response:** `200 OK`

```json
{
  "response_id": 1,
  "survey_id": 1,
  "is_complete": false,
  "answers_saved": 2
}
```

---

## Metrics

Core 4 metrics calculation and retrieval.

### Get Latest Metrics

```http
GET /teams/{team_id}/metrics
```

**Response:** `200 OK`

```json
{
  "team_id": 1,
  "survey_id": 1,
  "calculation_date": "2024-01-20T10:30:00Z",
  "flow_score": 72,
  "friction_score": 45,
  "safety_score": 68,
  "portfolio_balance_score": 85,
  "meets_privacy_threshold": true,
  "respondent_count": 12,
  "trend_direction": "UP",
  "flow_breakdown": {
    "throughput": 75,
    "value_delivery": 70,
    "unblocked_time": 68
  },
  "friction_breakdown": {
    "dependency_wait": 52,
    "approval_latency": 45,
    "rework_from_unclear": 48,
    "tooling_pain": 38,
    "process_confusion": 42
  },
  "safety_breakdown": {
    "rework_events": 65,
    "quality_escapes": 72,
    "decision_reversals": 68,
    "psychological_safety": 67
  },
  "portfolio_breakdown": {
    "actual_run_percentage": 35,
    "actual_change_percentage": 65,
    "ideal_run_percentage": 30,
    "ideal_change_percentage": 70
  }
}
```

### Get Metrics History

```http
GET /teams/{team_id}/metrics/history
GET /teams/{team_id}/metrics/history?limit=5
```

**Response:** `200 OK`

```json
[
  {
    "survey_id": 2,
    "survey_name": "Q1 2024 Survey",
    "calculation_date": "2024-01-20T10:30:00Z",
    "flow_score": 72,
    "friction_score": 45,
    "safety_score": 68,
    "portfolio_balance_score": 85
  },
  {
    "survey_id": 1,
    "survey_name": "Q4 2023 Survey",
    "calculation_date": "2023-10-20T10:30:00Z",
    "flow_score": 65,
    "friction_score": 52,
    "safety_score": 62,
    "portfolio_balance_score": 78
  }
]
```

### Get Friction Breakdown

```http
GET /teams/{team_id}/metrics/friction-breakdown
```

**Response:** `200 OK`

```json
{
  "dimensions": {
    "CLARITY": 65,
    "TOOLING": 45,
    "PROCESS": 58,
    "REWORK": 72,
    "DELAY": 51,
    "SAFETY": 78
  },
  "lowest_scoring": "TOOLING",
  "highest_scoring": "SAFETY"
}
```

### Get Metrics for Specific Survey

```http
GET /teams/{team_id}/metrics/{survey_id}
```

**Response:** `200 OK`

Returns same format as Get Latest Metrics.

### Calculate Metrics

```http
POST /teams/{team_id}/metrics/calculate
Content-Type: application/json

{
  "survey_id": 1
}
```

Triggers metric calculation for a closed survey.

**Response:** `201 Created`

```json
{
  "metric_result_id": 1,
  "team_id": 1,
  "survey_id": 1,
  "flow_score": 72,
  "friction_score": 45,
  "safety_score": 68,
  "portfolio_balance_score": 85
}
```

---

## Opportunities

RICE-scored improvement opportunities.

### List Opportunities

```http
GET /teams/{team_id}/opportunities
GET /teams/{team_id}/opportunities?status=IDENTIFIED
```

**Query Parameters:**
- `status` (optional): Filter by status (IDENTIFIED, IN_PROGRESS, COMPLETED, DEFERRED)

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "team_id": 1,
    "survey_id": 1,
    "title": "Reduce tooling friction",
    "description": "Address tool reliability and usability issues affecting workflow",
    "friction_type": "TOOLING",
    "reach": 12,
    "impact": 2.0,
    "confidence": 0.8,
    "effort": 4.0,
    "rice_score": 4.8,
    "status": "IDENTIFIED",
    "created_at": "2024-01-20T10:30:00Z"
  }
]
```

### Get Opportunity

```http
GET /teams/{team_id}/opportunities/{opportunity_id}
```

**Response:** `200 OK`

### Update Opportunity

```http
PATCH /teams/{team_id}/opportunities/{opportunity_id}
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "reach": 15,
  "impact": 2.5,
  "confidence": 0.9,
  "effort": 3.0
}
```

RICE score is automatically recalculated.

**Response:** `200 OK`

### Create Manual Opportunity

```http
POST /teams/{team_id}/opportunities
Content-Type: application/json

{
  "title": "Improve code review process",
  "description": "Streamline PR reviews to reduce delay",
  "friction_type": "DELAY",
  "reach": 10,
  "impact": 1.5,
  "confidence": 0.7,
  "effort": 2.0
}
```

**Response:** `201 Created`

### Delete Opportunity

```http
DELETE /teams/{team_id}/opportunities/{opportunity_id}
```

**Response:** `204 No Content`

### Generate Opportunities from Survey

```http
POST /teams/{team_id}/surveys/{survey_id}/generate-opportunities
```

Auto-generates opportunities from survey results. Clears existing opportunities for this survey first.

**Response:** `201 Created`

```json
{
  "opportunities_generated": 4,
  "friction_types_addressed": ["TOOLING", "DELAY", "PROCESS", "REWORK"]
}
```

### Get Opportunities Summary

```http
GET /teams/{team_id}/opportunities/summary
```

**Response:** `200 OK`

```json
{
  "team_id": 1,
  "total_opportunities": 8,
  "by_status": {
    "IDENTIFIED": 4,
    "IN_PROGRESS": 2,
    "COMPLETED": 1,
    "DEFERRED": 1
  },
  "top_5": [
    {
      "id": 1,
      "title": "Reduce tooling friction",
      "rice_score": 4.8
    }
  ],
  "average_rice_score": 3.2
}
```

---

## Data Models

### Enums

#### SurveyStatus
- `DRAFT` - Survey is being created
- `ACTIVE` - Survey is open for responses
- `CLOSED` - Survey is closed, ready for analysis

#### FrictionType
- `CLARITY` - Task clarity and requirements
- `TOOLING` - Tools and systems effectiveness
- `PROCESS` - Workflow efficiency
- `REWORK` - Work redoing frequency
- `DELAY` - Wait times and dependencies
- `SAFETY` - Psychological safety

#### QuestionType
- `LIKERT_5` - 5-point scale
- `LIKERT_7` - 7-point scale
- `PERCENTAGE_SLIDER` - 0-100 slider
- `FREE_TEXT` - Open text response

#### TaskCategory
- `CORE` - Core job function tasks
- `SUPPORT` - Supporting activities
- `ADMIN` - Administrative tasks

#### OpportunityStatus
- `IDENTIFIED` - New opportunity
- `IN_PROGRESS` - Being addressed
- `COMPLETED` - Successfully resolved
- `DEFERRED` - Postponed

#### TrendDirection
- `UP` - Improving (>5 point change)
- `DOWN` - Declining (<-5 point change)
- `STABLE` - No significant change

### Error Responses

```json
{
  "detail": "Error message describing the issue"
}
```

**Status Codes:**
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Rate Limiting

No rate limiting is implemented in the MVP. For production, implement appropriate limits.

---

## Privacy Considerations

- Survey responses are anonymous (UUID tokens, no user tracking)
- Metrics only display when respondent count >= 7 (configurable)
- Audit logging tracks all data access
- Response collection endpoints do not log IP/user-agent

---

## Examples

### Complete Survey Workflow

```bash
# 1. Sync occupations from Faethm
curl -X POST http://localhost:8000/api/v1/occupations/sync

# 2. Create a team
curl -X POST http://localhost:8000/api/v1/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "Product Team Alpha", "function": "Product", "occupation_id": 1, "member_count": 12}'

# 3. Create a survey
curl -X POST http://localhost:8000/api/v1/surveys \
  -H "Content-Type: application/json" \
  -d '{"name": "Q1 Survey", "occupation_id": 1, "team_id": 1, "anonymous_mode": true}'

# 4. Generate questions
curl -X POST http://localhost:8000/api/v1/surveys/1/generate-questions

# 5. Activate survey
curl -X POST http://localhost:8000/api/v1/surveys/1/activate

# 6. Get response link
curl http://localhost:8000/api/v1/surveys/1/link

# 7. (After collecting responses) Calculate metrics
curl -X POST http://localhost:8000/api/v1/teams/1/metrics/calculate \
  -H "Content-Type: application/json" \
  -d '{"survey_id": 1}'

# 8. View metrics
curl http://localhost:8000/api/v1/teams/1/metrics

# 9. Generate opportunities
curl -X POST http://localhost:8000/api/v1/teams/1/surveys/1/generate-opportunities

# 10. View opportunities
curl http://localhost:8000/api/v1/teams/1/opportunities
```
