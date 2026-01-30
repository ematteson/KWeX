"""Pydantic schemas for KWeX API."""

from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    ChatMessageRole,
    ChatSessionStatus,
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
    SurveyType,
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
    # New value-based portfolio model
    ideal_value_adding_pct: float = 0.50  # Direct value creation
    ideal_value_enabling_pct: float = 0.35  # Necessary support work
    ideal_waste_pct: float = 0.15  # Target waste (should be minimized)
    # Legacy fields for backward compatibility
    ideal_run_percentage: float = 0.35
    ideal_change_percentage: float = 0.65
    throughput_indicators: Optional[list[str]] = None


class OccupationResponse(BaseSchema):
    id: str
    name: str
    faethm_code: Optional[str]
    description: Optional[str] = None
    # New value-based portfolio model
    ideal_value_adding_pct: float
    ideal_value_enabling_pct: float
    ideal_waste_pct: float
    # Legacy fields
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


# Global Task schemas
class GlobalTaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: TaskCategory = TaskCategory.CORE
    faethm_task_id: Optional[str] = None


class GlobalTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TaskCategory] = None


class GlobalTaskResponse(BaseSchema):
    id: str
    faethm_task_id: Optional[str]
    name: str
    description: Optional[str]
    category: TaskCategory
    is_custom: bool
    source: str
    created_at: datetime
    updated_at: datetime


# Occupation Task Assignment schemas
class OccupationTaskCreate(BaseModel):
    global_task_id: str
    time_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    category_override: Optional[TaskCategory] = None
    display_order: int = 0


class OccupationTaskUpdate(BaseModel):
    time_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    category_override: Optional[TaskCategory] = None
    display_order: Optional[int] = None


class OccupationTaskResponse(BaseSchema):
    id: str
    occupation_id: str
    global_task_id: str
    time_percentage: float
    category_override: Optional[TaskCategory]
    display_order: int
    created_at: datetime
    updated_at: datetime
    global_task: GlobalTaskResponse


class BulkTimeAllocationUpdate(BaseModel):
    allocations: list[dict]  # [{id: str, time_percentage: float}]


class AllocationSummary(BaseModel):
    occupation_id: str
    total_tasks: int
    total_percentage: float
    tasks_with_allocation: int


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
    survey_type: SurveyType = SurveyType.CORE_FRICTION
    anonymous_mode: bool = True
    estimated_completion_minutes: int = 7
    closes_at: Optional[datetime] = None


class SurveyResponse(BaseSchema):
    id: str
    occupation_id: str
    team_id: str
    name: str
    survey_type: SurveyType
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
    comment: Optional[str] = None


class AnswerResponse(BaseSchema):
    id: str
    response_id: str
    question_id: str
    value: str
    numeric_value: Optional[float]
    comment: Optional[str] = None


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
    # New value-based model
    value_adding_pct: float  # Direct value creation work
    value_enabling_pct: float  # Necessary support work
    waste_pct: float  # Non-value work (friction manifestation)
    health_score: float  # 0-100, higher = better balance
    # Legacy fields for backward compatibility
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


# Psychological Safety Assessment schemas
class PsychSafetyItemScore(BaseModel):
    """Individual item score from Edmondson's scale."""

    item_number: int
    item_text: str
    score: float  # 1-7 scale
    is_reverse_scored: bool


class PsychSafetyResult(BaseModel):
    """Psychological safety assessment result for a team."""

    team_id: str
    survey_id: str
    calculation_date: datetime
    respondent_count: int
    meets_privacy_threshold: bool

    # Overall score (1-7 scale, higher = more psychologically safe)
    overall_score: Optional[float] = None

    # Individual item scores
    item_scores: Optional[list[PsychSafetyItemScore]] = None

    # Interpretation
    interpretation: Optional[str] = None  # "Low", "Moderate", "High"

    # Benchmark comparison
    benchmark_percentile: Optional[int] = None


class PsychSafetyCreateRequest(BaseModel):
    """Request to create a psychological safety survey for a team."""

    team_id: str
    name: Optional[str] = None  # Defaults to "Psychological Safety Assessment"


# ============================================================================
# Chat Survey Schemas
# ============================================================================


class ChatSessionCreate(BaseModel):
    """Request to start a new chat survey session."""

    survey_id: str
    llm_provider: str = "claude"  # "claude" or "gpt"


class ChatMessageCreate(BaseModel):
    """Request to send a message in a chat session."""

    content: str


class RatingConfirmation(BaseModel):
    """Request to confirm or adjust an AI-inferred rating."""

    dimension: FrictionType
    confirmed: bool
    adjusted_score: Optional[float] = Field(default=None, ge=1.0, le=5.0)


class ChatMessageResponse(BaseSchema):
    """Response schema for a chat message."""

    id: str
    session_id: str
    role: ChatMessageRole
    content: str
    dimension_context: Optional[FrictionType] = None
    is_rating_confirmation: bool = False
    sequence: int
    created_at: datetime


class ChatExtractedRatingResponse(BaseSchema):
    """Response schema for an extracted rating."""

    id: str
    session_id: str
    dimension: FrictionType
    ai_inferred_score: float
    ai_confidence: float
    ai_reasoning: Optional[str] = None
    user_confirmed: bool
    user_adjusted_score: Optional[float] = None
    final_score: float
    key_quotes: Optional[list] = None
    summary_comment: Optional[str] = None
    created_at: datetime


class ChatSummaryResponse(BaseSchema):
    """Response schema for a chat summary."""

    id: str
    session_id: str
    executive_summary: str
    key_pain_points: list  # [{dimension, description, severity}]
    positive_aspects: list
    improvement_suggestions: list
    overall_sentiment: str
    dimension_sentiments: dict
    created_at: datetime


class ChatSessionResponse(BaseSchema):
    """Response schema for a chat session."""

    id: str
    survey_id: str
    response_id: str
    anonymous_token: str
    status: ChatSessionStatus
    current_dimension: Optional[FrictionType] = None
    dimensions_covered: dict
    llm_provider: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    last_activity_at: datetime
    total_tokens_input: int
    total_tokens_output: int


class ChatConversationResponse(BaseModel):
    """Response containing session info and all messages."""

    session: ChatSessionResponse
    messages: list[ChatMessageResponse]
    extracted_ratings: list[ChatExtractedRatingResponse] = []


class ChatMessageSendResponse(BaseModel):
    """Response after sending a message."""

    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    session_status: ChatSessionStatus
    current_dimension: Optional[FrictionType] = None
    dimensions_covered: dict
    pending_rating_confirmation: Optional[dict] = None  # {dimension, inferred_score, reasoning}


class ChatRatingConfirmResponse(BaseModel):
    """Response after confirming a rating."""

    rating: ChatExtractedRatingResponse
    next_dimension: Optional[FrictionType] = None
    all_confirmed: bool
    assistant_message: Optional[ChatMessageResponse] = None


class ChatCompleteResponse(BaseModel):
    """Response when completing a chat session."""

    session: ChatSessionResponse
    summary: ChatSummaryResponse
    extracted_ratings: list[ChatExtractedRatingResponse]
    metrics_calculated: bool
    metric_result_id: Optional[str] = None


class ChatTranscriptResponse(BaseModel):
    """Full transcript of a chat session."""

    session: ChatSessionResponse
    messages: list[ChatMessageResponse]
    extracted_ratings: list[ChatExtractedRatingResponse]
    summary: Optional[ChatSummaryResponse] = None


class StartChatSurveyResponse(BaseModel):
    """Response when starting a new chat survey."""

    session: ChatSessionResponse
    opening_message: ChatMessageResponse
    chat_url: str
