"""Pydantic schemas for KWeX API."""

from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    CollaborationLevel,
    ComplexityLevel,
    FrictionType,
    GenerationMethod,
    LLMOperationType,
    MetricType,
    OpportunityStatus,
    QuestionType,
    Severity,
    SurveyStatus,
    TaskCategory,
    TrendDirection,
)


# Base configurations
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Occupation schemas
class OccupationCreate(BaseModel):
    name: str
    faethm_code: Optional[str] = None
    ideal_run_percentage: float = 0.35
    ideal_change_percentage: float = 0.65
    throughput_indicators: Optional[list[str]] = None


class OccupationResponse(BaseSchema):
    id: str
    name: str
    faethm_code: Optional[str]
    description: Optional[str] = None
    ideal_run_percentage: float
    ideal_change_percentage: float
    throughput_indicators: Optional[list[str]]
    created_at: datetime
    updated_at: datetime


# Task schemas
class TaskCreate(BaseModel):
    occupation_id: str
    faethm_task_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: TaskCategory = TaskCategory.CORE


class TaskResponse(BaseSchema):
    id: str
    occupation_id: str
    faethm_task_id: Optional[str]
    name: str
    description: Optional[str]
    category: TaskCategory
    created_at: datetime


# Friction Signal schemas
class FrictionSignalCreate(BaseModel):
    task_id: str
    type: FrictionType
    severity: Severity = Severity.MEDIUM
    description: Optional[str] = None


class FrictionSignalResponse(BaseSchema):
    id: str
    task_id: str
    type: FrictionType
    severity: Severity
    description: Optional[str]


# Team schemas
class TeamCreate(BaseModel):
    name: str
    function: str
    occupation_id: str
    member_count: int = 0


class TeamResponse(BaseSchema):
    id: str
    name: str
    function: str
    occupation_id: str
    member_count: int
    created_at: datetime


# Question schemas
class QuestionCreate(BaseModel):
    survey_id: str
    task_id: Optional[str] = None
    friction_signal_id: Optional[str] = None
    dimension: FrictionType
    metric_mapping: Optional[list[str]] = None  # List of MetricType values
    text: str
    type: QuestionType = QuestionType.LIKERT_5
    options: Optional[dict] = None  # {choices: [], low_label: str, high_label: str}
    order: int = 0
    required: bool = True


class QuestionResponse(BaseSchema):
    id: str
    survey_id: str
    task_id: Optional[str]
    friction_signal_id: Optional[str]
    dimension: FrictionType
    metric_mapping: Optional[list[str]]
    text: str
    type: QuestionType
    options: Optional[dict]  # {choices: [], low_label: str, high_label: str}
    order: int
    required: bool


# Survey schemas
class SurveyCreate(BaseModel):
    occupation_id: str
    team_id: str
    name: str
    anonymous_mode: bool = True
    estimated_completion_minutes: int = 7
    closes_at: Optional[datetime] = None


class SurveyResponse(BaseSchema):
    id: str
    occupation_id: str
    team_id: str
    name: str
    status: SurveyStatus
    anonymous_mode: bool
    estimated_completion_minutes: int
    created_at: datetime
    closes_at: Optional[datetime]
    questions: list[QuestionResponse] = []


class SurveyResponseStats(BaseModel):
    survey_id: str
    total_responses: int
    complete_responses: int
    meets_privacy_threshold: bool
    average_completion_time_seconds: Optional[float] = None


# Answer schemas
class AnswerCreate(BaseModel):
    question_id: str
    value: str
    numeric_value: Optional[float] = None


class AnswerResponse(BaseSchema):
    id: str
    response_id: str
    question_id: str
    value: str
    numeric_value: Optional[float]


# Response schemas (survey submission)
class ResponseCreate(BaseModel):
    survey_id: str


class ResponseSubmit(BaseModel):
    answers: list[AnswerCreate]


class SurveyResponseResponse(BaseSchema):
    id: str
    survey_id: str
    anonymous_token: str
    submitted_at: Optional[datetime]
    completion_time_seconds: Optional[int]
    is_complete: bool
    started_at: datetime


# Metric Result schemas
class MetricBreakdown(BaseModel):
    """Base model for metric breakdown data."""

    pass


class FlowBreakdown(MetricBreakdown):
    throughput: float
    value_delivery: float
    unblocked_time: float


class FrictionBreakdown(MetricBreakdown):
    dependency_wait: float
    approval_latency: float
    rework_from_unclear: float
    tooling_pain: float
    process_confusion: float


class SafetyBreakdown(MetricBreakdown):
    rework_events: float
    quality_escapes: float
    decision_reversals: float
    audit_issues: float


class PortfolioBreakdown(MetricBreakdown):
    run_percentage: float
    change_percentage: float
    deviation_from_ideal: float


class MetricResultResponse(BaseSchema):
    id: str
    team_id: str
    survey_id: str
    calculation_date: datetime
    respondent_count: int
    meets_privacy_threshold: bool

    flow_score: Optional[float]
    friction_score: Optional[float]
    safety_score: Optional[float]
    portfolio_balance_score: Optional[float]

    flow_breakdown: Optional[dict]
    friction_breakdown: Optional[dict]
    safety_breakdown: Optional[dict]
    portfolio_breakdown: Optional[dict]

    trend_direction: Optional[TrendDirection]


