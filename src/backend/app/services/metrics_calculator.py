"""Core 4 Metrics calculation service.

This service calculates the KWeX Core 4 metrics from survey responses:
1. Flow (Throughput) - Value-adding work completion
2. Friction (Workflow Effectiveness) - Workflow inefficiency signals (lower is better)
3. Safety (Risk/Quality Impact) - Frequency of negative outcomes
4. Portfolio Balance (Run vs. Change) - Work allocation health

All metrics are on a 0-100 scale.
"""

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    Answer,
    FrictionType,
    MetricResult,
    MetricType,
    Occupation,
    Question,
    QuestionType,
    Response,
    Survey,
    Team,
    TrendDirection,
)

settings = get_settings()


@dataclass
class MetricBreakdown:
    """Breakdown of a metric's component scores."""
    pass


@dataclass
class FlowBreakdown(MetricBreakdown):
    throughput: float
    value_delivery: float
    unblocked_time: float


@dataclass
class FrictionBreakdown(MetricBreakdown):
    dependency_wait: float
    approval_latency: float
    rework_from_unclear: float
    tooling_pain: float
    process_confusion: float


@dataclass
class SafetyBreakdown(MetricBreakdown):
    rework_events: float
    quality_escapes: float
    decision_reversals: float
    psychological_safety: float


@dataclass
class PortfolioBreakdown(MetricBreakdown):
    # New value-based model
    value_adding_pct: float  # Direct value creation
    value_enabling_pct: float  # Necessary support work
    waste_pct: float  # Non-value work (friction manifestation)
    health_score: float  # 0-100 health indicator
    # Legacy fields
    run_percentage: float
    change_percentage: float
    deviation_from_ideal: float


