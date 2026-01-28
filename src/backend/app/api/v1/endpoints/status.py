"""System status and Faethm integration endpoints."""

from __future__ import annotations

import enum
import os
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import (
    Occupation, Task, Survey, Team, Question, Response, MetricResult,
    EnrichedTask, LLMQuestionTemplate, LLMGenerationLog,
    GlobalTask, OccupationTask,
)
from app.services.faethm_client import FaethmClient, _load_occupations_from_csv, _get_csv_path
from app.version import VERSION, VERSION_NAME, BUILD_DATE

router = APIRouter(prefix="/status", tags=["status"])
settings = get_settings()


class VersionInfo(BaseModel):
    """Application version information."""
    backend: str
    backend_name: str
    backend_build_date: str
    frontend: Optional[str] = None  # Set by frontend if available


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
    # Global task library stats
    global_tasks_count: int
    occupation_task_assignments: int
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
    curated_tasks_count: int  # From OccupationTask assignments
    team_count: int
    survey_count: int
    enriched_tasks_count: int


class SystemStatus(BaseModel):
    """Complete system status."""
    version: VersionInfo
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

    # Global task library stats
    global_tasks_count = db.query(func.count(GlobalTask.id)).scalar() or 0
    occupation_task_assignments = db.query(func.count(OccupationTask.id)).scalar() or 0

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
        global_tasks_count=global_tasks_count,
        occupation_task_assignments=occupation_task_assignments,
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
        curated_tasks = db.query(func.count(OccupationTask.id)).filter(
            OccupationTask.occupation_id == occ.id
        ).scalar() or 0
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
            curated_tasks_count=curated_tasks,
            team_count=team_count,
            survey_count=survey_count,
            enriched_tasks_count=enriched_count,
        ))

    # Sort by team count descending
    synced_occupations.sort(key=lambda x: x.team_count, reverse=True)

    return SystemStatus(
        version=VersionInfo(
            backend=VERSION,
            backend_name=VERSION_NAME,
            backend_build_date=BUILD_DATE,
        ),
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


@router.get("/faethm/tasks/{faethm_code}")
def test_faethm_tasks_api(faethm_code: str):
    """
    Test the Faethm tasks API endpoint directly.

    Returns raw API response for debugging.
    """
    import httpx

    client = FaethmClient()

    if client.use_mock:
        return {
            "mode": "mock",
            "message": "API is in mock mode, cannot test live endpoint",
        }

    result = {
        "mode": "live",
        "faethm_code": faethm_code,
        "endpoint": f"/di/v1/occupations/{faethm_code}/tasks/skills",
        "api_url": client.api_url,
        "raw_response": None,
        "response_type": None,
        "error": None,
    }

    try:
        headers = {"Authorization": f"Bearer {client.api_key}"}
        url = f"{client.api_url}/di/v1/occupations/{faethm_code}/tasks/skills"
        response = httpx.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()
        result["raw_response"] = data
        result["response_type"] = str(type(data))

        if isinstance(data, list):
            result["list_length"] = len(data)
            if len(data) > 0:
                result["first_item"] = data[0]
                result["first_item_type"] = str(type(data[0]))
        elif isinstance(data, dict):
            result["dict_keys"] = list(data.keys())

    except httpx.HTTPStatusError as e:
        result["error"] = f"HTTP {e.response.status_code}: {e.response.text[:500]}"
    except Exception as e:
        result["error"] = str(e)

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


# ============================================================================
# Reset Endpoints (Development/Admin)
# ============================================================================


class ResetResult(BaseModel):
    """Result of a reset operation."""
    success: bool
    message: str
    deleted: dict


@router.post("/reset/all", response_model=ResetResult)
def reset_all_data(
    confirm: bool = False,
    db: Session = Depends(get_db),
):
    """
    Reset ALL data in the database. Use with caution!

    Requires confirm=true query parameter to execute.
    Deletes: surveys, responses, questions, teams, occupations, tasks, etc.
    """
    if not confirm:
        return ResetResult(
            success=False,
            message="Add ?confirm=true to confirm full database reset",
            deleted={},
        )

    from app.models import (
        Answer, Response, Question, Survey, MetricResult, Opportunity,
        Team, Task, FrictionSignal, EnrichedTask, LLMQuestionTemplate,
        LLMGenerationLog,
    )

    deleted = {}

    # Delete in order of dependencies
    deleted["answers"] = db.query(Answer).delete()
    deleted["responses"] = db.query(Response).delete()
    deleted["questions"] = db.query(Question).delete()
    deleted["metric_results"] = db.query(MetricResult).delete()
    deleted["opportunities"] = db.query(Opportunity).delete()
    deleted["surveys"] = db.query(Survey).delete()
    deleted["teams"] = db.query(Team).delete()
    deleted["friction_signals"] = db.query(FrictionSignal).delete()
    deleted["tasks"] = db.query(Task).delete()
    deleted["enriched_tasks"] = db.query(EnrichedTask).delete()
    deleted["occupation_tasks"] = db.query(OccupationTask).delete()
    deleted["global_tasks"] = db.query(GlobalTask).delete()
    deleted["occupations"] = db.query(Occupation).delete()
    deleted["llm_templates"] = db.query(LLMQuestionTemplate).delete()
    deleted["llm_logs"] = db.query(LLMGenerationLog).delete()

    db.commit()

    return ResetResult(
        success=True,
        message="All data has been reset",
        deleted=deleted,
    )


@router.post("/reset/occupation/{occupation_id}", response_model=ResetResult)
def reset_occupation_data(
    occupation_id: str,
    confirm: bool = False,
    db: Session = Depends(get_db),
):
    """
    Reset all data for a specific occupation.

    Deletes: task assignments, surveys, teams linked to this occupation.
    Keeps: the occupation itself and global tasks (they may be used by other occupations).
    """
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Occupation not found")

    if not confirm:
        return ResetResult(
            success=False,
            message=f"Add ?confirm=true to confirm reset for occupation '{occupation.name}'",
            deleted={},
        )

    from app.models import (
        Answer, Response, Question, Survey, MetricResult, Opportunity,
        Team, Task, FrictionSignal, EnrichedTask,
    )

    deleted = {}

    # Get surveys for this occupation
    survey_ids = [s.id for s in db.query(Survey).filter(Survey.occupation_id == occupation_id).all()]

    # Delete survey-related data
    if survey_ids:
        deleted["answers"] = db.query(Answer).filter(
            Answer.response_id.in_(
                db.query(Response.id).filter(Response.survey_id.in_(survey_ids))
            )
        ).delete(synchronize_session=False)
        deleted["responses"] = db.query(Response).filter(Response.survey_id.in_(survey_ids)).delete(synchronize_session=False)
        deleted["questions"] = db.query(Question).filter(Question.survey_id.in_(survey_ids)).delete(synchronize_session=False)
        deleted["metric_results"] = db.query(MetricResult).filter(MetricResult.survey_id.in_(survey_ids)).delete(synchronize_session=False)
        deleted["opportunities"] = db.query(Opportunity).filter(Opportunity.survey_id.in_(survey_ids)).delete(synchronize_session=False)
        deleted["surveys"] = db.query(Survey).filter(Survey.id.in_(survey_ids)).delete(synchronize_session=False)

    # Delete teams for this occupation
    deleted["teams"] = db.query(Team).filter(Team.occupation_id == occupation_id).delete()

    # Delete task-related data
    deleted["occupation_tasks"] = db.query(OccupationTask).filter(
        OccupationTask.occupation_id == occupation_id
    ).delete()
    deleted["enriched_tasks"] = db.query(EnrichedTask).filter(
        EnrichedTask.occupation_id == occupation_id
    ).delete()

    # Delete old Task model data
    task_ids = [t.id for t in db.query(Task).filter(Task.occupation_id == occupation_id).all()]
    if task_ids:
        deleted["friction_signals"] = db.query(FrictionSignal).filter(
            FrictionSignal.task_id.in_(task_ids)
        ).delete(synchronize_session=False)
    deleted["tasks"] = db.query(Task).filter(Task.occupation_id == occupation_id).delete()

    db.commit()

    return ResetResult(
        success=True,
        message=f"Data for occupation '{occupation.name}' has been reset",
        deleted=deleted,
    )


@router.post("/reset/tasks", response_model=ResetResult)
def reset_task_assignments(
    confirm: bool = False,
    db: Session = Depends(get_db),
):
    """
    Reset all task assignments and global tasks.

    Keeps: occupations, teams, surveys.
    Deletes: occupation_tasks, global_tasks, enriched_tasks.
    """
    if not confirm:
        return ResetResult(
            success=False,
            message="Add ?confirm=true to confirm task reset",
            deleted={},
        )

    from app.models import Task, FrictionSignal, EnrichedTask

    deleted = {}

    # Delete task assignments
    deleted["occupation_tasks"] = db.query(OccupationTask).delete()
    deleted["global_tasks"] = db.query(GlobalTask).delete()
    deleted["enriched_tasks"] = db.query(EnrichedTask).delete()

    # Also delete old Task model data
    deleted["friction_signals"] = db.query(FrictionSignal).delete()
    deleted["tasks"] = db.query(Task).delete()

    db.commit()

    return ResetResult(
        success=True,
        message="All task data has been reset",
        deleted=deleted,
    )


@router.delete("/reset/occupation/{occupation_id}", response_model=ResetResult)
def delete_occupation(
    occupation_id: str,
    confirm: bool = False,
    db: Session = Depends(get_db),
):
    """
    Completely delete an occupation and all its related data.
    """
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Occupation not found")

    if not confirm:
        return ResetResult(
            success=False,
            message=f"Add ?confirm=true to confirm deletion of occupation '{occupation.name}'",
            deleted={},
        )

    # First reset all related data
    reset_result = reset_occupation_data(occupation_id, confirm=True, db=db)

    # Then delete the occupation itself
    db.query(Occupation).filter(Occupation.id == occupation_id).delete()
    db.commit()

    deleted = reset_result.deleted
    deleted["occupation"] = 1

    return ResetResult(
        success=True,
        message=f"Occupation '{occupation.name}' and all related data deleted",
        deleted=deleted,
    )


# ============================================================================
# Sample Data Generation (Development/Testing)
# ============================================================================

class GenerationMode(str, enum.Enum):
    """Mode for generating sample data."""
    RANDOM = "random"
    PERSONA = "persona"


class SampleDataRequest(BaseModel):
    """Request to generate sample survey responses."""
    survey_id: str
    count: int = 5  # Number of responses to generate
    mode: GenerationMode = GenerationMode.RANDOM


class SampleDataResult(BaseModel):
    """Result of sample data generation."""
    success: bool
    message: str
    survey_id: str
    survey_name: str
    responses_created: int
    mode: str
    personas_used: Optional[list[str]] = None


# Persona definitions for LLM-based generation
PERSONAS = [
    {
        "name": "Frustrated Veteran",
        "description": "A senior employee who has been with the company for 10+ years. They feel overwhelmed by constant process changes and new tools. They believe things were better in the old days and are skeptical of new initiatives.",
        "bias": "negative",
        "traits": ["experienced", "resistant to change", "values stability", "feels unheard"],
    },
    {
        "name": "Enthusiastic New Hire",
        "description": "A new employee who joined 3 months ago. They're excited about the work but still learning the ropes. They find some processes confusing but are optimistic about improvements.",
        "bias": "positive",
        "traits": ["eager", "learning", "optimistic", "asks questions"],
    },
    {
        "name": "Burned Out Middle Manager",
        "description": "A team lead who is caught between leadership demands and team needs. They're exhausted from constant meetings and firefighting. They see problems clearly but feel powerless to fix them.",
        "bias": "mixed_negative",
        "traits": ["stressed", "overworked", "insightful", "cynical"],
    },
    {
        "name": "High Performer",
        "description": "A top performer who has figured out how to work around most obstacles. They're generally satisfied but frustrated by bottlenecks that slow them down.",
        "bias": "positive",
        "traits": ["efficient", "results-driven", "impatient with inefficiency", "confident"],
    },
    {
        "name": "Quiet Observer",
        "description": "A solid contributor who keeps their head down and does good work. They notice issues but rarely speak up. They're moderately satisfied but see room for improvement.",
        "bias": "neutral",
        "traits": ["observant", "reserved", "practical", "risk-averse"],
    },
    {
        "name": "Change Champion",
        "description": "An employee who actively drives improvements and embraces new tools and processes. They're frustrated when others resist change and when good ideas get stuck in bureaucracy.",
        "bias": "mixed_positive",
        "traits": ["innovative", "proactive", "impatient", "collaborative"],
    },
    {
        "name": "Disengaged Worker",
        "description": "An employee who has mentally checked out. They do the minimum required and don't feel their input matters. They've stopped caring about improvements.",
        "bias": "negative",
        "traits": ["apathetic", "minimal effort", "disconnected", "going through motions"],
    },
    {
        "name": "Remote Worker Struggling",
        "description": "A remote employee who feels disconnected from the team. They struggle with communication delays and unclear expectations. Tools don't always work well for them.",
        "bias": "mixed_negative",
        "traits": ["isolated", "communication challenges", "flexible", "tech-dependent"],
    },
]


def _generate_random_answer(question_type: str, options: Optional[dict] = None) -> tuple[str, float]:
    """Generate a random answer based on question type.

    Returns (string_value, numeric_value).
    """
    if question_type == "likert_5":
        # Slightly bias toward middle values for more realistic distribution
        weights = [0.1, 0.2, 0.3, 0.25, 0.15]  # Slight negative skew (realistic)
        value = random.choices([1, 2, 3, 4, 5], weights=weights)[0]
        return str(value), float(value)

    elif question_type == "likert_7":
        weights = [0.05, 0.1, 0.15, 0.25, 0.2, 0.15, 0.1]
        value = random.choices([1, 2, 3, 4, 5, 6, 7], weights=weights)[0]
        return str(value), float(value)

    elif question_type == "percentage_slider":
        # Generate percentage with some clustering around common values
        common_values = [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100]
        if random.random() < 0.6:  # 60% chance to use common value
            value = random.choice(common_values)
        else:
            value = random.randint(0, 100)
        return str(value), float(value)

    elif question_type == "multiple_choice":
        if options and isinstance(options, list):
            choice = random.choice(options)
            return str(choice), 0.0
        return "1", 1.0

    elif question_type == "free_text":
        responses = [
            "No specific feedback.",
            "Things are generally okay.",
            "Could be better with more resources.",
            "I appreciate the team's efforts.",
            "Process improvements would help.",
        ]
        return random.choice(responses), 0.0

    else:
        return "3", 3.0  # Default middle value


def _get_persona_bias_value(bias: str, base_value: int, scale_max: int = 5) -> int:
    """Adjust a base value based on persona bias."""
    if bias == "negative":
        # Shift toward lower values
        adjustment = random.choice([-2, -1, -1, 0])
    elif bias == "positive":
        # Shift toward higher values
        adjustment = random.choice([0, 1, 1, 2])
    elif bias == "mixed_negative":
        # Mostly negative with some variance
        adjustment = random.choice([-2, -1, -1, 0, 1])
    elif bias == "mixed_positive":
        # Mostly positive with some variance
        adjustment = random.choice([-1, 0, 1, 1, 2])
    else:  # neutral
        adjustment = random.choice([-1, 0, 0, 0, 1])

    result = base_value + adjustment
    return max(1, min(scale_max, result))


async def _generate_persona_answers(
    questions: list,
    persona: dict,
    occupation_name: str,
    team_name: str,
) -> list[dict]:
    """Generate answers using LLM based on persona.

    Returns list of {question_id, value, numeric_value}.
    """
    from app.services.llm import get_llm_client, LLMError

    client = get_llm_client()

    # Build question context
    questions_text = "\n".join([
        f"{i+1}. [{q.dimension.value}] {q.text} (Type: {q.type.value})"
        for i, q in enumerate(questions)
    ])

    prompt = f"""You are role-playing as a survey respondent with the following persona:

PERSONA: {persona['name']}
{persona['description']}
Key traits: {', '.join(persona['traits'])}

CONTEXT:
- You work as a {occupation_name}
- Your team is: {team_name}
- You are completing a workplace experience survey

QUESTIONS:
{questions_text}

For each question, provide your answer as this persona would. For Likert scale questions (1-5 or 1-7), give a number. For percentage questions, give a number 0-100. For free text, give a brief 1-2 sentence response.

Respond in JSON format:
{{
  "answers": [
    {{"question_number": 1, "answer": "4", "reasoning": "brief internal thought"}},
    {{"question_number": 2, "answer": "2", "reasoning": "brief internal thought"}},
    ...
  ]
}}

Be consistent with your persona's perspective and traits. Your answers should feel authentic to this type of employee."""

    try:
        response = await client.generate(
            prompt=prompt,
            system_prompt="You are a survey simulation assistant. Generate realistic survey responses based on the persona provided. Always respond in valid JSON format.",
            max_tokens=2000,
        )

        # Parse JSON response
        import json
        import re

        # Try to extract JSON from response
        content = response.content
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            data = json.loads(json_match.group())
            llm_answers = data.get("answers", [])

            # Map answers to questions
            answers = []
            for i, q in enumerate(questions):
                # Find matching answer
                llm_answer = None
                for a in llm_answers:
                    if a.get("question_number") == i + 1:
                        llm_answer = a.get("answer", "")
                        break

                if llm_answer is None:
                    # Fallback to random if LLM didn't provide answer
                    str_val, num_val = _generate_random_answer(q.type.value, q.options)
                else:
                    str_val = str(llm_answer)
                    # Convert to numeric if applicable
                    try:
                        num_val = float(llm_answer)
                    except (ValueError, TypeError):
                        num_val = 0.0

                answers.append({
                    "question_id": q.id,
                    "value": str_val,
                    "numeric_value": num_val,
                })

            return answers

    except (LLMError, json.JSONDecodeError, Exception) as e:
        print(f"LLM persona generation failed: {e}, falling back to biased random")

    # Fallback: Generate biased random answers based on persona
    answers = []
    for q in questions:
        if q.type.value in ("likert_5", "likert_7"):
            scale_max = 5 if q.type.value == "likert_5" else 7
            base = scale_max // 2 + 1  # Middle value
            value = _get_persona_bias_value(persona["bias"], base, scale_max)
            answers.append({
                "question_id": q.id,
                "value": str(value),
                "numeric_value": float(value),
            })
        else:
            str_val, num_val = _generate_random_answer(q.type.value, q.options)
            answers.append({
                "question_id": q.id,
                "value": str_val,
                "numeric_value": num_val,
            })

    return answers


@router.post("/generate-sample-data", response_model=SampleDataResult)
async def generate_sample_data(
    request: SampleDataRequest,
    db: Session = Depends(get_db),
):
    """
    Generate sample survey responses for testing.

    Modes:
    - random: Generate random answers (fast, good for stress testing)
    - persona: Use LLM to generate realistic answers from different personas

    The survey must be in 'active' status to generate responses.
    """
    from app.models import Survey, Question, Response, Answer, SurveyStatus
    from fastapi import HTTPException

    # Get the survey
    survey = db.query(Survey).filter(Survey.id == request.survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Survey must be active to generate responses. Current status: {survey.status.value}"
        )

    # Get questions
    questions = db.query(Question).filter(
        Question.survey_id == request.survey_id
    ).order_by(Question.order).all()

    if not questions:
        raise HTTPException(status_code=400, detail="Survey has no questions")

    # Get occupation and team names for context
    occupation_name = survey.occupation.name if survey.occupation else "Employee"
    team_name = survey.team.name if survey.team else "Team"

    responses_created = 0
    personas_used = []

    # Generate responses
    for i in range(request.count):
        # Create response record
        response = Response(
            survey_id=request.survey_id,
            is_complete=True,
            submitted_at=datetime.utcnow(),
            completion_time_seconds=random.randint(180, 600),  # 3-10 minutes
        )
        db.add(response)
        db.flush()  # Get the ID

        if request.mode == GenerationMode.RANDOM:
            # Generate random answers
            for q in questions:
                str_val, num_val = _generate_random_answer(q.type.value, q.options)
                answer = Answer(
                    response_id=response.id,
                    question_id=q.id,
                    value=str_val,
                    numeric_value=num_val,
                )
                db.add(answer)

        else:  # PERSONA mode
            # Select a persona (cycle through available personas)
            persona = PERSONAS[i % len(PERSONAS)]
            personas_used.append(persona["name"])

            # Generate answers using LLM or biased random
            answers_data = await _generate_persona_answers(
                questions, persona, occupation_name, team_name
            )

            for ans in answers_data:
                answer = Answer(
                    response_id=response.id,
                    question_id=ans["question_id"],
                    value=ans["value"],
                    numeric_value=ans["numeric_value"],
                )
                db.add(answer)

        responses_created += 1

    db.commit()

    # Automatically calculate/recalculate metrics after generating sample data
    metrics_message = ""
    try:
        from app.services.metrics_calculator import MetricsCalculator

        # Delete existing metrics for this survey to force recalculation
        db.query(MetricResult).filter(
            MetricResult.survey_id == request.survey_id
        ).delete()
        db.commit()

        # Calculate fresh metrics
        calculator = MetricsCalculator(db)
        metric_result = calculator.calculate_metrics(survey)

        if metric_result:
            if metric_result.meets_privacy_threshold:
                metrics_message = f" Metrics calculated: Flow={metric_result.flow_score:.0f}, Friction={metric_result.friction_score:.0f}"
            else:
                metrics_message = f" Metrics pending: {metric_result.respondent_count}/{settings.min_respondents_for_display} responses needed"
        else:
            metrics_message = " (metrics calculation returned no result)"

    except Exception as e:
        print(f"Error calculating metrics after sample data generation: {e}")
        metrics_message = f" (metrics calculation failed: {str(e)[:50]})"

    return SampleDataResult(
        success=True,
        message=f"Generated {responses_created} sample responses using {request.mode.value} mode.{metrics_message}",
        survey_id=request.survey_id,
        survey_name=survey.name,
        responses_created=responses_created,
        mode=request.mode.value,
        personas_used=personas_used if personas_used else None,
    )


@router.get("/surveys")
def list_surveys_for_sample_data(db: Session = Depends(get_db)):
    """
    List surveys available for sample data generation.

    Returns all surveys with questions - active ones can receive responses,
    others are shown for reference.
    """
    from app.models import Survey, SurveyStatus, Question

    # Get ALL surveys, not just active - show status so user knows which can receive data
    surveys = db.query(Survey).all()

    print(f"DEBUG: Found {len(surveys)} total surveys")
    for s in surveys:
        print(f"DEBUG: Survey '{s.name}' status={s.status.value}")

    result = []
    for s in surveys:
        question_count = db.query(func.count(Question.id)).filter(
            Question.survey_id == s.id
        ).scalar() or 0

        response_count = len(s.responses) if s.responses else 0

        # Only include surveys with questions
        if question_count > 0:
            result.append({
                "id": s.id,
                "name": s.name,
                "team_name": s.team.name if s.team else "Unknown",
                "occupation_name": s.occupation.name if s.occupation else "Unknown",
                "status": s.status.value,
                "question_count": question_count,
                "response_count": response_count,
                "can_generate": s.status == SurveyStatus.ACTIVE,  # Only active surveys can receive data
            })

    return {"surveys": result, "personas_available": [p["name"] for p in PERSONAS]}
