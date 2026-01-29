"""Psychological Safety Assessment Service.

Implements Amy Edmondson's 7-item Psychological Safety scale as a dedicated
assessment separate from core friction surveys.

Reference: Edmondson, A. (1999). Psychological Safety and Learning Behavior
in Work Teams. Administrative Science Quarterly, 44(2), 350-383.

This is a validated instrument - questions should NOT be modified.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    Answer,
    FrictionType,
    MetricType,
    Question,
    QuestionType,
    Response,
    Survey,
    SurveyType,
)

settings = get_settings()


# Edmondson's 7-item Psychological Safety Scale
# Items marked with reverse=True are reverse-scored (disagreement = higher safety)
EDMONDSON_SCALE = [
    {
        "item_number": 1,
        "text": "If you make a mistake on this team, it is often held against you.",
        "reverse": True,
        "dimension": "error_tolerance",
    },
    {
        "item_number": 2,
        "text": "Members of this team are able to bring up problems and tough issues.",
        "reverse": False,
        "dimension": "openness",
    },
    {
        "item_number": 3,
        "text": "People on this team sometimes reject others for being different.",
        "reverse": True,
        "dimension": "inclusion",
    },
    {
        "item_number": 4,
        "text": "It is safe to take a risk on this team.",
        "reverse": False,
        "dimension": "risk_taking",
    },
    {
        "item_number": 5,
        "text": "It is difficult to ask other members of this team for help.",
        "reverse": True,
        "dimension": "help_seeking",
    },
    {
        "item_number": 6,
        "text": "No one on this team would deliberately act in a way that undermines my efforts.",
        "reverse": False,
        "dimension": "mutual_respect",
    },
    {
        "item_number": 7,
        "text": "Working with members of this team, my unique skills and talents are valued and utilized.",
        "reverse": False,
        "dimension": "contribution",
    },
]

# Standard 7-point Likert scale for psychological safety
LIKERT_7_OPTIONS = {
    "scale_type": "agreement",
    "low_label": "Strongly Disagree",
    "high_label": "Strongly Agree",
    "anchors": {
        1: "Strongly Disagree",
        2: "Disagree",
        3: "Somewhat Disagree",
        4: "Neither Agree nor Disagree",
        5: "Somewhat Agree",
        6: "Agree",
        7: "Strongly Agree",
    },
}

# Interpretation thresholds (based on 1-7 scale)
INTERPRETATION_THRESHOLDS = {
    "low": 4.0,  # Below 4.0 = Low psychological safety
    "moderate": 5.5,  # 4.0-5.5 = Moderate
    # Above 5.5 = High
}

# Industry benchmarks (approximated from research)
BENCHMARK_PERCENTILES = {
    3.0: 10,
    3.5: 20,
    4.0: 30,
    4.5: 40,
    5.0: 50,
    5.5: 65,
    6.0: 80,
    6.5: 95,
}


class PsychSafetyService:
    """Service for psychological safety assessments."""

    def __init__(self, db: Session):
        self.db = db
        self.min_respondents = settings.min_respondents_for_display

    def generate_assessment_questions(self, survey: Survey) -> list[Question]:
        """
        Generate Edmondson's 7-item scale questions for a survey.

        Args:
            survey: The survey to generate questions for (must be PSYCHOLOGICAL_SAFETY type)

        Returns:
            List of Question objects created for the survey
        """
        if survey.survey_type != SurveyType.PSYCHOLOGICAL_SAFETY:
            raise ValueError(
                f"Survey must be PSYCHOLOGICAL_SAFETY type, got {survey.survey_type}"
            )

        questions = []

        for item in EDMONDSON_SCALE:
            question = Question(
                survey_id=survey.id,
                dimension=FrictionType.SAFETY,  # All items map to safety dimension
                metric_mapping=[MetricType.SAFETY.value],
                text=item["text"],
                type=QuestionType.LIKERT_7,
                options={
                    **LIKERT_7_OPTIONS,
                    "item_number": item["item_number"],
                    "reverse_scored": item["reverse"],
                    "dimension": item["dimension"],
                },
                order=item["item_number"] - 1,  # 0-indexed
                required=True,
            )
            questions.append(question)
            self.db.add(question)

        self.db.commit()
        return questions

    def calculate_psych_safety_score(
        self, survey: Survey
    ) -> Optional[dict]:
        """
        Calculate psychological safety score from survey responses.

        Uses Edmondson's scoring method:
        1. Reverse-score items 1, 3, 5
        2. Average all 7 items
        3. Result is on 1-7 scale (higher = more psychologically safe)

        Args:
            survey: The psychological safety survey

        Returns:
            Dict with score, item_scores, interpretation, or None if threshold not met
        """
        if survey.survey_type != SurveyType.PSYCHOLOGICAL_SAFETY:
            raise ValueError("Survey must be PSYCHOLOGICAL_SAFETY type")

        # Get completed responses
        responses = (
            self.db.query(Response)
            .filter(Response.survey_id == survey.id, Response.is_complete == True)
            .all()
        )

        respondent_count = len(responses)
        meets_threshold = respondent_count >= self.min_respondents

        if not meets_threshold:
            return {
                "team_id": survey.team_id,
                "survey_id": survey.id,
                "calculation_date": datetime.utcnow(),
                "respondent_count": respondent_count,
                "meets_privacy_threshold": False,
                "overall_score": None,
                "item_scores": None,
                "interpretation": None,
                "benchmark_percentile": None,
            }

        # Get questions (to identify item numbers and reverse scoring)
        questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .order_by(Question.order)
            .all()
        )

        # Calculate item-level scores
        item_scores = []
        all_scores = []

        for question in questions:
            item_number = question.options.get("item_number", question.order + 1)
            is_reverse = question.options.get("reverse_scored", False)

            # Get all answers for this question
            answers = (
                self.db.query(Answer)
                .filter(
                    Answer.question_id == question.id,
                    Answer.response_id.in_([r.id for r in responses]),
                )
                .all()
            )

            if not answers:
                continue

            # Calculate average for this item
            raw_scores = [a.numeric_value for a in answers if a.numeric_value is not None]
            if not raw_scores:
                continue

            avg_raw = sum(raw_scores) / len(raw_scores)

            # Reverse score if needed (7-point scale: reversed = 8 - score)
            if is_reverse:
                avg_scored = 8 - avg_raw
            else:
                avg_scored = avg_raw

            item_scores.append({
                "item_number": item_number,
                "item_text": question.text,
                "score": round(avg_scored, 2),
                "is_reverse_scored": is_reverse,
            })
            all_scores.append(avg_scored)

        # Calculate overall score
        if not all_scores:
            overall_score = None
        else:
            overall_score = round(sum(all_scores) / len(all_scores), 2)

        # Determine interpretation
        interpretation = self._get_interpretation(overall_score)

        # Get benchmark percentile
        benchmark_percentile = self._get_benchmark_percentile(overall_score)

        return {
            "team_id": survey.team_id,
            "survey_id": survey.id,
            "calculation_date": datetime.utcnow(),
            "respondent_count": respondent_count,
            "meets_privacy_threshold": True,
            "overall_score": overall_score,
            "item_scores": item_scores,
            "interpretation": interpretation,
            "benchmark_percentile": benchmark_percentile,
        }

    def _get_interpretation(self, score: Optional[float]) -> Optional[str]:
        """Get interpretation label for a psychological safety score."""
        if score is None:
            return None

        if score < INTERPRETATION_THRESHOLDS["low"]:
            return "Low"
        elif score < INTERPRETATION_THRESHOLDS["moderate"]:
            return "Moderate"
        else:
            return "High"

    def _get_benchmark_percentile(self, score: Optional[float]) -> Optional[int]:
        """Get approximate benchmark percentile for a score."""
        if score is None:
            return None

        # Find the closest benchmark
        percentile = 5  # Default to bottom
        for threshold, pct in sorted(BENCHMARK_PERCENTILES.items()):
            if score >= threshold:
                percentile = pct
            else:
                break

        return percentile

    def get_dimension_breakdown(self, survey: Survey) -> Optional[dict]:
        """
        Get breakdown by psychological safety dimension.

        Dimensions:
        - error_tolerance: Tolerance for mistakes
        - openness: Ability to discuss problems
        - inclusion: Acceptance of differences
        - risk_taking: Safety to take risks
        - help_seeking: Comfort asking for help
        - mutual_respect: Trust in teammates
        - contribution: Feeling valued

        Returns dict mapping dimension to average score.
        """
        result = self.calculate_psych_safety_score(survey)
        if not result or not result.get("item_scores"):
            return None

        dimension_scores = {}
        for item in EDMONDSON_SCALE:
            dim = item["dimension"]
            item_num = item["item_number"]

            # Find matching item score
            for item_score in result["item_scores"]:
                if item_score["item_number"] == item_num:
                    dimension_scores[dim] = item_score["score"]
                    break

        return dimension_scores


def create_psych_safety_survey(
    db: Session,
    team_id: str,
    occupation_id: str,
    name: Optional[str] = None,
) -> Survey:
    """
    Create a new psychological safety assessment survey.

    Args:
        db: Database session
        team_id: Team to assess
        occupation_id: Occupation for the team
        name: Optional survey name

    Returns:
        Created Survey with questions generated
    """
    survey = Survey(
        team_id=team_id,
        occupation_id=occupation_id,
        name=name or "Psychological Safety Assessment",
        survey_type=SurveyType.PSYCHOLOGICAL_SAFETY,
        anonymous_mode=True,
        estimated_completion_minutes=3,  # 7 questions = ~3 minutes
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    # Generate questions
    service = PsychSafetyService(db)
    service.generate_assessment_questions(survey)

    return survey
