"""Survey response collection endpoints (anonymous)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Response, Survey, Question, Answer, SurveyStatus
from app.schemas import ResponseSubmit
from app.schemas.schemas import (
    ChatMessageResponse,
    ChatSessionResponse,
    QuestionResponse,
    SurveyResponseResponse,
)
from app.services.chat_survey_service import ChatSurveyService

router = APIRouter(prefix="/respond", tags=["responses"])


@router.get("/{token}")
def get_survey_for_response(token: str, db: Session = Depends(get_db)):
    """Get survey questions for anonymous response."""
    response = db.query(Response).filter(Response.anonymous_token == token).first()
    if not response:
        raise HTTPException(status_code=404, detail="Invalid response token")

    survey = db.query(Survey).filter(Survey.id == response.survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not accepting responses")

    if response.is_complete:
        raise HTTPException(status_code=400, detail="Response already submitted")

    # Get questions ordered by order field
    questions = (
        db.query(Question)
        .filter(Question.survey_id == survey.id)
        .order_by(Question.order)
        .all()
    )

    return {
        "survey_id": survey.id,
        "survey_name": survey.name,
        "estimated_completion_minutes": survey.estimated_completion_minutes,
        "questions": [QuestionResponse.model_validate(q) for q in questions],
        "existing_answers": [
            {"question_id": a.question_id, "value": a.value} for a in response.answers
        ],
    }


@router.post("/{token}")
def submit_survey_response(token: str, submission: ResponseSubmit, db: Session = Depends(get_db)):
    """Submit a complete survey response."""
    response = db.query(Response).filter(Response.anonymous_token == token).first()
    if not response:
        raise HTTPException(status_code=404, detail="Invalid response token")

    survey = db.query(Survey).filter(Survey.id == response.survey_id).first()
    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not accepting responses")

    if response.is_complete:
        raise HTTPException(status_code=400, detail="Response already submitted")

    # Get all required question IDs
    required_questions = (
        db.query(Question.id)
        .filter(Question.survey_id == survey.id, Question.required == True)
        .all()
    )
    required_ids = {q.id for q in required_questions}

    # Validate all required questions are answered
    answered_ids = {a.question_id for a in submission.answers}
    missing = required_ids - answered_ids
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Missing required answers for questions: {list(missing)}"
        )

    # Delete any existing answers (for save-and-resume)
    db.query(Answer).filter(Answer.response_id == response.id).delete()

    # Create new answers
    for answer_data in submission.answers:
        # Normalize numeric value for Likert scales
        question = db.query(Question).filter(Question.id == answer_data.question_id).first()
        numeric_value = answer_data.numeric_value
        if numeric_value is None and question:
            numeric_value = _normalize_answer(answer_data.value, question.type)

        answer = Answer(
            response_id=response.id,
            question_id=answer_data.question_id,
            value=answer_data.value,
            numeric_value=numeric_value,
        )
        db.add(answer)

    # Mark response as complete
    response.is_complete = True
    response.submitted_at = datetime.utcnow()
    response.completion_time_seconds = int(
        (datetime.utcnow() - response.started_at).total_seconds()
    )

    db.commit()

    return {"message": "Response submitted successfully", "completion_time_seconds": response.completion_time_seconds}


@router.put("/{token}")
def save_partial_response(token: str, submission: ResponseSubmit, db: Session = Depends(get_db)):
    """Save partial response (for save-and-resume functionality)."""
    response = db.query(Response).filter(Response.anonymous_token == token).first()
    if not response:
        raise HTTPException(status_code=404, detail="Invalid response token")

    survey = db.query(Survey).filter(Survey.id == response.survey_id).first()
    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not accepting responses")

    if response.is_complete:
        raise HTTPException(status_code=400, detail="Response already submitted")

    # Update or create answers
    for answer_data in submission.answers:
        existing = (
            db.query(Answer)
            .filter(Answer.response_id == response.id, Answer.question_id == answer_data.question_id)
            .first()
        )

        question = db.query(Question).filter(Question.id == answer_data.question_id).first()
        numeric_value = answer_data.numeric_value
        if numeric_value is None and question:
            numeric_value = _normalize_answer(answer_data.value, question.type)

        if existing:
            existing.value = answer_data.value
            existing.numeric_value = numeric_value
        else:
            answer = Answer(
                response_id=response.id,
                question_id=answer_data.question_id,
                value=answer_data.value,
                numeric_value=numeric_value,
            )
            db.add(answer)

    db.commit()

    return {"message": "Progress saved", "answers_saved": len(submission.answers)}


@router.post("/{token}/start-chat")
async def start_chat_from_response(token: str, db: Session = Depends(get_db)):
    """Start a chat survey session from an existing response token.

    This allows users who received a traditional survey link to switch
    to the conversational chat mode instead.
    """
    response = db.query(Response).filter(Response.anonymous_token == token).first()
    if not response:
        raise HTTPException(status_code=404, detail="Invalid response token")

    survey = db.query(Survey).filter(Survey.id == response.survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey is not accepting responses")

    if response.is_complete:
        raise HTTPException(status_code=400, detail="Response already submitted")

    # Check if there are existing answers (user started traditional survey)
    existing_answers = db.query(Answer).filter(Answer.response_id == response.id).count()
    if existing_answers > 0:
        raise HTTPException(
            status_code=400,
            detail="You have already started the traditional survey. Please complete it or contact support to reset."
        )

    # Check if a chat session already exists for this response
    from app.models import ChatSession
    existing_chat = db.query(ChatSession).filter(
        ChatSession.response_id == response.id
    ).first()

    if existing_chat:
        # Return existing chat session
        return {
            "session": ChatSessionResponse.model_validate(existing_chat),
            "opening_message": ChatMessageResponse.model_validate(existing_chat.messages[0]) if existing_chat.messages else None,
            "chat_url": f"/chat/{existing_chat.anonymous_token}",
        }

    # Create new chat session linked to this response
    service = ChatSurveyService(db)

    try:
        # We need to create the chat session but link it to the existing response
        # Instead of creating a new response, modify the service call
        session, opening_message = await service.start_session(
            survey_id=survey.id,
            llm_provider="claude",
        )

        # Update the chat session to use the existing response
        # (The service created a new response, so we need to clean that up)
        new_response_id = session.response_id
        session.response_id = response.id

        # Delete the auto-created response
        auto_response = db.query(Response).filter(Response.id == new_response_id).first()
        if auto_response and auto_response.id != response.id:
            db.delete(auto_response)

        db.commit()

        return {
            "session": ChatSessionResponse.model_validate(session),
            "opening_message": ChatMessageResponse.model_validate(opening_message),
            "chat_url": f"/chat/{session.anonymous_token}",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _normalize_answer(value: str, question_type) -> float | None:
    """Normalize answer value to 0-100 scale."""
    from app.models.models import QuestionType

    try:
        if question_type == QuestionType.LIKERT_5:
            # 1-5 scale -> 0-100
            v = int(value)
            return ((v - 1) / 4) * 100
        elif question_type == QuestionType.LIKERT_7:
            # 1-7 scale -> 0-100
            v = int(value)
            return ((v - 1) / 6) * 100
        elif question_type == QuestionType.PERCENTAGE_SLIDER:
            # Already 0-100
            return float(value)
        else:
            return None
    except (ValueError, TypeError):
        return None
