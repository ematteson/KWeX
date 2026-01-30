"""SQLAlchemy ORM models for KWeX MVP."""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


# Enums
class TaskCategory(str, enum.Enum):
    CORE = "core"
    SUPPORT = "support"
    ADMIN = "admin"


class FrictionType(str, enum.Enum):
    CLARITY = "clarity"
    TOOLING = "tooling"
    PROCESS = "process"
    REWORK = "rework"
    DELAY = "delay"
    SAFETY = "safety"


class Severity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SurveyStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class SurveyType(str, enum.Enum):
    """Type of survey - determines question generation and scoring."""
    CORE_FRICTION = "core_friction"  # Standard KWeX Core 4 metrics survey
    PSYCHOLOGICAL_SAFETY = "psychological_safety"  # Edmondson's 7-item scale
    CUSTOM = "custom"  # User-defined questions
    CHAT_SURVEY = "chat_survey"  # AI-powered conversational survey


class ChatSessionStatus(str, enum.Enum):
    """Status of a chat survey session."""
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    RATING_CONFIRMATION = "rating_confirmation"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ChatMessageRole(str, enum.Enum):
    """Role of a message in the chat conversation."""
    SYSTEM = "system"
    ASSISTANT = "assistant"
    USER = "user"


class QuestionType(str, enum.Enum):
    LIKERT_5 = "likert_5"
    LIKERT_7 = "likert_7"
    MULTIPLE_CHOICE = "multiple_choice"
    PERCENTAGE_SLIDER = "percentage_slider"
    FREE_TEXT = "free_text"


class MetricType(str, enum.Enum):
    FLOW = "flow"
    FRICTION = "friction"
    SAFETY = "safety"
    PORTFOLIO_BALANCE = "portfolio_balance"


