"""Chat survey API endpoints for AI-powered conversational surveys."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import ChatSession, ChatSessionStatus, FrictionType
from app.schemas.schemas import (
    ChatCompleteResponse,
    ChatConversationResponse,
    ChatExtractedRatingResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatMessageSendResponse,
    ChatRatingConfirmResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSummaryResponse,
    ChatTranscriptResponse,
    RatingConfirmation,
    StartChatSurveyResponse,
)
from app.services.chat_survey_service import ChatSurveyService, get_session_by_token

router = APIRouter(prefix="/chat-surveys", tags=["chat-surveys"])


@router.post("", response_model=StartChatSurveyResponse, status_code=201)
async def start_chat_survey(
    request: ChatSessionCreate,
    db: Session = Depends(get_db),
):
    """Start a new AI-powered chat survey session.

    Creates a new chat session for the specified survey and generates
    an opening message from the AI interviewer.
    """
    service = ChatSurveyService(db)

    try:
        session, opening_message = await service.start_session(
            survey_id=request.survey_id,
            llm_provider=request.llm_provider,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Build chat URL
    chat_url = f"/chat/{session.anonymous_token}"

    return StartChatSurveyResponse(
        session=ChatSessionResponse.model_validate(session),
        opening_message=ChatMessageResponse.model_validate(opening_message),
        chat_url=chat_url,
    )


@router.get("/{token}", response_model=ChatConversationResponse)
def get_chat_session(
    token: str,
    db: Session = Depends(get_db),
):
    """Get a chat session with all messages by anonymous token.

    Returns the session info, all messages, and any extracted ratings.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return ChatConversationResponse(
        session=ChatSessionResponse.model_validate(session),
        messages=[ChatMessageResponse.model_validate(m) for m in session.messages],
        extracted_ratings=[
            ChatExtractedRatingResponse.model_validate(r)
            for r in session.extracted_ratings
        ],
    )


@router.post("/{token}/message", response_model=ChatMessageSendResponse)
async def send_chat_message(
    token: str,
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    """Send a user message and receive an AI response.

    Processes the user's message through the AI interviewer and returns
    both the stored user message and the AI's response.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.status in [ChatSessionStatus.COMPLETED, ChatSessionStatus.ABANDONED]:
        raise HTTPException(
            status_code=400,
            detail=f"Chat session is {session.status.value}",
        )

    service = ChatSurveyService(db)

    try:
        result = await service.process_user_message(
            session_id=session.id,
            user_content=message.content,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ChatMessageSendResponse(
        user_message=ChatMessageResponse.model_validate(result["user_message"]),
        assistant_message=ChatMessageResponse.model_validate(result["assistant_message"]),
        session_status=result["session_status"],
        current_dimension=result["current_dimension"],
        dimensions_covered=result["dimensions_covered"],
        pending_rating_confirmation=result["pending_rating_confirmation"],
    )


@router.post("/{token}/confirm-rating", response_model=ChatRatingConfirmResponse)
async def confirm_rating(
    token: str,
    confirmation: RatingConfirmation,
    db: Session = Depends(get_db),
):
    """Confirm or adjust an AI-inferred rating.

    After the AI extracts ratings from the conversation, this endpoint
    allows users to confirm or adjust each rating.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.status != ChatSessionStatus.RATING_CONFIRMATION:
        raise HTTPException(
            status_code=400,
            detail=f"Session is not in rating confirmation phase (status: {session.status.value})",
        )

    service = ChatSurveyService(db)

    try:
        result = await service.confirm_rating(
            session_id=session.id,
            dimension=confirmation.dimension,
            confirmed=confirmation.confirmed,
            adjusted_score=confirmation.adjusted_score,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ChatRatingConfirmResponse(
        rating=ChatExtractedRatingResponse.model_validate(result["rating"]),
        next_dimension=result["next_dimension"],
        all_confirmed=result["all_confirmed"],
        assistant_message=(
            ChatMessageResponse.model_validate(result["assistant_message"])
            if result["assistant_message"]
            else None
        ),
    )


@router.post("/{token}/complete", response_model=ChatCompleteResponse)
async def complete_chat_session(
    token: str,
    db: Session = Depends(get_db),
):
    """Complete the chat session and generate metrics.

    Finalizes the chat session, generates a summary, and triggers
    metric calculation. All ratings must be confirmed before calling.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.status == ChatSessionStatus.COMPLETED:
        # Return existing completion data
        return ChatCompleteResponse(
            session=ChatSessionResponse.model_validate(session),
            summary=ChatSummaryResponse.model_validate(session.summary),
            extracted_ratings=[
                ChatExtractedRatingResponse.model_validate(r)
                for r in session.extracted_ratings
            ],
            metrics_calculated=True,
            metric_result_id=None,
        )

    service = ChatSurveyService(db)

    try:
        result = await service.complete_session(session_id=session.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ChatCompleteResponse(
        session=ChatSessionResponse.model_validate(result["session"]),
        summary=ChatSummaryResponse.model_validate(result["summary"]),
        extracted_ratings=[
            ChatExtractedRatingResponse.model_validate(r)
            for r in result["extracted_ratings"]
        ],
        metrics_calculated=result["metrics_calculated"],
        metric_result_id=result["metric_result_id"],
    )


@router.get("/{token}/transcript", response_model=ChatTranscriptResponse)
def get_chat_transcript(
    token: str,
    db: Session = Depends(get_db),
):
    """Get the full transcript of a chat session.

    Returns all messages, ratings, and summary (if completed) for
    record-keeping or review purposes.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return ChatTranscriptResponse(
        session=ChatSessionResponse.model_validate(session),
        messages=[ChatMessageResponse.model_validate(m) for m in session.messages],
        extracted_ratings=[
            ChatExtractedRatingResponse.model_validate(r)
            for r in session.extracted_ratings
        ],
        summary=(
            ChatSummaryResponse.model_validate(session.summary)
            if session.summary
            else None
        ),
    )


@router.post("/{token}/abandon")
def abandon_chat_session(
    token: str,
    db: Session = Depends(get_db),
):
    """Mark a chat session as abandoned.

    Used when a user exits without completing the survey.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if session.status == ChatSessionStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Cannot abandon a completed session",
        )

    session.status = ChatSessionStatus.ABANDONED
    db.commit()

    return {"message": "Session marked as abandoned", "session_id": session.id}


@router.get("/{token}/status")
def get_session_status(
    token: str,
    db: Session = Depends(get_db),
):
    """Get the current status of a chat session.

    Lightweight endpoint for polling session state.
    """
    session = get_session_by_token(db, token)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Count unconfirmed ratings
    unconfirmed_count = sum(
        1 for r in session.extracted_ratings if not r.user_confirmed
    )

    return {
        "session_id": session.id,
        "status": session.status.value,
        "current_dimension": session.current_dimension.value if session.current_dimension else None,
        "dimensions_covered": session.dimensions_covered,
        "message_count": len(session.messages),
        "ratings_count": len(session.extracted_ratings),
        "unconfirmed_ratings": unconfirmed_count,
        "total_tokens": session.total_tokens_input + session.total_tokens_output,
    }
