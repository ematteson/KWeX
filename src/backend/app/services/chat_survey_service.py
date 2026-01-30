"""Service for AI-powered chat survey conversations.

This service manages chat survey sessions, including:
- Starting conversations with an AI interviewer
- Processing user messages and generating responses
- Extracting friction ratings from conversations
- Confirming ratings with users
- Generating summaries and calculating metrics
"""

import time
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    Answer,
    ChatExtractedRating,
    ChatMessage,
    ChatMessageRole,
    ChatSession,
    ChatSessionStatus,
    ChatSummary,
    FrictionType,
    MetricType,
    Occupation,
    Question,
    QuestionType,
    Response,
    Survey,
    SurveyStatus,
    SurveyType,
)
from app.services.chat_prompts import (
    CHAT_PROMPT_VERSION,
    DIMENSION_DESCRIPTIONS,
    EXTRACTION_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    format_conversation_for_context,
    get_opening_prompt,
    get_rating_confirmation_prompt,
    get_rating_extraction_prompt,
    get_response_prompt,
    get_summary_generation_prompt,
    get_wrap_up_prompt,
)
from app.services.llm import LLMError, LLMMessage, get_llm_client
from app.services.metrics_calculator import MetricsCalculator


class ChatSurveyService:
    """Service for managing AI-powered chat survey sessions."""

    FRICTION_DIMENSIONS = list(FrictionType)

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    async def start_session(
        self,
        survey_id: str,
        llm_provider: str = "claude",
    ) -> tuple[ChatSession, ChatMessage]:
        """Start a new chat survey session.

        Args:
            survey_id: The survey to create a session for
            llm_provider: LLM provider to use ("claude" or "gpt")

        Returns:
            Tuple of (ChatSession, opening ChatMessage)

        Raises:
            ValueError: If survey not found or invalid
        """
        # Validate survey
        survey = self.db.query(Survey).filter(Survey.id == survey_id).first()
        if not survey:
            raise ValueError(f"Survey not found: {survey_id}")

        if survey.status != SurveyStatus.ACTIVE:
            raise ValueError("Survey is not active")

        # Get occupation for context
        occupation = self.db.query(Occupation).filter(
            Occupation.id == survey.occupation_id
        ).first()
        occupation_name = occupation.name if occupation else "knowledge worker"

        # Create Response record (links to standard survey response system)
        response = Response(
            survey_id=survey_id,
            is_complete=False,
        )
        self.db.add(response)
        self.db.flush()

        # Initialize dimensions_covered dict
        dimensions_covered = {dim.value: False for dim in FrictionType}

        # Create chat session
        session = ChatSession(
            survey_id=survey_id,
            response_id=response.id,
            status=ChatSessionStatus.STARTED,
            current_dimension=None,
            dimensions_covered=dimensions_covered,
            llm_provider=llm_provider,
        )
        self.db.add(session)
        self.db.flush()

        # Generate opening message
        opening_message = await self._generate_opening_message(
            session, occupation_name
        )

        self.db.commit()

        return session, opening_message

    async def process_user_message(
        self,
        session_id: str,
        user_content: str,
    ) -> dict:
        """Process a user message and generate AI response.

        Args:
            session_id: The chat session ID
            user_content: The user's message content

        Returns:
            Dict with user_message, assistant_message, session status, etc.

        Raises:
            ValueError: If session not found or in invalid state
        """
        session = self.db.query(ChatSession).filter(
            ChatSession.id == session_id
        ).first()
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        if session.status in [ChatSessionStatus.COMPLETED, ChatSessionStatus.ABANDONED]:
            raise ValueError(f"Session is {session.status.value}, cannot send messages")

        # Update session status
        if session.status == ChatSessionStatus.STARTED:
            session.status = ChatSessionStatus.IN_PROGRESS

        # Get current message count for sequence
        message_count = len(session.messages)

        # Store user message
        user_message = ChatMessage(
            session_id=session_id,
            role=ChatMessageRole.USER,
            content=user_content,
            dimension_context=session.current_dimension,
            sequence=message_count,
        )
        self.db.add(user_message)
        self.db.flush()

        # Generate AI response
        response_data = await self._generate_response(session, user_content)

        # Store assistant message
        assistant_message = ChatMessage(
            session_id=session_id,
            role=ChatMessageRole.ASSISTANT,
            content=response_data["content"],
            dimension_context=response_data.get("dimension"),
            is_rating_confirmation=response_data.get("is_rating_confirmation", False),
            sequence=message_count + 1,
            tokens_input=response_data.get("tokens_input"),
            tokens_output=response_data.get("tokens_output"),
            latency_ms=response_data.get("latency_ms"),
        )
        self.db.add(assistant_message)

        # Update token counts
        if response_data.get("tokens_input"):
            session.total_tokens_input += response_data["tokens_input"]
        if response_data.get("tokens_output"):
            session.total_tokens_output += response_data["tokens_output"]

        # Update dimension tracking
        if response_data.get("dimension"):
            session.current_dimension = response_data["dimension"]
            if response_data.get("dimension_covered"):
                dims = session.dimensions_covered.copy()
                dims[response_data["dimension"].value] = True
                session.dimensions_covered = dims

        # Check if we should move to rating confirmation
        pending_confirmation = None
        all_covered = all(session.dimensions_covered.values())
        if all_covered and session.status == ChatSessionStatus.IN_PROGRESS:
            # Extract ratings and start confirmation
            await self._start_rating_confirmation(session)
            pending_confirmation = await self._get_next_unconfirmed_rating(session)

        self.db.commit()

        return {
            "user_message": user_message,
            "assistant_message": assistant_message,
            "session_status": session.status,
            "current_dimension": session.current_dimension,
            "dimensions_covered": session.dimensions_covered,
            "pending_rating_confirmation": pending_confirmation,
        }

    async def confirm_rating(
        self,
        session_id: str,
        dimension: FrictionType,
        confirmed: bool,
        adjusted_score: Optional[float] = None,
    ) -> dict:
        """Confirm or adjust an AI-inferred rating.

        Args:
            session_id: The chat session ID
            dimension: The dimension being confirmed
            confirmed: Whether the user confirms the AI rating
            adjusted_score: User's adjusted score if not confirmed

        Returns:
            Dict with rating, next_dimension, all_confirmed flag

        Raises:
            ValueError: If session or rating not found
        """
        session = self.db.query(ChatSession).filter(
            ChatSession.id == session_id
        ).first()
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        rating = self.db.query(ChatExtractedRating).filter(
            ChatExtractedRating.session_id == session_id,
            ChatExtractedRating.dimension == dimension,
        ).first()
        if not rating:
            raise ValueError(f"Rating not found for dimension: {dimension.value}")

        # Update rating
        rating.user_confirmed = True
        if not confirmed and adjusted_score is not None:
            rating.user_adjusted_score = adjusted_score
            rating.final_score = self._normalize_score(adjusted_score)
        else:
            rating.final_score = self._normalize_score(rating.ai_inferred_score)

        # Check for next unconfirmed rating
        next_rating = await self._get_next_unconfirmed_rating(session)
        all_confirmed = next_rating is None

        # Generate confirmation acknowledgment message
        assistant_message = None
        if not all_confirmed:
            # Generate message for next rating
            message_content = await self._generate_rating_confirmation_message(
                session,
                next_rating["dimension"],
                next_rating["score"],
                next_rating["reasoning"],
            )
            message_count = len(session.messages)
            assistant_message = ChatMessage(
                session_id=session_id,
                role=ChatMessageRole.ASSISTANT,
                content=message_content,
                dimension_context=FrictionType(next_rating["dimension"]),
                is_rating_confirmation=True,
                sequence=message_count,
            )
            self.db.add(assistant_message)

        self.db.commit()

        return {
            "rating": rating,
            "next_dimension": FrictionType(next_rating["dimension"]) if next_rating else None,
            "all_confirmed": all_confirmed,
            "assistant_message": assistant_message,
        }

    async def complete_session(self, session_id: str) -> dict:
        """Complete a chat session and generate metrics.

        Args:
            session_id: The chat session ID

        Returns:
            Dict with session, summary, ratings, metrics info

        Raises:
            ValueError: If session not found or not ready to complete
        """
        session = self.db.query(ChatSession).filter(
            ChatSession.id == session_id
        ).first()
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        # Verify all ratings are confirmed
        unconfirmed = self.db.query(ChatExtractedRating).filter(
            ChatExtractedRating.session_id == session_id,
            ChatExtractedRating.user_confirmed == False,
        ).count()

        if unconfirmed > 0:
            raise ValueError(f"{unconfirmed} ratings still need confirmation")

        # Generate summary
        summary = await self._generate_summary(session)

        # Create answers from ratings for MetricsCalculator
        self._create_answers_from_ratings(session)

        # Mark response as complete
        response = session.response
        response.is_complete = True
        response.submitted_at = datetime.utcnow()
        response.completion_time_seconds = int(
            (datetime.utcnow() - session.started_at).total_seconds()
        )

        # Update session status
        session.status = ChatSessionStatus.COMPLETED
        session.completed_at = datetime.utcnow()

        # Calculate metrics
        metrics_calculated = False
        metric_result_id = None
        try:
            survey = session.survey
            calculator = MetricsCalculator(self.db)
            metric_result = calculator.calculate_metrics(survey)
            if metric_result:
                metrics_calculated = True
                metric_result_id = metric_result.id
        except Exception:
            pass  # Metrics calculation failure shouldn't block completion

        self.db.commit()

        return {
            "session": session,
            "summary": summary,
            "extracted_ratings": session.extracted_ratings,
            "metrics_calculated": metrics_calculated,
            "metric_result_id": metric_result_id,
        }

    async def _generate_opening_message(
        self,
        session: ChatSession,
        occupation_name: str,
    ) -> ChatMessage:
        """Generate the opening message for a chat session."""
        llm_client = get_llm_client(model_type=session.llm_provider)
        start_time = time.time()

        prompt = get_opening_prompt(occupation_name)

        try:
            response = await llm_client.generate(
                prompt=prompt,
                system_prompt=SYSTEM_PROMPT,
                temperature=0.7,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            message = ChatMessage(
                session_id=session.id,
                role=ChatMessageRole.ASSISTANT,
                content=response.content,
                dimension_context=None,
                sequence=0,
                tokens_input=response.tokens_input,
                tokens_output=response.tokens_output,
                latency_ms=latency_ms,
            )
            self.db.add(message)

            # Update session tokens
            if response.tokens_input:
                session.total_tokens_input += response.tokens_input
            if response.tokens_output:
                session.total_tokens_output += response.tokens_output

            return message

        except LLMError as e:
            # Fallback to a static opening message
            message = ChatMessage(
                session_id=session.id,
                role=ChatMessageRole.ASSISTANT,
                content=(
                    f"Hi! Thanks for taking the time to chat with me today. "
                    f"I'm here to learn about your work experience as a {occupation_name} - "
                    f"what's working well and what could be better. This usually takes about "
                    f"10-15 minutes, and your responses are completely anonymous. "
                    f"To start, can you tell me a bit about your typical work day or any "
                    f"recent challenges you've faced?"
                ),
                dimension_context=None,
                sequence=0,
            )
            self.db.add(message)
            return message

    async def _generate_response(
        self,
        session: ChatSession,
        user_content: str,
    ) -> dict:
        """Generate an AI response based on conversation context."""
        llm_client = get_llm_client(model_type=session.llm_provider)
        start_time = time.time()

        # Build conversation context
        messages = session.messages
        context = format_conversation_for_context(messages)
        context += f"\nParticipant: {user_content}"

        # Determine which dimensions are covered
        covered = [
            FrictionType(k) for k, v in session.dimensions_covered.items() if v
        ]

        prompt = get_response_prompt(context, covered)

        try:
            # Build chat messages for better context
            chat_messages = [LLMMessage(role="system", content=SYSTEM_PROMPT)]
            for msg in messages[-10:]:  # Last 10 messages for context
                role = "assistant" if msg.role == ChatMessageRole.ASSISTANT else "user"
                chat_messages.append(LLMMessage(role=role, content=msg.content))
            chat_messages.append(LLMMessage(role="user", content=user_content))

            response = await llm_client.generate_chat(
                messages=chat_messages,
                temperature=0.7,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Analyze response to determine dimension context
            dimension = self._detect_dimension_from_content(response.content, user_content)
            dimension_covered = dimension is not None and dimension not in covered

            return {
                "content": response.content,
                "dimension": dimension,
                "dimension_covered": dimension_covered,
                "tokens_input": response.tokens_input,
                "tokens_output": response.tokens_output,
                "latency_ms": latency_ms,
            }

        except LLMError:
            # Fallback response
            return {
                "content": (
                    "Thank you for sharing that. Can you tell me more about "
                    "the challenges you face in your day-to-day work?"
                ),
                "dimension": None,
                "dimension_covered": False,
            }

    async def _start_rating_confirmation(self, session: ChatSession) -> None:
        """Start the rating confirmation phase."""
        session.status = ChatSessionStatus.RATING_CONFIRMATION

        # Extract all ratings from conversation
        ratings = await self._extract_all_ratings(session)

        # Store extracted ratings
        for rating_data in ratings:
            try:
                dimension = FrictionType(rating_data["dimension"])
            except ValueError:
                continue

            rating = ChatExtractedRating(
                session_id=session.id,
                dimension=dimension,
                ai_inferred_score=rating_data["score"],
                ai_confidence=rating_data.get("confidence", 0.8),
                ai_reasoning=rating_data.get("reasoning"),
                user_confirmed=False,
                final_score=self._normalize_score(rating_data["score"]),
                key_quotes=rating_data.get("key_quotes"),
                summary_comment=rating_data.get("summary_comment"),
            )
            self.db.add(rating)

        # Generate wrap-up message
        context = format_conversation_for_context(session.messages)
        wrap_up_content = await self._generate_wrap_up_message(session, context)

        message_count = len(session.messages)
        wrap_up_message = ChatMessage(
            session_id=session.id,
            role=ChatMessageRole.ASSISTANT,
            content=wrap_up_content,
            sequence=message_count,
        )
        self.db.add(wrap_up_message)

    async def _extract_all_ratings(self, session: ChatSession) -> list[dict]:
        """Extract ratings from the conversation using LLM."""
        llm_client = get_llm_client(model_type=session.llm_provider)

        # Build full conversation transcript
        conversation = format_conversation_for_context(session.messages, max_messages=100)
        prompt = get_rating_extraction_prompt(conversation)

        try:
            response = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
                temperature=0.3,  # Lower temperature for more consistent extraction
            )

            ratings = response.get("ratings", [])

            # Ensure all dimensions have ratings
            existing_dims = {r["dimension"] for r in ratings}
            for dim in FrictionType:
                if dim.value not in existing_dims:
                    ratings.append({
                        "dimension": dim.value,
                        "score": 3.0,  # Neutral default
                        "confidence": 0.3,
                        "reasoning": "Dimension not adequately discussed in conversation.",
                        "key_quotes": [],
                    })

            return ratings

        except LLMError:
            # Fallback: create neutral ratings for all dimensions
            return [
                {
                    "dimension": dim.value,
                    "score": 3.0,
                    "confidence": 0.3,
                    "reasoning": "Unable to extract rating from conversation.",
                    "key_quotes": [],
                }
                for dim in FrictionType
            ]

    async def _get_next_unconfirmed_rating(
        self,
        session: ChatSession,
    ) -> Optional[dict]:
        """Get the next rating that needs user confirmation."""
        unconfirmed = self.db.query(ChatExtractedRating).filter(
            ChatExtractedRating.session_id == session.id,
            ChatExtractedRating.user_confirmed == False,
        ).order_by(ChatExtractedRating.created_at).first()

        if not unconfirmed:
            return None

        return {
            "dimension": unconfirmed.dimension.value,
            "score": unconfirmed.ai_inferred_score,
            "confidence": unconfirmed.ai_confidence,
            "reasoning": unconfirmed.ai_reasoning,
        }

    async def _generate_rating_confirmation_message(
        self,
        session: ChatSession,
        dimension: str,
        score: float,
        reasoning: Optional[str],
    ) -> str:
        """Generate a message to confirm a rating with the user."""
        llm_client = get_llm_client(model_type=session.llm_provider)

        dim = FrictionType(dimension)
        prompt = get_rating_confirmation_prompt(dim, score, reasoning or "")

        try:
            response = await llm_client.generate(
                prompt=prompt,
                system_prompt=SYSTEM_PROMPT,
                temperature=0.5,
            )
            return response.content

        except LLMError:
            dim_info = DIMENSION_DESCRIPTIONS[dim]
            score_int = round(score)
            return (
                f"Based on what you shared about {dim_info['name'].lower()}, "
                f"I'd estimate around {score_int} out of 5. Does that feel right, "
                f"or would you rate it differently?"
            )

    async def _generate_wrap_up_message(
        self,
        session: ChatSession,
        context: str,
    ) -> str:
        """Generate a wrap-up message before rating confirmation."""
        llm_client = get_llm_client(model_type=session.llm_provider)

        prompt = get_wrap_up_prompt(context)

        try:
            response = await llm_client.generate(
                prompt=prompt,
                system_prompt=SYSTEM_PROMPT,
                temperature=0.6,
            )
            return response.content

        except LLMError:
            return (
                "Thank you so much for sharing all of that with me! "
                "I really appreciate your openness. Before we wrap up, "
                "I'd like to quickly confirm a few ratings to make sure "
                "I understood your experience correctly."
            )

    async def _generate_summary(self, session: ChatSession) -> ChatSummary:
        """Generate a summary of the chat session."""
        llm_client = get_llm_client(model_type=session.llm_provider)

        conversation = format_conversation_for_context(session.messages, max_messages=100)
        ratings = [
            {
                "dimension": r.dimension.value,
                "score": r.final_score / 25,  # Convert back to 1-5 scale
                "confidence": r.ai_confidence,
            }
            for r in session.extracted_ratings
        ]

        prompt = get_summary_generation_prompt(conversation, ratings)

        try:
            response = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
                temperature=0.4,
            )

            summary = ChatSummary(
                session_id=session.id,
                executive_summary=response.get(
                    "executive_summary",
                    "Summary could not be generated.",
                ),
                key_pain_points=response.get("key_pain_points", []),
                positive_aspects=response.get("positive_aspects", []),
                improvement_suggestions=response.get("improvement_suggestions", []),
                overall_sentiment=response.get("overall_sentiment", "neutral"),
                dimension_sentiments=response.get("dimension_sentiments", {}),
            )
            self.db.add(summary)
            return summary

        except LLMError:
            summary = ChatSummary(
                session_id=session.id,
                executive_summary="Summary generation failed.",
                key_pain_points=[],
                positive_aspects=[],
                improvement_suggestions=[],
                overall_sentiment="neutral",
                dimension_sentiments={},
            )
            self.db.add(summary)
            return summary

    def _create_answers_from_ratings(self, session: ChatSession) -> None:
        """Create Answer records from chat ratings for MetricsCalculator compatibility."""
        survey = session.survey
        response = session.response

        # Create synthetic questions and answers for each dimension
        for rating in session.extracted_ratings:
            # Determine metric mapping based on dimension
            metric_mapping = self._get_metric_mapping(rating.dimension)

            # Create a synthetic question for this dimension
            question = Question(
                survey_id=survey.id,
                dimension=rating.dimension,
                metric_mapping=metric_mapping,
                text=f"Chat-derived {rating.dimension.value} score",
                type=QuestionType.LIKERT_5,
                order=list(FrictionType).index(rating.dimension),
                required=True,
            )
            self.db.add(question)
            self.db.flush()

            # Create answer with normalized score (0-100) and AI-generated comment
            answer = Answer(
                response_id=response.id,
                question_id=question.id,
                value=str(rating.final_score / 25),  # Convert to 1-5 scale for value
                numeric_value=rating.final_score,  # Store normalized 0-100
                comment=rating.summary_comment,  # AI-extracted comment from conversation
            )
            self.db.add(answer)

    def _get_metric_mapping(self, dimension: FrictionType) -> list[str]:
        """Get metric mapping for a friction dimension."""
        mappings = {
            FrictionType.CLARITY: [MetricType.FLOW.value, MetricType.FRICTION.value],
            FrictionType.TOOLING: [MetricType.FRICTION.value],
            FrictionType.PROCESS: [MetricType.FRICTION.value, MetricType.PORTFOLIO_BALANCE.value],
            FrictionType.REWORK: [MetricType.FRICTION.value, MetricType.SAFETY.value],
            FrictionType.DELAY: [MetricType.FRICTION.value, MetricType.FLOW.value],
            FrictionType.SAFETY: [MetricType.SAFETY.value],
        }
        return mappings.get(dimension, [MetricType.FRICTION.value])

    def _normalize_score(self, score: float) -> float:
        """Normalize a 1-5 score to 0-100 scale."""
        return ((score - 1) / 4) * 100

    def _detect_dimension_from_content(
        self,
        assistant_content: str,
        user_content: str,
    ) -> Optional[FrictionType]:
        """Detect which dimension is being discussed based on content."""
        combined = (assistant_content + " " + user_content).lower()

        # Simple keyword detection
        dimension_keywords = {
            FrictionType.CLARITY: ["requirements", "unclear", "objectives", "expectations", "understand", "definition"],
            FrictionType.TOOLING: ["tools", "software", "systems", "technology", "equipment", "applications"],
            FrictionType.PROCESS: ["process", "workflow", "procedure", "steps", "bureaucracy", "approval"],
            FrictionType.REWORK: ["redo", "rework", "revision", "change", "mistake", "error", "fix"],
            FrictionType.DELAY: ["wait", "delay", "block", "stuck", "pending", "queue", "slow"],
            FrictionType.SAFETY: ["comfortable", "safe", "fear", "concern", "speak up", "admit", "help"],
        }

        for dimension, keywords in dimension_keywords.items():
            if any(keyword in combined for keyword in keywords):
                return dimension

        return None


def get_session_by_token(db: Session, token: str) -> Optional[ChatSession]:
    """Get a chat session by its anonymous token.

    Args:
        db: Database session
        token: Anonymous session token

    Returns:
        ChatSession if found, None otherwise
    """
    return db.query(ChatSession).filter(
        ChatSession.anonymous_token == token
    ).first()
