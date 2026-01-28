"""Survey API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import Survey, Team, Occupation, Response, SurveyStatus
from app.schemas import SurveyCreate, SurveyResponse, SurveyResponseStats, QuestionResponse
from app.services.survey_generator import SurveyGenerator

router = APIRouter(prefix="/surveys", tags=["surveys"])
settings = get_settings()


@router.get("", response_model=list[SurveyResponse])
def list_surveys(
    status: Optional[SurveyStatus] = None,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all surveys with optional filters."""
    query = db.query(Survey)
    if status:
        query = query.filter(Survey.status == status)
    if team_id:
        query = query.filter(Survey.team_id == team_id)
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
    Generate questions for a survey based on its occupation.

    - use_task_specific: Include questions tied to specific occupation tasks from Faethm
    - use_llm: Use LLM to generate contextual questions (default True, falls back to static)
    - max_questions: Maximum number of questions (default 18 for < 7 min completion)

    Questions cover all 6 friction dimensions:
    - Clarity: How clear are requirements and expectations
    - Tooling: How tools help vs. hinder work
    - Process: How streamlined are workflows
    - Rework: How often work must be redone
    - Delay: How much time is spent waiting
    - Safety: Psychological safety and decision stability
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

    # Try LLM generation if enabled and not in mock mode
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
