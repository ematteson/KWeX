"""Survey API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import Survey, Team, Occupation, Response, SurveyStatus, SurveyType, Question
from app.schemas import (
    SurveyCreate,
    SurveyResponse,
    SurveyResponseStats,
    QuestionResponse,
    PsychSafetyResult,
    PsychSafetyCreateRequest,
)
from app.services.survey_generator import SurveyGenerator
from app.services.psych_safety_service import PsychSafetyService, create_psych_safety_survey

router = APIRouter(prefix="/surveys", tags=["surveys"])
settings = get_settings()


@router.get("", response_model=list[SurveyResponse])
def list_surveys(
    status: Optional[SurveyStatus] = None,
    team_id: Optional[str] = None,
    survey_type: Optional[SurveyType] = None,
    db: Session = Depends(get_db),
):
    """List all surveys with optional filters."""
    query = db.query(Survey)
    if status:
        query = query.filter(Survey.status == status)
    if team_id:
        query = query.filter(Survey.team_id == team_id)
    if survey_type:
        query = query.filter(Survey.survey_type == survey_type)
    return query.all()


@router.post("", response_model=SurveyResponse, status_code=201)
def create_survey(survey: SurveyCreate, db: Session = Depends(get_db)):
    """Create a new survey."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == survey.occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    # Verify team exists
    team = db.query(Team).filter(Team.id == survey.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db_survey = Survey(**survey.model_dump())
    db.add(db_survey)
    db.commit()
    db.refresh(db_survey)
    return db_survey


@router.get("/{survey_id}", response_model=SurveyResponse)
def get_survey(survey_id: str, db: Session = Depends(get_db)):
    """Get a specific survey with questions."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


@router.put("/{survey_id}", response_model=SurveyResponse)
def update_survey(survey_id: str, survey_update: SurveyCreate, db: Session = Depends(get_db)):
    """Update a survey (only if in DRAFT status)."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only update surveys in DRAFT status")

    for key, value in survey_update.model_dump().items():
        setattr(survey, key, value)

    db.commit()
    db.refresh(survey)
    return survey


@router.delete("/{survey_id}", status_code=204)
def delete_survey(survey_id: str, db: Session = Depends(get_db)):
    """Delete a survey (only if in DRAFT status)."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only delete surveys in DRAFT status")

    db.delete(survey)
    db.commit()


@router.post("/{survey_id}/generate-questions", response_model=list[QuestionResponse])
async def generate_survey_questions(
    survey_id: str,
    use_task_specific: bool = False,
    use_llm: bool = True,
    max_questions: int = 18,
    db: Session = Depends(get_db),
):
    """
    Generate questions for a survey based on its type and occupation.

    For CORE_FRICTION surveys:
    - use_task_specific: Include questions tied to specific occupation tasks from Faethm
    - use_llm: Use LLM to generate contextual questions (default True, falls back to static)
    - max_questions: Maximum number of questions (default 18 for < 7 min completion)

    Questions cover all 6 friction dimensions:
    - Clarity: How clear are requirements and expectations
    - Tooling: How tools help vs. hinder work
    - Process: How streamlined are workflows
    - Rework: How often work must be redone
    - Delay: How much time is spent waiting
    - Voice: Behavioral indicators of speak-up culture

    For PSYCHOLOGICAL_SAFETY surveys:
    Uses Edmondson's validated 7-item scale (questions are fixed).
    """
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(
            status_code=400, detail="Can only generate questions for surveys in DRAFT status"
        )

    if survey.questions:
        raise HTTPException(
            status_code=400,
            detail="Survey already has questions. Delete existing questions first or create a new survey.",
        )

    questions = None

    # Handle PSYCHOLOGICAL_SAFETY surveys with dedicated service
    if survey.survey_type == SurveyType.PSYCHOLOGICAL_SAFETY:
        psych_service = PsychSafetyService(db)
        questions = psych_service.generate_assessment_questions(survey)
        survey.estimated_completion_minutes = 3  # 7 questions = ~3 minutes
        db.commit()
        return questions

    # CORE_FRICTION surveys: Try LLM generation if enabled and not in mock mode
    if use_llm and not settings.llm_mock:
        try:
            from app.services.question_generation_service import QuestionGenerationService

            print(f"Generating questions with LLM for survey {survey_id}")
            llm_service = QuestionGenerationService(db)
            questions = await llm_service.generate_questions_for_survey(
                survey_id=survey_id,
                use_cache=True,
                max_questions=max_questions,
            )
            print(f"LLM generated {len(questions)} questions")
        except Exception as e:
            print(f"LLM question generation failed, falling back to static: {e}")
            questions = None

    # Fall back to static generator if LLM didn't work
    if questions is None:
        print(f"Using static generator for survey {survey_id}")
        generator = SurveyGenerator(db)

        if use_task_specific:
            questions = generator.generate_survey_from_tasks(survey, max_questions=max_questions)
        else:
            questions = generator.generate_survey(survey, max_questions=max_questions)

    # Update estimated completion time
    survey.estimated_completion_minutes = SurveyGenerator(db).estimate_completion_time(len(questions))
    db.commit()

    return questions


@router.post("/{survey_id}/activate", response_model=SurveyResponse)
def activate_survey(survey_id: str, db: Session = Depends(get_db)):
    """Activate a survey to start collecting responses."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only activate surveys in DRAFT status")

    if not survey.questions:
        raise HTTPException(status_code=400, detail="Cannot activate survey without questions")

    survey.status = SurveyStatus.ACTIVE
    db.commit()
    db.refresh(survey)
    return survey