class TrendDirection(str, enum.Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class OpportunityStatus(str, enum.Enum):
    IDENTIFIED = "identified"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEFERRED = "deferred"


class GenerationMethod(str, enum.Enum):
    """Method used to generate a question."""
    STATIC = "static"
    LLM_GENERATED = "llm_generated"
    LLM_CACHED = "llm_cached"


class LLMOperationType(str, enum.Enum):
    """Types of LLM operations for logging."""
    TASK_ENRICHMENT = "task_enrichment"
    TASK_SELECTION = "task_selection"
    QUESTION_GENERATION = "question_generation"
    TASK_GAP_FILLING = "task_gap_filling"


class ComplexityLevel(str, enum.Enum):
    """Complexity levels for tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CollaborationLevel(str, enum.Enum):
    """Collaboration levels for tasks."""
    INDIVIDUAL = "individual"
    TEAM = "team"
    CROSS_TEAM = "cross_team"


# Models
class Occupation(Base):
    """Occupation model representing job roles from Faethm."""

    __tablename__ = "occupations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    faethm_code: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    # Portfolio balance: Value Adding + Value Enabling + Waste should = 100%
    # Value Adding: Work that directly creates customer/stakeholder value
    ideal_value_adding_pct: Mapped[float] = mapped_column(Float, default=0.50)
    # Value Enabling: Necessary support work (planning, compliance, coordination)
    ideal_value_enabling_pct: Mapped[float] = mapped_column(Float, default=0.35)
    # Waste: Non-value work to minimize (waiting, rework, unnecessary meetings)
    ideal_waste_pct: Mapped[float] = mapped_column(Float, default=0.15)
    # Legacy fields for backward compatibility
    ideal_run_percentage: Mapped[float] = mapped_column(Float, default=0.35)
    ideal_change_percentage: Mapped[float] = mapped_column(Float, default=0.65)
    throughput_indicators: Mapped[Optional[list]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    tasks: Mapped[list["Task"]] = relationship(back_populates="occupation", cascade="all, delete")
    teams: Mapped[list["Team"]] = relationship(back_populates="occupation")
    surveys: Mapped[list["Survey"]] = relationship(back_populates="occupation")
    task_assignments: Mapped[list["OccupationTask"]] = relationship(back_populates="occupation", cascade="all, delete-orphan")


class Task(Base):
    """Task model representing work activities for an occupation."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    occupation_id: Mapped[str] = mapped_column(String(36), ForeignKey("occupations.id"))
    faethm_task_id: Mapped[Optional[str]] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[TaskCategory] = mapped_column(Enum(TaskCategory), default=TaskCategory.CORE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    occupation: Mapped["Occupation"] = relationship(back_populates="tasks")
    friction_signals: Mapped[list["FrictionSignal"]] = relationship(
        back_populates="task", cascade="all, delete"
    )
    questions: Mapped[list["Question"]] = relationship(back_populates="task")


class GlobalTask(Base):
    """Global task library - tasks that can be assigned to any occupation."""

    __tablename__ = "global_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    faethm_task_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[TaskCategory] = mapped_column(Enum(TaskCategory), default=TaskCategory.CORE)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(50), default="faethm")  # faethm, custom
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    occupation_assignments: Mapped[list["OccupationTask"]] = relationship(
        back_populates="global_task", cascade="all, delete-orphan"
    )


class OccupationTask(Base):
    """Junction table for occupation-task assignments with time allocation."""

    __tablename__ = "occupation_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    occupation_id: Mapped[str] = mapped_column(String(36), ForeignKey("occupations.id", ondelete="CASCADE"))
    global_task_id: Mapped[str] = mapped_column(String(36), ForeignKey("global_tasks.id", ondelete="CASCADE"))
    time_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    category_override: Mapped[Optional[TaskCategory]] = mapped_column(Enum(TaskCategory), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    occupation: Mapped["Occupation"] = relationship(back_populates="task_assignments")
    global_task: Mapped["GlobalTask"] = relationship(back_populates="occupation_assignments")

    __table_args__ = (UniqueConstraint('occupation_id', 'global_task_id', name='uq_occupation_task'),)


class FrictionSignal(Base):
    """Friction signal detected for a task."""

    __tablename__ = "friction_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("tasks.id"))
    type: Mapped[FrictionType] = mapped_column(Enum(FrictionType), nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.MEDIUM)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    task: Mapped["Task"] = relationship(back_populates="friction_signals")
    questions: Mapped[list["Question"]] = relationship(back_populates="friction_signal")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="friction_signal")


class Team(Base):
    """Team model representing organizational units."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    function: Mapped[str] = mapped_column(String(100))
    occupation_id: Mapped[str] = mapped_column(String(36), ForeignKey("occupations.id"))
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    occupation: Mapped["Occupation"] = relationship(back_populates="teams")
    surveys: Mapped[list["Survey"]] = relationship(back_populates="team")
    metric_results: Mapped[list["MetricResult"]] = relationship(back_populates="team")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="team")


class Survey(Base):
    """Survey model for collecting KWeX responses."""

    __tablename__ = "surveys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    occupation_id: Mapped[str] = mapped_column(String(36), ForeignKey("occupations.id"))
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    survey_type: Mapped[SurveyType] = mapped_column(
        Enum(SurveyType), default=SurveyType.CORE_FRICTION
    )
    status: Mapped[SurveyStatus] = mapped_column(Enum(SurveyStatus), default=SurveyStatus.DRAFT)
    anonymous_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    estimated_completion_minutes: Mapped[int] = mapped_column(Integer, default=7)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closes_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    occupation: Mapped["Occupation"] = relationship(back_populates="surveys")
    team: Mapped["Team"] = relationship(back_populates="surveys")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="survey", cascade="all, delete"
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="survey", cascade="all, delete"
    )
    metric_results: Mapped[list["MetricResult"]] = relationship(back_populates="survey")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="survey")


class Question(Base):
    """Survey question model."""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tasks.id"))
    friction_signal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("friction_signals.id")
    )
    dimension: Mapped[FrictionType] = mapped_column(Enum(FrictionType), nullable=False)
    metric_mapping: Mapped[Optional[dict]] = mapped_column(JSON)  # List of MetricType values
    text: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), default=QuestionType.LIKERT_5)
    options: Mapped[Optional[dict]] = mapped_column(JSON)  # For multiple choice
    order: Mapped[int] = mapped_column(Integer, default=0)
    required: Mapped[bool] = mapped_column(Boolean, default=True)

    # LLM generation fields
    llm_template_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("llm_question_templates.id"), nullable=True
    )
    generation_method: Mapped[GenerationMethod] = mapped_column(
        Enum(GenerationMethod), default=GenerationMethod.STATIC
    )

    # Relationships
    survey: Mapped["Survey"] = relationship(back_populates="questions")
    task: Mapped[Optional["Task"]] = relationship(back_populates="questions")
    friction_signal: Mapped[Optional["FrictionSignal"]] = relationship(back_populates="questions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")
    llm_template: Mapped[Optional["LLMQuestionTemplate"]] = relationship(back_populates="questions")


class Response(Base):
    """Survey response model (anonymous)."""

    __tablename__ = "responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    anonymous_token: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, default=generate_uuid
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completion_time_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    survey: Mapped["Survey"] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(back_populates="response", cascade="all, delete")


class Answer(Base):
    """Answer to a survey question."""

    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    response_id: Mapped[str] = mapped_column(String(36), ForeignKey("responses.id"))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"))
    value: Mapped[str] = mapped_column(Text, nullable=False)
    numeric_value: Mapped[Optional[float]] = mapped_column(Float)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Free text comment

    # Relationships
    response: Mapped["Response"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")


class MetricResult(Base):
    """Calculated metric results for a team/survey."""

    __tablename__ = "metric_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"))
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    calculation_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    respondent_count: Mapped[int] = mapped_column(Integer, default=0)
    meets_privacy_threshold: Mapped[bool] = mapped_column(Boolean, default=False)

    # Core 4 Metrics (0-100 scale)
    flow_score: Mapped[Optional[float]] = mapped_column(Float)
    friction_score: Mapped[Optional[float]] = mapped_column(Float)
    safety_score: Mapped[Optional[float]] = mapped_column(Float)
    portfolio_balance_score: Mapped[Optional[float]] = mapped_column(Float)

    # Detailed breakdowns (JSON)
    flow_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)
    friction_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)
    safety_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)
    portfolio_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)

    # Trend data
    previous_result_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("metric_results.id")
    )
    trend_direction: Mapped[Optional[TrendDirection]] = mapped_column(Enum(TrendDirection))

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="metric_results")
    survey: Mapped["Survey"] = relationship(back_populates="metric_results")


class Opportunity(Base):
    """RICE-scored improvement opportunity."""

    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"))
    survey_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("surveys.id"), nullable=True)
    friction_signal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("friction_signals.id"), nullable=True
    )

    # Friction dimension (alternative to friction_signal_id for survey-generated opps)
    friction_type: Mapped[Optional[FrictionType]] = mapped_column(Enum(FrictionType), nullable=True)

    # RICE Score Components
    reach: Mapped[int] = mapped_column(Integer, default=0)
    impact: Mapped[float] = mapped_column(Float, default=1.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    effort: Mapped[float] = mapped_column(Float, default=2.0)
    rice_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Source score (the metric score that triggered this opportunity)
    source_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(OpportunityStatus), default=OpportunityStatus.IDENTIFIED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="opportunities")
    survey: Mapped[Optional["Survey"]] = relationship(back_populates="opportunities")
    friction_signal: Mapped[Optional["FrictionSignal"]] = relationship(back_populates="opportunities")


class LLMQuestionTemplate(Base):
    """Cached LLM-generated question template for reuse across surveys."""

    __tablename__ = "llm_question_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    task_signature: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    dimension: Mapped[FrictionType] = mapped_column(Enum(FrictionType), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType), default=QuestionType.LIKERT_5
    )
    options: Mapped[Optional[dict]] = mapped_column(JSON)  # Custom answer options
    metric_mapping: Mapped[Optional[dict]] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)
    quality_score: Mapped[float] = mapped_column(Float, default=0.8)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    questions: Mapped[list["Question"]] = relationship(back_populates="llm_template")


class EnrichedTask(Base):
    """LLM-enriched task data with additional context."""

    __tablename__ = "enriched_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    occupation_id: Mapped[str] = mapped_column(String(36), ForeignKey("occupations.id"))
    source_task_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("tasks.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[TaskCategory] = mapped_column(Enum(TaskCategory), default=TaskCategory.CORE)
    skill_requirements: Mapped[Optional[dict]] = mapped_column(JSON)
    complexity_level: Mapped[ComplexityLevel] = mapped_column(
        Enum(ComplexityLevel), default=ComplexityLevel.MEDIUM
    )
    collaboration_level: Mapped[CollaborationLevel] = mapped_column(
        Enum(CollaborationLevel), default=CollaborationLevel.TEAM
    )
    typical_friction_points: Mapped[Optional[dict]] = mapped_column(JSON)
    task_signature: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(50), default="faethm")  # faethm, llm_generated
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    occupation: Mapped["Occupation"] = relationship()
    source_task: Mapped[Optional["Task"]] = relationship()


class LLMGenerationLog(Base):
    """Audit log for LLM operations."""

    __tablename__ = "llm_generation_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    operation_type: Mapped[LLMOperationType] = mapped_column(
        Enum(LLMOperationType), nullable=False
    )
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="1.0")
    input_context: Mapped[Optional[dict]] = mapped_column(JSON)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON)
    tokens_input: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tokens_output: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occupation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("occupations.id"), nullable=True
    )
    survey_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("surveys.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatSession(Base):
    """Chat survey session tracking."""

    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    response_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("responses.id"), unique=True
    )
    anonymous_token: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, default=generate_uuid
    )
    status: Mapped[ChatSessionStatus] = mapped_column(
        Enum(ChatSessionStatus), default=ChatSessionStatus.STARTED
    )
    current_dimension: Mapped[Optional[FrictionType]] = mapped_column(
        Enum(FrictionType), nullable=True
    )
    dimensions_covered: Mapped[dict] = mapped_column(JSON, default=dict)
    llm_provider: Mapped[str] = mapped_column(String(50), default="claude")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    total_tokens_input: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens_output: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    survey: Mapped["Survey"] = relationship()
    response: Mapped["Response"] = relationship()
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    extracted_ratings: Mapped[list["ChatExtractedRating"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    summary: Mapped[Optional["ChatSummary"]] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    """Individual message in a chat survey session."""

    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id"))
    role: Mapped[ChatMessageRole] = mapped_column(Enum(ChatMessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    dimension_context: Mapped[Optional[FrictionType]] = mapped_column(
        Enum(FrictionType), nullable=True
    )
    is_rating_confirmation: Mapped[bool] = mapped_column(Boolean, default=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    tokens_input: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tokens_output: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class ChatExtractedRating(Base):
    """AI-extracted rating from chat conversation for a friction dimension."""

    __tablename__ = "chat_extracted_ratings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id"))
    dimension: Mapped[FrictionType] = mapped_column(Enum(FrictionType), nullable=False)
    ai_inferred_score: Mapped[float] = mapped_column(Float, nullable=False)  # 1-5 scale
    ai_confidence: Mapped[float] = mapped_column(Float, default=0.8)  # 0-1
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    user_adjusted_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)  # Normalized 0-100
    key_quotes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    summary_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI-generated comment
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="extracted_ratings")

    __table_args__ = (
        UniqueConstraint('session_id', 'dimension', name='uq_session_dimension'),
    )


class ChatSummary(Base):
    """AI-generated summary of a chat survey session."""

    __tablename__ = "chat_summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_sessions.id"), unique=True
    )
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_pain_points: Mapped[list] = mapped_column(JSON, default=list)  # [{dimension, description, severity}]
    positive_aspects: Mapped[list] = mapped_column(JSON, default=list)
    improvement_suggestions: Mapped[list] = mapped_column(JSON, default=list)
    overall_sentiment: Mapped[str] = mapped_column(String(50), default="neutral")  # positive/neutral/negative
    dimension_sentiments: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="summary")