# Opportunity schemas
class OpportunityResponse(BaseSchema):
    id: str
    team_id: str
    survey_id: Optional[str] = None
    friction_signal_id: Optional[str] = None
    friction_type: Optional[FrictionType] = None

    reach: int
    impact: float
    confidence: float
    effort: float
    rice_score: float
    source_score: Optional[float] = None

    title: str
    description: Optional[str]
    status: OpportunityStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class OpportunityCreate(BaseModel):
    survey_id: Optional[str] = None
    friction_type: Optional[FrictionType] = None
    title: str
    description: Optional[str] = None
    reach: int = 1
    impact: float = 1.0
    confidence: float = 0.8
    effort: float = 2.0
    source_score: Optional[float] = None


class OpportunityUpdate(BaseModel):
    status: Optional[OpportunityStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    reach: Optional[int] = None
    impact: Optional[float] = None
    confidence: Optional[float] = None
    effort: Optional[float] = None


# CSV Upload schemas
class CSVUploadError(BaseModel):
    row: int
    error: str


class CSVUploadResult(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: list[CSVUploadError]
    teams: list["TeamResponse"]


# Question with LLM fields
class QuestionWithLLMResponse(QuestionResponse):
    """Question response including LLM generation fields."""

    llm_template_id: Optional[str] = None
    generation_method: GenerationMethod = GenerationMethod.STATIC


# LLM Question Template schemas
class LLMQuestionTemplateResponse(BaseSchema):
    """Response schema for LLM question templates."""

    id: str
    task_signature: str
    dimension: FrictionType
    question_text: str
    question_type: QuestionType
    metric_mapping: Optional[list[str]] = None
    version: int
    quality_score: float
    usage_count: int
    model_used: str
    prompt_version: str
    created_at: datetime
    last_used_at: Optional[datetime] = None


# Enriched Task schemas
class FrictionPointSchema(BaseModel):
    """Schema for friction points in enriched tasks."""

    type: str
    description: str


class EnrichedTaskCreate(BaseModel):
    """Schema for creating an enriched task."""

    occupation_id: str
    source_task_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: TaskCategory = TaskCategory.CORE
    skill_requirements: Optional[list[str]] = None
    complexity_level: ComplexityLevel = ComplexityLevel.MEDIUM
    collaboration_level: CollaborationLevel = CollaborationLevel.TEAM
    typical_friction_points: Optional[list[FrictionPointSchema]] = None


class EnrichedTaskResponse(BaseSchema):
    """Response schema for enriched tasks."""

    id: str
    occupation_id: str
    source_task_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: TaskCategory
    skill_requirements: Optional[list[str]] = None
    complexity_level: ComplexityLevel
    collaboration_level: CollaborationLevel
    typical_friction_points: Optional[list[dict]] = None
    task_signature: str
    source: str
    model_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# LLM Generation Log schemas
class LLMGenerationLogResponse(BaseSchema):
    """Response schema for LLM generation logs."""

    id: str
    operation_type: LLMOperationType
    model_used: str
    prompt_version: str
    input_context: Optional[dict] = None
    output_data: Optional[dict] = None
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    latency_ms: Optional[int] = None
    success: bool
    error_message: Optional[str] = None
    occupation_id: Optional[str] = None
    survey_id: Optional[str] = None
    created_at: datetime


# Cache statistics schema
class CacheStatsResponse(BaseModel):
    """Response schema for cache statistics."""

    total_templates: int
    unique_task_signatures: int
    dimension_breakdown: dict[str, int]
    average_quality_score: float
    total_usage_count: int
    cache_hit_potential: str


# Task selection result schema
class SelectedTaskResponse(BaseModel):
    """Response schema for selected task in LLM task selection."""

    task_id: str
    name: str
    relevance_score: float
    reason: str


# LLM Question Generation request/response
class GenerateQuestionsLLMRequest(BaseModel):
    """Request schema for LLM question generation."""

    use_cache: bool = True
    max_questions: int = 18
    model: Optional[str] = None  # "claude" or "gpt"


class GenerateQuestionsLLMResponse(BaseModel):
    """Response schema for LLM question generation."""

    survey_id: str
    questions_generated: int
    questions: list[QuestionResponse]
    cache_hits: int
    llm_calls: int
    method: str = "llm"


# Task enrichment request/response
class EnrichTasksRequest(BaseModel):
    """Request schema for task enrichment."""

    force_refresh: bool = False
    model: Optional[str] = None  # "claude" or "gpt"


class EnrichTasksResponse(BaseModel):
    """Response schema for task enrichment."""

    occupation_id: str
    tasks_enriched: int
    tasks: list[EnrichedTaskResponse]


# Cache warmup request/response
class CacheWarmupRequest(BaseModel):
    """Request schema for cache warmup."""

    occupation_ids: list[str]


class CacheWarmupResponse(BaseModel):
    """Response schema for cache warmup."""

    occupations_processed: int
    tasks_enriched: int
    questions_cached: int
    errors: list[dict]


# API Response wrapper
class APIResponse(BaseModel):
    """Standard API response wrapper."""

    data: Optional[Union[dict, list]] = None
    meta: dict = Field(default_factory=dict)


class APIError(BaseModel):
    """Standard API error response."""

    code: str
    message: str
    details: Optional[dict] = None