class MetricsCalculator:
    """Calculates Core 4 metrics from survey responses."""

    def __init__(self, db: Session):
        self.db = db
        self.min_respondents = settings.min_respondents_for_display

    def calculate_metrics(self, survey: Survey) -> Optional[MetricResult]:
        """
        Calculate all Core 4 metrics for a survey.

        Args:
            survey: The survey to calculate metrics for

        Returns:
            MetricResult if privacy threshold is met, None otherwise
        """
        # Get completed responses
        responses = (
            self.db.query(Response)
            .filter(Response.survey_id == survey.id, Response.is_complete == True)
            .all()
        )

        respondent_count = len(responses)
        meets_threshold = respondent_count >= self.min_respondents

        # Get occupation for portfolio balance ideal ratios
        occupation = survey.occupation
        team = survey.team

        # Calculate each metric
        flow_score, flow_breakdown = self._calculate_flow(survey, responses)
        friction_score, friction_breakdown = self._calculate_friction(survey, responses)
        safety_score, safety_breakdown = self._calculate_safety(survey, responses)
        portfolio_score, portfolio_breakdown = self._calculate_portfolio_balance(
            survey, responses, occupation
        )

        # Get previous result for trend calculation
        previous_result = self._get_previous_result(team.id, survey.id)
        trend = self._calculate_trend(
            flow_score, friction_score, safety_score, portfolio_score, previous_result
        )

        # Create and save metric result
        metric_result = MetricResult(
            team_id=team.id,
            survey_id=survey.id,
            respondent_count=respondent_count,
            meets_privacy_threshold=meets_threshold,
            flow_score=flow_score if meets_threshold else None,
            friction_score=friction_score if meets_threshold else None,
            safety_score=safety_score if meets_threshold else None,
            portfolio_balance_score=portfolio_score if meets_threshold else None,
            flow_breakdown=self._breakdown_to_dict(flow_breakdown) if meets_threshold else None,
            friction_breakdown=self._breakdown_to_dict(friction_breakdown) if meets_threshold else None,
            safety_breakdown=self._breakdown_to_dict(safety_breakdown) if meets_threshold else None,
            portfolio_breakdown=self._breakdown_to_dict(portfolio_breakdown) if meets_threshold else None,
            previous_result_id=previous_result.id if previous_result else None,
            trend_direction=trend,
        )

        self.db.add(metric_result)
        self.db.commit()
        self.db.refresh(metric_result)

        return metric_result

    def _calculate_flow(
        self, survey: Survey, responses: list[Response]
    ) -> tuple[float, FlowBreakdown]:
        """
        Calculate Flow score from survey responses.

        Flow measures value-adding work completion:
        - Throughput: Self-reported task completion rate
        - Value Delivery: Frequency of delivering completed work
        - Unblocked Time: Percentage of time working without blockers
        """
        if not responses:
            return 0.0, FlowBreakdown(0, 0, 0)

        # Get questions mapped to FLOW metric
        flow_questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .all()
        )
        flow_questions = [q for q in flow_questions if MetricType.FLOW.value in (q.metric_mapping or [])]

        # Categorize flow questions by dimension for breakdown
        throughput_scores = []
        delivery_scores = []
        unblocked_scores = []

        for response in responses:
            for question in flow_questions:
                answer = self._get_answer(response.id, question.id)
                if answer and answer.numeric_value is not None:
                    # Categorize based on question text patterns
                    text_lower = question.text.lower()
                    if "complete" in text_lower or "planned work" in text_lower:
                        throughput_scores.append(answer.numeric_value)
                    elif "deliver" in text_lower or "value" in text_lower:
                        delivery_scores.append(answer.numeric_value)
                    elif "blocker" in text_lower or "unblocked" in text_lower or "without" in text_lower:
                        unblocked_scores.append(answer.numeric_value)
                    else:
                        # Default to throughput
                        throughput_scores.append(answer.numeric_value)

        # Calculate component averages
        throughput = self._safe_average(throughput_scores) if throughput_scores else 50.0
        value_delivery = self._safe_average(delivery_scores) if delivery_scores else 50.0
        unblocked_time = self._safe_average(unblocked_scores) if unblocked_scores else 50.0

        # Weighted average per spec
        flow_score = (
            throughput * 0.4 +
            value_delivery * 0.35 +
            unblocked_time * 0.25
        )

        return flow_score, FlowBreakdown(throughput, value_delivery, unblocked_time)

    def _calculate_friction(
        self, survey: Survey, responses: list[Response]
    ) -> tuple[float, FrictionBreakdown]:
        """
        Calculate Friction score from survey responses.

        Friction measures workflow inefficiency (lower is better):
        - Dependency Wait: Time waiting on others
        - Approval Latency: Time in approval queues
        - Rework from Unclear: Work redone due to unclear requirements
        - Tooling Pain: Frequency of tool problems
        - Process Confusion: Frequency of unclear processes
        """
        if not responses:
            return 50.0, FrictionBreakdown(50, 50, 50, 50, 50)

        # Get questions mapped to FRICTION metric
        friction_questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .all()
        )
        friction_questions = [q for q in friction_questions if MetricType.FRICTION.value in (q.metric_mapping or [])]

        # Categorize by dimension
        dependency_scores = []
        approval_scores = []
        rework_scores = []
        tooling_scores = []
        process_scores = []

        for response in responses:
            for question in friction_questions:
                answer = self._get_answer(response.id, question.id)
                if answer and answer.numeric_value is not None:
                    dimension = question.dimension
                    text_lower = question.text.lower()

                    if dimension == FrictionType.DELAY:
                        if "approv" in text_lower or "decision" in text_lower:
                            approval_scores.append(answer.numeric_value)
                        else:
                            dependency_scores.append(answer.numeric_value)
                    elif dimension == FrictionType.REWORK:
                        rework_scores.append(answer.numeric_value)
                    elif dimension == FrictionType.TOOLING:
                        tooling_scores.append(answer.numeric_value)
                    elif dimension == FrictionType.PROCESS:
                        process_scores.append(answer.numeric_value)
                    elif dimension == FrictionType.CLARITY:
                        # Clarity issues often manifest as rework
                        rework_scores.append(answer.numeric_value)

        # Calculate component averages (invert for "lower is better" questions)
        dependency_wait = self._invert_if_needed(self._safe_average(dependency_scores)) if dependency_scores else 50.0
        approval_latency = self._invert_if_needed(self._safe_average(approval_scores)) if approval_scores else 50.0
        rework_from_unclear = self._invert_if_needed(self._safe_average(rework_scores)) if rework_scores else 50.0
        tooling_pain = self._invert_if_needed(self._safe_average(tooling_scores)) if tooling_scores else 50.0
        process_confusion = self._invert_if_needed(self._safe_average(process_scores)) if process_scores else 50.0

        # Weighted average per spec
        friction_score = (
            dependency_wait * 0.25 +
            approval_latency * 0.20 +
            rework_from_unclear * 0.25 +
            tooling_pain * 0.15 +
            process_confusion * 0.15
        )

        return friction_score, FrictionBreakdown(
            dependency_wait, approval_latency, rework_from_unclear, tooling_pain, process_confusion
        )

    def _calculate_safety(
        self, survey: Survey, responses: list[Response]
    ) -> tuple[float, SafetyBreakdown]:
        """
        Calculate Safety score from survey responses.

        Safety measures frequency of negative outcomes (higher is better):
        - Rework Events: How often work requires significant rework
        - Quality Escapes: How often quality issues reach customers
        - Decision Reversals: How often decisions are reversed after work
        - Psychological Safety: Ability to raise concerns without fear
        """
        if not responses:
            return 50.0, SafetyBreakdown(50, 50, 50, 50)

        # Get questions mapped to SAFETY metric
        safety_questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .all()
        )
        safety_questions = [q for q in safety_questions if MetricType.SAFETY.value in (q.metric_mapping or [])]

        rework_scores = []
        quality_scores = []
        reversal_scores = []
        psych_safety_scores = []

        for response in responses:
            for question in safety_questions:
                answer = self._get_answer(response.id, question.id)
                if answer and answer.numeric_value is not None:
                    text_lower = question.text.lower()
                    dimension = question.dimension

                    if dimension == FrictionType.SAFETY:
                        # Psychological safety questions
                        psych_safety_scores.append(answer.numeric_value)
                    elif "revis" in text_lower or "rework" in text_lower or "redo" in text_lower:
                        rework_scores.append(answer.numeric_value)
                    elif "quality" in text_lower or "escape" in text_lower:
                        quality_scores.append(answer.numeric_value)
                    elif "revers" in text_lower or "decision" in text_lower:
                        reversal_scores.append(answer.numeric_value)
                    else:
                        # Default to rework
                        rework_scores.append(answer.numeric_value)

        # Calculate component averages
        # For negative events, we invert (high frequency = low safety)
        rework_events = 100 - self._safe_average(rework_scores) if rework_scores else 50.0
        quality_escapes = 100 - self._safe_average(quality_scores) if quality_scores else 50.0
        decision_reversals = 100 - self._safe_average(reversal_scores) if reversal_scores else 50.0
        # Psychological safety is already "higher is better"
        psych_safety = self._safe_average(psych_safety_scores) if psych_safety_scores else 50.0

        # Weighted average (modified from spec to include psych safety)
        safety_score = (
            rework_events * 0.25 +
            quality_escapes * 0.25 +
            decision_reversals * 0.25 +
            psych_safety * 0.25
        )

        return safety_score, SafetyBreakdown(
            rework_events, quality_escapes, decision_reversals, psych_safety
        )

    def _calculate_portfolio_balance(
        self, survey: Survey, responses: list[Response], occupation: Occupation
    ) -> tuple[float, PortfolioBreakdown]:
        """
        Calculate Portfolio Balance score from survey responses.

        Portfolio Balance measures time allocation health using Lean principles:
        - Value Adding (VA): Direct value creation work (building, creating, deciding)
        - Value Enabling (VE): Necessary support work (planning, compliance, coordination)
        - Waste (NVA): Non-value work to minimize (waiting, rework, unnecessary meetings)

        Waste is derived from friction responses - it's friction manifested as time.
        """
        if not responses:
            return 50.0, PortfolioBreakdown(
                value_adding_pct=50, value_enabling_pct=35, waste_pct=15,
                health_score=50, run_percentage=50, change_percentage=50,
                deviation_from_ideal=25
            )

        # Get portfolio balance questions
        portfolio_questions = (
            self.db.query(Question)
            .filter(Question.survey_id == survey.id)
            .all()
        )
        portfolio_questions = [
            q for q in portfolio_questions
            if MetricType.PORTFOLIO_BALANCE.value in (q.metric_mapping or [])
        ]

        # Collect responses for each category
        value_adding_scores = []
        value_enabling_scores = []
        waste_scores = []
        # Legacy: also track run/change for backward compatibility
        run_percentages = []
        change_percentages = []

        for response in responses:
            for question in portfolio_questions:
                answer = self._get_answer(response.id, question.id)
                if answer and answer.numeric_value is not None:
                    text_lower = question.text.lower()

                    # New value-based categorization
                    if any(kw in text_lower for kw in ["value adding", "direct value", "creating", "building", "delivering"]):
                        value_adding_scores.append(answer.numeric_value)
                    elif any(kw in text_lower for kw in ["value enabling", "support", "planning", "coordination", "compliance"]):
                        value_enabling_scores.append(answer.numeric_value)
                    elif any(kw in text_lower for kw in ["waste", "waiting", "rework", "unnecessary", "blocked"]):
                        waste_scores.append(answer.numeric_value)

                    # Legacy categorization
                    if "operational" in text_lower or "maintenance" in text_lower or "run" in text_lower:
                        run_percentages.append(answer.numeric_value)
                    elif "new" in text_lower or "improvement" in text_lower or "initiative" in text_lower:
                        change_percentages.append(answer.numeric_value)

        # Calculate value-based percentages
        # If no explicit value-adding questions, estimate from change work questions
        if value_adding_scores:
            va_pct = self._safe_average(value_adding_scores)
        elif change_percentages:
            va_pct = self._safe_average(change_percentages)
        else:
            va_pct = 50.0

        # If no explicit value-enabling questions, estimate from run work questions
        if value_enabling_scores:
            ve_pct = self._safe_average(value_enabling_scores)
        elif run_percentages:
            ve_pct = self._safe_average(run_percentages)
        else:
            ve_pct = 35.0

        # Waste: use explicit questions or derive from friction (later we can integrate with friction score)
        if waste_scores:
            waste_pct = self._safe_average(waste_scores)
        else:
            # Estimate waste as remainder if we have VA and VE data
            # Otherwise default to 15% (typical knowledge work waste)
            if value_adding_scores or value_enabling_scores:
                waste_pct = max(0, 100 - va_pct - ve_pct)
            else:
                waste_pct = 15.0

        # Normalize to ensure total = 100%
        total = va_pct + ve_pct + waste_pct
        if total > 0:
            va_pct = (va_pct / total) * 100
            ve_pct = (ve_pct / total) * 100
            waste_pct = (waste_pct / total) * 100

        # Get ideal ratios from occupation
        ideal_va = (occupation.ideal_value_adding_pct if hasattr(occupation, 'ideal_value_adding_pct') and occupation.ideal_value_adding_pct else 0.50) * 100
        ideal_ve = (occupation.ideal_value_enabling_pct if hasattr(occupation, 'ideal_value_enabling_pct') and occupation.ideal_value_enabling_pct else 0.35) * 100
        ideal_waste = (occupation.ideal_waste_pct if hasattr(occupation, 'ideal_waste_pct') and occupation.ideal_waste_pct else 0.15) * 100

        # Calculate health score based on:
        # 1. VA should be >= ideal (more direct value work is good)
        # 2. Waste should be <= ideal (less waste is good)
        # 3. VE should be close to ideal (too little = unsustainable, too much = overhead)

        va_health = min(100, (va_pct / ideal_va) * 100) if ideal_va > 0 else 100
        waste_health = min(100, (ideal_waste / max(waste_pct, 1)) * 100)  # Invert: less waste = better
        ve_deviation = abs(ve_pct - ideal_ve) / ideal_ve if ideal_ve > 0 else 0
        ve_health = max(0, 100 - (ve_deviation * 100))

        # Weighted health score
        health_score = (va_health * 0.40) + (waste_health * 0.40) + (ve_health * 0.20)
        health_score = min(100, max(0, health_score))

        # Legacy calculations for backward compatibility
        avg_run = self._safe_average(run_percentages) if run_percentages else ve_pct
        avg_change = self._safe_average(change_percentages) if change_percentages else va_pct
        run_pct_legacy = avg_run / 100.0 if avg_run <= 1 else avg_run / 100.0
        change_pct_legacy = avg_change / 100.0 if avg_change <= 1 else avg_change / 100.0

        ideal_run = occupation.ideal_run_percentage if occupation else 0.35
        ideal_change = occupation.ideal_change_percentage if occupation else 0.65
        run_deviation = abs(run_pct_legacy - ideal_run)
        change_deviation = abs(change_pct_legacy - ideal_change)
        total_deviation = (run_deviation + change_deviation) / 2

        return health_score, PortfolioBreakdown(
            value_adding_pct=round(va_pct, 1),
            value_enabling_pct=round(ve_pct, 1),
            waste_pct=round(waste_pct, 1),
            health_score=round(health_score, 1),
            run_percentage=round(avg_run, 1),
            change_percentage=round(avg_change, 1),
            deviation_from_ideal=round(total_deviation * 100, 1)
        )

    def _get_answer(self, response_id: str, question_id: str) -> Optional[Answer]:
        """Get answer for a specific response and question."""
        return (
            self.db.query(Answer)
            .filter(Answer.response_id == response_id, Answer.question_id == question_id)
            .first()
        )

    def _safe_average(self, values: list[float]) -> float:
        """Calculate average, returning 0 if empty."""
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _invert_if_needed(self, score: float) -> float:
        """
        Invert score for questions where higher answer = more friction.

        Most friction questions are phrased negatively (higher = worse),
        so we invert them for the friction score.
        """
        # For friction, we want higher scores to mean more friction
        # Survey questions like "How often do X slow you down" need inversion
        # A high answer (5 = often) should result in high friction
        # So we DON'T invert - the score is already in the right direction
        return score

    def _get_previous_result(self, team_id: str, current_survey_id: str) -> Optional[MetricResult]:
        """Get the most recent previous metric result for trend comparison."""
        return (
            self.db.query(MetricResult)
            .filter(
                MetricResult.team_id == team_id,
                MetricResult.survey_id != current_survey_id,
                MetricResult.meets_privacy_threshold == True,
            )
            .order_by(MetricResult.calculation_date.desc())
            .first()
        )

    def _calculate_trend(
        self,
        flow: float,
        friction: float,
        safety: float,
        portfolio: float,
        previous: Optional[MetricResult],
    ) -> TrendDirection:
        """
        Calculate overall trend direction compared to previous result.

        Uses a composite improvement score across all metrics.
        """
        if not previous or not previous.meets_privacy_threshold:
            return TrendDirection.STABLE

        # Calculate improvement for each metric
        # For friction, lower is better, so we invert the comparison
        improvements = []

        if previous.flow_score is not None:
            improvements.append(flow - previous.flow_score)
        if previous.friction_score is not None:
            improvements.append(previous.friction_score - friction)  # Inverted
        if previous.safety_score is not None:
            improvements.append(safety - previous.safety_score)
        if previous.portfolio_balance_score is not None:
            improvements.append(portfolio - previous.portfolio_balance_score)

        if not improvements:
            return TrendDirection.STABLE

        avg_improvement = sum(improvements) / len(improvements)

        # Use 5-point threshold for trend determination
        if avg_improvement > 5:
            return TrendDirection.UP
        elif avg_improvement < -5:
            return TrendDirection.DOWN
        else:
            return TrendDirection.STABLE

    def _breakdown_to_dict(self, breakdown: MetricBreakdown) -> dict:
        """Convert breakdown dataclass to dictionary for JSON storage."""
        if isinstance(breakdown, FlowBreakdown):
            return {
                "throughput": breakdown.throughput,
                "value_delivery": breakdown.value_delivery,
                "unblocked_time": breakdown.unblocked_time,
            }
        elif isinstance(breakdown, FrictionBreakdown):
            return {
                "dependency_wait": breakdown.dependency_wait,
                "approval_latency": breakdown.approval_latency,
                "rework_from_unclear": breakdown.rework_from_unclear,
                "tooling_pain": breakdown.tooling_pain,
                "process_confusion": breakdown.process_confusion,
            }
        elif isinstance(breakdown, SafetyBreakdown):
            return {
                "rework_events": breakdown.rework_events,
                "quality_escapes": breakdown.quality_escapes,
                "decision_reversals": breakdown.decision_reversals,
                "psychological_safety": breakdown.psychological_safety,
            }
        elif isinstance(breakdown, PortfolioBreakdown):
            return {
                # New value-based model
                "value_adding_pct": breakdown.value_adding_pct,
                "value_enabling_pct": breakdown.value_enabling_pct,
                "waste_pct": breakdown.waste_pct,
                "health_score": breakdown.health_score,
                # Legacy fields
                "run_percentage": breakdown.run_percentage,
                "change_percentage": breakdown.change_percentage,
                "deviation_from_ideal": breakdown.deviation_from_ideal,
            }
        return {}


def calculate_survey_metrics(db: Session, survey: Survey) -> Optional[MetricResult]:
    """
    Convenience function to calculate metrics for a survey.

    Args:
        db: Database session
        survey: Survey to calculate metrics for

    Returns:
        MetricResult if privacy threshold is met, None otherwise
    """
    calculator = MetricsCalculator(db)
    return calculator.calculate_metrics(survey)
