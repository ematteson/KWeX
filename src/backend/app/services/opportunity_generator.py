"""RICE-based opportunity generation from friction signals.

Converts friction signals from survey responses into prioritized improvement
opportunities using the RICE scoring framework:
- Reach: Number of team members affected
- Impact: Severity-based potential improvement (0.25-3.0 scale)
- Confidence: Data quality and consistency measure
- Effort: Estimated implementation effort (person-weeks)

RICE Score = (Reach × Impact × Confidence) / Effort
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models import (
    Survey,
    Team,
    Opportunity,
    MetricResult,
    Question,
    Answer,
    Response,
    FrictionType,
    OpportunityStatus,
)


# Impact scale based on severity/score levels
IMPACT_SCALE = {
    "minimal": 0.25,
    "low": 0.5,
    "medium": 1.0,
    "high": 2.0,
    "massive": 3.0,
}

# Confidence scale based on data quality
CONFIDENCE_SCALE = {
    "low": 0.5,
    "medium": 0.8,
    "high": 1.0,
}

# Default effort estimates by friction type (in person-weeks)
DEFAULT_EFFORT_BY_TYPE = {
    FrictionType.CLARITY: 2.0,  # Documentation, requirements work
    FrictionType.TOOLING: 4.0,  # Tool acquisition/configuration
    FrictionType.PROCESS: 3.0,  # Process redesign
    FrictionType.REWORK: 3.0,  # Quality improvements
    FrictionType.DELAY: 2.5,  # Bottleneck resolution
    FrictionType.SAFETY: 2.0,  # Culture/communication changes
}

# Opportunity title templates by friction type
OPPORTUNITY_TITLES = {
    FrictionType.CLARITY: "Improve requirement clarity and documentation",
    FrictionType.TOOLING: "Enhance tooling and technical infrastructure",
    FrictionType.PROCESS: "Streamline workflows and reduce process friction",
    FrictionType.REWORK: "Reduce rework through quality improvements",
    FrictionType.DELAY: "Address delays and waiting time bottlenecks",
    FrictionType.SAFETY: "Strengthen psychological safety and team culture",
}

# Opportunity description templates by friction type
OPPORTUNITY_DESCRIPTIONS = {
    FrictionType.CLARITY: (
        "Team members report challenges with unclear requirements, specifications, "
        "or documentation. Improving clarity can reduce rework and accelerate delivery."
    ),
    FrictionType.TOOLING: (
        "Survey responses indicate friction with development tools, environments, "
        "or technical infrastructure. Addressing tooling gaps can improve productivity."
    ),
    FrictionType.PROCESS: (
        "Process-related friction was identified, including unnecessary approvals, "
        "handoffs, or procedural overhead. Streamlining can reduce cycle time."
    ),
    FrictionType.REWORK: (
        "Significant rework is occurring due to defects, changing requirements, "
        "or misalignment. Addressing root causes can improve quality and efficiency."
    ),
    FrictionType.DELAY: (
        "Team members experience delays waiting for dependencies, reviews, or "
        "decisions. Reducing wait times can significantly improve flow."
    ),
    FrictionType.SAFETY: (
        "Psychological safety concerns were flagged, including hesitation to "
        "speak up or fear of failure. Improving safety enables innovation and learning."
    ),
}


class OpportunityGenerator:
    """Generates RICE-scored opportunities from survey friction signals."""

    def __init__(self, db: Session):
        self.db = db

    def generate_opportunities(
        self, survey: Survey, metric_result: Optional[MetricResult] = None
    ) -> list[Opportunity]:
        """
        Generate opportunities from survey responses.

        Analyzes friction signals from completed survey responses and generates
        prioritized improvement opportunities using RICE scoring.

        Args:
            survey: The survey to analyze
            metric_result: Optional pre-calculated metrics (will be fetched if not provided)

        Returns:
            List of generated Opportunity objects (persisted to database)
        """
        team = survey.team
        if not team:
            return []

        # Get or fetch metric result
        if not metric_result:
            metric_result = (
                self.db.query(MetricResult)
                .filter(
                    MetricResult.survey_id == survey.id,
                    MetricResult.team_id == survey.team_id,
                )
                .first()
            )

        # Analyze friction by dimension
        friction_analysis = self._analyze_friction_by_dimension(survey)

        # Generate opportunities for significant friction areas
        opportunities = []
        for dimension, analysis in friction_analysis.items():
            if analysis["score"] < 70:  # Threshold for opportunity generation
                opportunity = self._create_opportunity(
                    survey=survey,
                    team=team,
                    dimension=dimension,
                    analysis=analysis,
                    metric_result=metric_result,
                )
                if opportunity:
                    opportunities.append(opportunity)

        # Sort by RICE score (highest first)
        opportunities.sort(key=lambda x: x.rice_score, reverse=True)

        # Persist opportunities
        for opportunity in opportunities:
            self.db.add(opportunity)
        self.db.commit()

        return opportunities

    def _analyze_friction_by_dimension(
        self, survey: Survey
    ) -> dict[FrictionType, dict]:
        """
        Analyze friction signals grouped by dimension.

        Returns dict with structure:
        {
            FrictionType.CLARITY: {
                "score": 65.0,  # Average score (0-100)
                "response_count": 25,
                "low_scores": 8,  # Responses scoring 1-2 on Likert
                "variance": 1.2,
            },
            ...
        }
        """
        # Get all completed responses for this survey
        responses = (
            self.db.query(Response)
            .filter(Response.survey_id == survey.id, Response.is_complete == True)
            .all()
        )

        if not responses:
            return {}

        response_ids = [r.id for r in responses]

        # Get questions grouped by dimension
        questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .all()
        )

        # Build dimension analysis
        dimension_data: dict[FrictionType, dict] = {}

        for question in questions:
            dimension = question.dimension
            if dimension not in dimension_data:
                dimension_data[dimension] = {
                    "scores": [],
                    "response_count": 0,
                    "low_scores": 0,
                }

            # Get answers for this question
            question_answers = (
                self.db.query(Answer)
                .filter(
                    Answer.question_id == question.id,
                    Answer.response_id.in_(response_ids),
                )
                .all()
            )

            for answer in question_answers:
                if answer.numeric_value is not None:
                    # Normalize to 0-100 scale (assuming 1-5 Likert)
                    normalized_score = (answer.numeric_value - 1) * 25
                    dimension_data[dimension]["scores"].append(normalized_score)
                    dimension_data[dimension]["response_count"] += 1
                    if answer.numeric_value <= 2:
                        dimension_data[dimension]["low_scores"] += 1

        # Calculate final metrics per dimension
        result = {}
        for dimension, data in dimension_data.items():
            if data["scores"]:
                scores = data["scores"]
                avg_score = sum(scores) / len(scores)
                variance = (
                    sum((s - avg_score) ** 2 for s in scores) / len(scores)
                    if len(scores) > 1
                    else 0
                )

                result[dimension] = {
                    "score": avg_score,
                    "response_count": data["response_count"],
                    "low_scores": data["low_scores"],
                    "variance": variance,
                }

        return result

    def _create_opportunity(
        self,
        survey: Survey,
        team: Team,
        dimension: FrictionType,
        analysis: dict,
        metric_result: Optional[MetricResult],
    ) -> Optional[Opportunity]:
        """
        Create a RICE-scored opportunity from friction analysis.

        Args:
            survey: Source survey
            team: Team the opportunity is for
            dimension: Friction dimension
            analysis: Dimension analysis data
            metric_result: Overall metric result (for context)

        Returns:
            Opportunity object with calculated RICE score
        """
        # Calculate Reach: proportion of team affected by low scores
        prevalence = (
            analysis["low_scores"] / analysis["response_count"]
            if analysis["response_count"] > 0
            else 0
        )
        reach = max(1, int(team.member_count * prevalence))

        # Calculate Impact: based on how far below threshold
        score = analysis["score"]
        if score < 40:
            impact = IMPACT_SCALE["massive"]
        elif score < 50:
            impact = IMPACT_SCALE["high"]
        elif score < 60:
            impact = IMPACT_SCALE["medium"]
        elif score < 70:
            impact = IMPACT_SCALE["low"]
        else:
            impact = IMPACT_SCALE["minimal"]

        # Calculate Confidence: based on response count and variance
        response_count = analysis["response_count"]
        variance = analysis["variance"]

        if response_count >= 10 and variance < 200:
            confidence = CONFIDENCE_SCALE["high"]
        elif response_count >= 5 or variance < 400:
            confidence = CONFIDENCE_SCALE["medium"]
        else:
            confidence = CONFIDENCE_SCALE["low"]

        # Get Effort estimate
        effort = DEFAULT_EFFORT_BY_TYPE.get(dimension, 3.0)

        # Calculate RICE score
        rice_score = calculate_rice_score(reach, impact, confidence, effort)

        # Create opportunity
        opportunity = Opportunity(
            team_id=team.id,
            survey_id=survey.id,
            title=OPPORTUNITY_TITLES.get(dimension, f"Address {dimension.value} friction"),
            description=OPPORTUNITY_DESCRIPTIONS.get(
                dimension,
                f"Survey responses indicate friction in the {dimension.value} dimension.",
            ),
            friction_type=dimension,
            reach=reach,
            impact=impact,
            confidence=confidence,
            effort=effort,
            rice_score=rice_score,
            source_score=score,
            status=OpportunityStatus.IDENTIFIED,
        )

        return opportunity

    def recalculate_rice_score(self, opportunity: Opportunity) -> float:
        """
        Recalculate RICE score for an existing opportunity.

        Use when RICE factors have been manually updated.
        """
        new_score = calculate_rice_score(
            opportunity.reach,
            opportunity.impact,
            opportunity.confidence,
            opportunity.effort,
        )
        opportunity.rice_score = new_score
        opportunity.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        return new_score

    def update_opportunity_status(
        self, opportunity: Opportunity, new_status: OpportunityStatus
    ) -> Opportunity:
        """Update opportunity status with timestamp tracking."""
        old_status = opportunity.status
        opportunity.status = new_status
        opportunity.updated_at = datetime.now(timezone.utc)

        # Track completion
        if new_status in (OpportunityStatus.COMPLETED, OpportunityStatus.DEFERRED):
            opportunity.completed_at = datetime.now(timezone.utc)

        self.db.commit()
        return opportunity


def calculate_rice_score(
    reach: int, impact: float, confidence: float, effort: float
) -> float:
    """
    Calculate RICE score.

    Formula: (Reach × Impact × Confidence) / Effort

    Args:
        reach: Number of people affected (integer)
        impact: Impact multiplier (0.25-3.0)
        confidence: Confidence percentage (0.5-1.0)
        effort: Effort in person-weeks

    Returns:
        RICE score (higher = higher priority)
    """
    if effort <= 0:
        return 0.0

    return (reach * impact * confidence) / effort


def generate_opportunities_for_survey(
    db: Session, survey: Survey
) -> list[Opportunity]:
    """
    Convenience function to generate opportunities for a survey.

    Args:
        db: Database session
        survey: Survey to analyze

    Returns:
        List of generated opportunities sorted by RICE score
    """
    generator = OpportunityGenerator(db)
    return generator.generate_opportunities(survey)
