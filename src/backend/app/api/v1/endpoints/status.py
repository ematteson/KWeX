"""System status and Faethm integration endpoints."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import (
    Occupation, Task, Survey, Team, Question, Response,
    EnrichedTask, LLMQuestionTemplate, LLMGenerationLog,
)
from app.services.faethm_client import FaethmClient, _load_occupations_from_csv, _get_csv_path

router = APIRouter(prefix="/status", tags=["status"])
settings = get_settings()


class FaethmStatus(BaseModel):
    """Faethm API connection status."""
    mode: str  # "live" or "mock"
    api_url: Optional[str]
    api_key_configured: bool
    csv_path: str
    csv_exists: bool
    csv_occupations_count: int


class LLMEndpointStatus(BaseModel):
    """Status of an LLM endpoint."""
    name: str
    endpoint: str
    api_key_configured: bool
    api_key_preview: str  # First/last chars only
    deployment: str
    available: bool


class LLMStatus(BaseModel):
    """LLM service status."""
    mode: str  # "live" or "mock"
    mock_setting: bool  # The actual setting value
    default_model: str
    temperature: float
    max_tokens: int
    cache_min_quality: float
    claude: LLMEndpointStatus
    gpt: LLMEndpointStatus
    env_vars: dict  # Environment variable status


class LLMStats(BaseModel):
    """LLM usage statistics."""
    enriched_tasks_count: int
    cached_templates_count: int
    total_llm_calls: int
    successful_calls: int
    failed_calls: int
    recent_operations: list[dict]


class DatabaseStatus(BaseModel):
    """Database statistics."""
    occupations_synced: int
    tasks_count: int
    teams_count: int
    surveys_count: int
    questions_count: int
    responses_count: int
    occupations_with_tasks: int
    # LLM-related stats
    enriched_tasks_count: int
    llm_templates_count: int
    llm_generated_questions: int
    llm_cached_questions: int


class OccupationSummary(BaseModel):
    """Summary of a synced occupation."""
    id: str
    name: str
    faethm_code: Optional[str]
    task_count: int
    team_count: int
    survey_count: int
    enriched_tasks_count: int


class SystemStatus(BaseModel):
    """Complete system status."""
    timestamp: str
    environment: str
    faethm: FaethmStatus
    llm: LLMStatus
    llm_stats: LLMStats
    database: DatabaseStatus
    synced_occupations: list[OccupationSummary]
    privacy_threshold: int
    max_survey_minutes: int


def _mask_api_key(key: str) -> str:
    """Mask an API key, showing only first 4 and last 4 characters."""
    if not key:
        return "(not set)"
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


@router.get("", response_model=SystemStatus)
def get_system_status(db: Session = Depends(get_db)):
    """
    Get comprehensive system status including Faethm and LLM integration details.

    Shows:
    - Whether using live Faethm API or mock CSV data
    - LLM configuration and endpoint status
    - Number of occupations available from CSV
    - Database statistics (synced occupations, tasks, teams, etc.)
    - LLM usage statistics
    - List of synced occupations with their task/team counts
    """
    # Check Faethm configuration - match FaethmClient logic
    faethm_api_key = os.environ.get("FaethmPROD", settings.faethm_api_key)
    faethm_api_url = settings.faethm_api_url
    api_url_valid = bool(
        faethm_api_url and
        (faethm_api_url.startswith("http://") or faethm_api_url.startswith("https://"))
    )
    api_key_valid = bool(faethm_api_key)
    # Live mode requires: mock disabled AND valid URL AND valid key
    use_live = not settings.faethm_api_mock and api_url_valid and api_key_valid

    csv_path = _get_csv_path()
    csv_exists = csv_path.exists()

    # Load CSV occupations count
    csv_occupations = []
    if csv_exists:
        try:
            csv_occupations = _load_occupations_from_csv()
        except Exception:
            pass

    faethm_status = FaethmStatus(
        mode="live" if use_live else "mock",
        api_url=settings.faethm_api_url if use_live else None,
        api_key_configured=bool(faethm_api_key),
        csv_path=str(csv_path),
        csv_exists=csv_exists,
        csv_occupations_count=len(csv_occupations),
    )

    # LLM Configuration Status
    # Check environment variables directly
    env_anthropic_key = os.environ.get("AZURE_ANTHROPIC_API_KEY", "")
    env_openai_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    env_llm_mock = os.environ.get("LLM_MOCK", "")

    # Check if Claude endpoint is available
    claude_key = settings.azure_anthropic_api_key or env_anthropic_key
    claude_available = bool(settings.azure_anthropic_endpoint and claude_key)

    # Check if GPT endpoint is available
    gpt_key = settings.azure_openai_api_key or env_openai_key
    gpt_available = bool(settings.azure_openai_endpoint and gpt_key)

    # Determine actual mode
    llm_use_mock = settings.llm_mock
    llm_mode = "mock" if llm_use_mock else "live"

    llm_status = LLMStatus(
        mode=llm_mode,
        mock_setting=settings.llm_mock,
        default_model=settings.llm_default_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        cache_min_quality=settings.question_cache_min_quality,
        claude=LLMEndpointStatus(
            name="Azure Claude (Anthropic)",
            endpoint=settings.azure_anthropic_endpoint,
            api_key_configured=bool(claude_key),
            api_key_preview=_mask_api_key(claude_key),
            deployment=settings.azure_anthropic_deployment,
            available=claude_available,
        ),
        gpt=LLMEndpointStatus(
            name="Azure OpenAI (GPT)",
            endpoint=settings.azure_openai_endpoint,
            api_key_configured=bool(gpt_key),
            api_key_preview=_mask_api_key(gpt_key),
            deployment=settings.azure_openai_deployment,
            available=gpt_available,
        ),
        env_vars={
            "LLM_MOCK": env_llm_mock or "(not set, using default)",
            "AZURE_ANTHROPIC_API_KEY": "set" if env_anthropic_key else "not set",
            "AZURE_OPENAI_API_KEY": "set" if env_openai_key else "not set",
        },
    )

    # LLM Statistics
    enriched_tasks_count = db.query(func.count(EnrichedTask.id)).scalar() or 0
    cached_templates_count = db.query(func.count(LLMQuestionTemplate.id)).scalar() or 0
    total_llm_calls = db.query(func.count(LLMGenerationLog.id)).scalar() or 0
    successful_calls = db.query(func.count(LLMGenerationLog.id)).filter(
        LLMGenerationLog.success == True
    ).scalar() or 0
    failed_calls = total_llm_calls - successful_calls

    # Get recent operations (last 10)
    recent_logs = db.query(LLMGenerationLog).order_by(
        desc(LLMGenerationLog.created_at)
    ).limit(10).all()

    recent_operations = []
    for log in recent_logs:
        recent_operations.append({
            "id": log.id,
            "operation": log.operation_type.value if log.operation_type else "unknown",
            "model": log.model_used,
            "success": log.success,
            "latency_ms": log.latency_ms,
            "tokens_in": log.tokens_input,
            "tokens_out": log.tokens_output,
            "error": log.error_message[:100] if log.error_message else None,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    llm_stats = LLMStats(
        enriched_tasks_count=enriched_tasks_count,
        cached_templates_count=cached_templates_count,
        total_llm_calls=total_llm_calls,
        successful_calls=successful_calls,
        failed_calls=failed_calls,
        recent_operations=recent_operations,
    )

    # Database statistics
    occupations_count = db.query(func.count(Occupation.id)).scalar() or 0
    tasks_count = db.query(func.count(Task.id)).scalar() or 0
    teams_count = db.query(func.count(Team.id)).scalar() or 0
    surveys_count = db.query(func.count(Survey.id)).scalar() or 0
    questions_count = db.query(func.count(Question.id)).scalar() or 0
    responses_count = db.query(func.count(Response.id)).scalar() or 0

    # Count occupations that have tasks
    occupations_with_tasks = db.query(func.count(func.distinct(Task.occupation_id))).scalar() or 0

    # LLM-related question counts
    from app.models.models import GenerationMethod
    llm_generated = db.query(func.count(Question.id)).filter(
        Question.generation_method == GenerationMethod.LLM_GENERATED
    ).scalar() or 0
    llm_cached = db.query(func.count(Question.id)).filter(
        Question.generation_method == GenerationMethod.LLM_CACHED
    ).scalar() or 0
    llm_templates = db.query(func.count(LLMQuestionTemplate.id)).scalar() or 0

    database_status = DatabaseStatus(
        occupations_synced=occupations_count,
        tasks_count=tasks_count,
        teams_count=teams_count,
        surveys_count=surveys_count,
        questions_count=questions_count,
        responses_count=responses_count,
        occupations_with_tasks=occupations_with_tasks,
        enriched_tasks_count=enriched_tasks_count,
        llm_templates_count=llm_templates,
        llm_generated_questions=llm_generated,
        llm_cached_questions=llm_cached,
    )

    # Get synced occupations with counts
    occupations = db.query(Occupation).all()
    synced_occupations = []

    for occ in occupations:
        task_count = db.query(func.count(Task.id)).filter(Task.occupation_id == occ.id).scalar() or 0
        team_count = db.query(func.count(Team.id)).filter(Team.occupation_id == occ.id).scalar() or 0
        survey_count = db.query(func.count(Survey.id)).filter(Survey.occupation_id == occ.id).scalar() or 0
        enriched_count = db.query(func.count(EnrichedTask.id)).filter(
            EnrichedTask.occupation_id == occ.id
        ).scalar() or 0

        synced_occupations.append(OccupationSummary(
            id=occ.id,
            name=occ.name,
            faethm_code=occ.faethm_code,
            task_count=task_count,
            team_count=team_count,
            survey_count=survey_count,
            enriched_tasks_count=enriched_count,
        ))

    # Sort by team count descending
    synced_occupations.sort(key=lambda x: x.team_count, reverse=True)

    return SystemStatus(
        timestamp=datetime.utcnow().isoformat(),
        environment="development" if settings.debug else "production",
        faethm=faethm_status,
        llm=llm_status,
        llm_stats=llm_stats,
        database=database_status,
        synced_occupations=synced_occupations,
        privacy_threshold=settings.min_respondents_for_display,
        max_survey_minutes=settings.max_survey_completion_minutes,
    )


@router.get("/faethm/test")
def test_faethm_connection(db: Session = Depends(get_db)):
    """
    Test the Faethm API connection.

    Returns connection status and sample data.
    """
    client = FaethmClient()

    result = {
        "mode": "mock" if client.use_mock else "live",
        "api_url": client.api_url,
        "api_key_set": bool(client.api_key),
        "test_result": None,
        "error": None,
    }

    try:
        # Try to get occupations
        occupations = client.get_occupations()
        result["test_result"] = {
            "success": True,
            "occupations_returned": len(occupations),
            "sample": occupations[:3] if occupations else [],
        }
    except Exception as e:
        result["error"] = str(e)
        result["test_result"] = {"success": False}

    return result


@router.get("/llm/test")
async def test_llm_connection():
    """
    Test the LLM connection.

    Makes a simple test call to verify the LLM is working.
    Returns detailed configuration and connection status.
    """
    import traceback
    from app.services.llm import get_llm_client, LLMError

    result = {
        "settings": {
            "llm_mock": settings.llm_mock,
            "default_model": settings.llm_default_model,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
        },
        "environment": {
            "LLM_MOCK": os.environ.get("LLM_MOCK", "(not set)"),
            "AZURE_ANTHROPIC_API_KEY": "set" if os.environ.get("AZURE_ANTHROPIC_API_KEY") else "not set",
            "AZURE_OPENAI_API_KEY": "set" if os.environ.get("AZURE_OPENAI_API_KEY") else "not set",
        },
        "client": None,
        "test_result": None,
        "error": None,
        "traceback": None,
    }

    try:
        client = get_llm_client()
        result["client"] = {
            "type": type(client).__name__,
            "model_name": client.get_model_name(),
            "is_available": client.is_available(),
        }

        # Try a simple generation
        response = await client.generate(
            prompt="Say 'Hello, KWeX!' and nothing else.",
            system_prompt="You are a helpful assistant. Respond concisely.",
            max_tokens=50,
        )

        result["test_result"] = {
            "success": True,
            "response": response.content[:200],  # Truncate long responses
            "model": response.model,
            "tokens_input": response.tokens_input,
            "tokens_output": response.tokens_output,
            "latency_ms": response.latency_ms,
        }

    except LLMError as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["test_result"] = {"success": False}
        result["traceback"] = traceback.format_exc()

    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["test_result"] = {"success": False}
        result["traceback"] = traceback.format_exc()

    return result


@router.get("/llm/config")
def get_llm_config():
    """
    Get detailed LLM configuration for debugging.

    Shows all settings values and their sources.
    """
    # Read .env file if it exists
    env_file_contents = {}
    env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        # Mask sensitive values
                        if "KEY" in key.upper() or "SECRET" in key.upper():
                            value = _mask_api_key(value)
                        env_file_contents[key] = value
        except Exception as e:
            env_file_contents["_error"] = str(e)

    return {
        "settings_source": "pydantic Settings class",
        "env_file_path": env_path,
        "env_file_exists": os.path.exists(env_path),
        "env_file_llm_vars": {
            k: v for k, v in env_file_contents.items()
            if "LLM" in k.upper() or "AZURE" in k.upper() or "ANTHROPIC" in k.upper() or "OPENAI" in k.upper()
        },
        "loaded_settings": {
            "llm_mock": settings.llm_mock,
            "llm_default_model": settings.llm_default_model,
            "llm_temperature": settings.llm_temperature,
            "llm_max_tokens": settings.llm_max_tokens,
            "question_cache_min_quality": settings.question_cache_min_quality,
            "azure_anthropic_endpoint": settings.azure_anthropic_endpoint,
            "azure_anthropic_api_key": _mask_api_key(settings.azure_anthropic_api_key),
            "azure_anthropic_deployment": settings.azure_anthropic_deployment,
            "azure_openai_endpoint": settings.azure_openai_endpoint,
            "azure_openai_api_key": _mask_api_key(settings.azure_openai_api_key),
            "azure_openai_deployment": settings.azure_openai_deployment,
            "azure_openai_api_version": settings.azure_openai_api_version,
        },
        "os_environ_llm_vars": {
            "LLM_MOCK": os.environ.get("LLM_MOCK", "(not in os.environ)"),
            "AZURE_ANTHROPIC_API_KEY": "set" if os.environ.get("AZURE_ANTHROPIC_API_KEY") else "not set",
            "AZURE_OPENAI_API_KEY": "set" if os.environ.get("AZURE_OPENAI_API_KEY") else "not set",
        },
        "why_mock_mode": _explain_mock_mode(),
    }


def _explain_mock_mode() -> str:
    """Explain why mock mode is being used."""
    if settings.llm_mock:
        env_val = os.environ.get("LLM_MOCK", "")
        if env_val.lower() in ("true", "1", "yes"):
            return "LLM_MOCK environment variable is set to true"
        elif env_val == "":
            return "LLM_MOCK not set in environment, using default value (True)"
        else:
            return f"settings.llm_mock is True (env value: '{env_val}')"
    else:
        return "Mock mode is disabled - using live LLM endpoints"


class QuestionTaskMapping(BaseModel):
    """Mapping of a question to its related task and friction dimension."""
    question_id: str
    question_text: str
    question_order: int
    dimension: str
    dimension_label: str
    task_id: Optional[str]
    task_name: Optional[str]
    task_description: Optional[str]
    faethm_task_id: Optional[str]
    metric_mapping: list[str]


class SurveyQuestionMapping(BaseModel):
    """Complete mapping of survey questions to tasks."""
    survey_id: str
    survey_name: str
    occupation_id: str
    occupation_name: str
    occupation_faethm_code: Optional[str]
    total_questions: int
    questions_with_tasks: int
    questions: list[QuestionTaskMapping]


@router.get("/surveys/{survey_id}/question-mapping", response_model=SurveyQuestionMapping)
def get_survey_question_mapping(survey_id: str, db: Session = Depends(get_db)):
    """
    Get the mapping of survey questions to Faethm tasks and friction dimensions.

    Shows which tasks and friction areas each question is measuring.
    """
    from app.models import Survey, Question, Task, Occupation

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Survey not found")

    occupation = db.query(Occupation).filter(Occupation.id == survey.occupation_id).first()

    # Get questions ordered
    questions = (
        db.query(Question)
        .filter(Question.survey_id == survey_id)
        .order_by(Question.order)
        .all()
    )

    dimension_labels = {
        "clarity": "Task Clarity",
        "tooling": "Tools & Systems",
        "process": "Process Efficiency",
        "rework": "Rework Frequency",
        "delay": "Wait Times & Delays",
        "safety": "Psychological Safety",
    }

    question_mappings = []
    questions_with_tasks = 0

    for q in questions:
        task = None
        if q.task_id:
            task = db.query(Task).filter(Task.id == q.task_id).first()
            questions_with_tasks += 1

        question_mappings.append(QuestionTaskMapping(
            question_id=q.id,
            question_text=q.text,
            question_order=q.order,
            dimension=q.dimension.value if q.dimension else "unknown",
            dimension_label=dimension_labels.get(q.dimension.value, "Unknown") if q.dimension else "Unknown",
            task_id=task.id if task else None,
            task_name=task.name if task else None,
            task_description=task.description if task else None,
            faethm_task_id=task.faethm_task_id if task else None,
            metric_mapping=q.metric_mapping or [],
        ))

    return SurveyQuestionMapping(
        survey_id=survey.id,
        survey_name=survey.name,
        occupation_id=occupation.id if occupation else "",
        occupation_name=occupation.name if occupation else "Unknown",
        occupation_faethm_code=occupation.faethm_code if occupation else None,
        total_questions=len(questions),
        questions_with_tasks=questions_with_tasks,
        questions=question_mappings,
    )