@router.post("/{survey_id}/close", response_model=SurveyResponse)
def close_survey(survey_id: str, db: Session = Depends(get_db)):
    """Close a survey to stop collecting responses."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only close active surveys")

    survey.status = SurveyStatus.CLOSED
    survey.closes_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    return survey


@router.post("/{survey_id}/clone", response_model=SurveyResponse)
def clone_survey(
    survey_id: str,
    new_name: Optional[str] = None,
    new_team_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Clone a survey to create a new instance with the same questions.

    Useful for running recurring surveys (e.g., quarterly) or using the same
    survey template for different teams.

    - new_name: Optional new name (defaults to "{original name} (Copy)")
    - new_team_id: Optional different team (defaults to same team)

    The cloned survey will be in DRAFT status with all questions copied.
    """
    # Get the original survey
    original = db.query(Survey).filter(Survey.id == survey_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Survey not found")

    # Validate new team if provided
    if new_team_id:
        team = db.query(Team).filter(Team.id == new_team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="New team not found")

    # Generate new name if not provided
    if not new_name:
        # Check for existing copies to increment number
        base_name = original.name.rstrip()
        if base_name.endswith(")") and " (Copy" in base_name:
            # Already a copy, extract base name
            base_name = base_name[:base_name.rfind(" (Copy")]

        # Count existing copies
        existing_copies = db.query(Survey).filter(
            Survey.name.like(f"{base_name} (Copy%")
        ).count()

        if existing_copies == 0:
            new_name = f"{base_name} (Copy)"
        else:
            new_name = f"{base_name} (Copy {existing_copies + 1})"

    # Create the new survey
    cloned_survey = Survey(
        name=new_name,
        occupation_id=original.occupation_id,
        team_id=new_team_id or original.team_id,
        survey_type=original.survey_type,
        status=SurveyStatus.DRAFT,
        anonymous_mode=original.anonymous_mode,
        estimated_completion_minutes=original.estimated_completion_minutes,
    )
    db.add(cloned_survey)
    db.flush()  # Get the new survey ID

    # Clone all questions
    original_questions = db.query(Question).filter(
        Question.survey_id == survey_id
    ).order_by(Question.order).all()

    for q in original_questions:
        cloned_question = Question(
            survey_id=cloned_survey.id,
            task_id=q.task_id,
            friction_signal_id=q.friction_signal_id,
            dimension=q.dimension,
            metric_mapping=q.metric_mapping,
            text=q.text,
            type=q.type,
            options=q.options,
            order=q.order,
            required=q.required,
            llm_template_id=q.llm_template_id,
            generation_method=q.generation_method,
        )
        db.add(cloned_question)

    db.commit()
    db.refresh(cloned_survey)

    return cloned_survey


@router.get("/{survey_id}/link")
def generate_survey_link(survey_id: str, db: Session = Depends(get_db)):
    """Generate an anonymous response link for a survey."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not active")

    # Create a new response placeholder with anonymous token
    response = Response(survey_id=survey_id)
    db.add(response)
    db.commit()
    db.refresh(response)

    return {"token": response.anonymous_token, "url": f"/respond/{response.anonymous_token}"}


@router.get("/{survey_id}/stats", response_model=SurveyResponseStats)
def get_survey_stats(survey_id: str, db: Session = Depends(get_db)):
    """Get response statistics for a survey (respects privacy threshold)."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    total_responses = db.query(Response).filter(Response.survey_id == survey_id).count()
    complete_responses = (
        db.query(Response)
        .filter(Response.survey_id == survey_id, Response.is_complete == True)
        .count()
    )

    # Calculate average completion time for complete responses
    avg_time = None
    if complete_responses > 0:
        from sqlalchemy import func

        result = (
            db.query(func.avg(Response.completion_time_seconds))
            .filter(Response.survey_id == survey_id, Response.is_complete == True)
            .scalar()
        )
        avg_time = float(result) if result else None

    return SurveyResponseStats(
        survey_id=survey_id,
        total_responses=total_responses,
        complete_responses=complete_responses,
        meets_privacy_threshold=complete_responses >= settings.min_respondents_for_display,
        average_completion_time_seconds=avg_time,
    )


# ============================================================================
# Psychological Safety Assessment Endpoints
# ============================================================================


@router.post("/psych-safety", response_model=SurveyResponse, status_code=201)
def create_psych_safety_assessment(
    request: PsychSafetyCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new Psychological Safety assessment survey.

    Uses Amy Edmondson's validated 7-item scale to measure team psychological safety.
    This is a separate assessment from core friction surveys, using validated questions
    that should not be modified.

    The assessment takes approximately 3 minutes to complete.
    """
    # Verify team exists
    team = db.query(Team).filter(Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Create the survey with questions
    survey = create_psych_safety_survey(
        db=db,
        team_id=request.team_id,
        occupation_id=team.occupation_id,
        name=request.name,
    )

    return survey


@router.get("/{survey_id}/psych-safety-results", response_model=PsychSafetyResult)
def get_psych_safety_results(survey_id: str, db: Session = Depends(get_db)):
    """
    Get psychological safety assessment results for a survey.

    Returns:
    - overall_score: 1-7 scale (higher = more psychologically safe)
    - item_scores: Individual scores for each of the 7 items
    - interpretation: "Low", "Moderate", or "High"
    - benchmark_percentile: How this team compares to benchmarks

    Results are only available if the privacy threshold is met.
    """
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.survey_type != SurveyType.PSYCHOLOGICAL_SAFETY:
        raise HTTPException(
            status_code=400,
            detail="This endpoint is only for PSYCHOLOGICAL_SAFETY surveys. Use /metrics for core friction surveys.",
        )

    service = PsychSafetyService(db)
    result = service.calculate_psych_safety_score(survey)

    return PsychSafetyResult(**result)


@router.get("/{survey_id}/psych-safety-dimensions")
def get_psych_safety_dimensions(survey_id: str, db: Session = Depends(get_db)):
    """
    Get psychological safety scores broken down by dimension.

    Dimensions:
    - error_tolerance: Tolerance for mistakes
    - openness: Ability to discuss problems
    - inclusion: Acceptance of differences
    - risk_taking: Safety to take risks
    - help_seeking: Comfort asking for help
    - mutual_respect: Trust in teammates
    - contribution: Feeling valued

    Results are only available if the privacy threshold is met.
    """
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.survey_type != SurveyType.PSYCHOLOGICAL_SAFETY:
        raise HTTPException(
            status_code=400,
            detail="This endpoint is only for PSYCHOLOGICAL_SAFETY surveys.",
        )

    service = PsychSafetyService(db)
    dimensions = service.get_dimension_breakdown(survey)

    if dimensions is None:
        raise HTTPException(
            status_code=400,
            detail="Results not available. Privacy threshold may not be met.",
        )

    return {"survey_id": survey_id, "dimensions": dimensions}
