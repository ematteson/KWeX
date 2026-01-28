"""Metrics API endpoints."""

from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import MetricResult, Survey, Team, SurveyStatus
from app.schemas import MetricResultResponse
from app.services.metrics_calculator import MetricsCalculator
from app.services.audit_logger import get_audit_logger, AuditAction

router = APIRouter(prefix="/teams", tags=["metrics"])
settings = get_settings()


def get_request_info(request: Request) -> dict:
    """Extract request info for audit logging."""
    return {
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "request_id": request.headers.get("x-request-id"),
    }


@router.get("/{team_id}/metrics", response_model=Union[MetricResultResponse, dict])
def get_team_metrics(team_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Get current Core 4 metrics for a team.

    Returns the most recent metric calculation for the team.
    If privacy threshold (7 respondents) is not met, metric values are hidden.
    """
    audit = get_audit_logger()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get the most recent metric result
    result = (
        db.query(MetricResult)
        .filter(MetricResult.team_id == team_id)
        .order_by(MetricResult.calculation_date.desc())
        .first()
    )

    if not result:
        audit.log_metrics_access(
            team_id=team_id,
            action=AuditAction.VIEW_TEAM_METRICS,
            privacy_check_passed=False,
            respondent_count=0,
            request_info=get_request_info(request),
        )
        return {
            "message": "No metrics available yet. Complete a survey first.",
            "team_id": team_id,
        }

    # Log the access
    audit.log_metrics_access(
        team_id=team_id,
        action=AuditAction.VIEW_TEAM_METRICS,
        privacy_check_passed=result.meets_privacy_threshold,
        respondent_count=result.respondent_count,
        request_info=get_request_info(request),
    )

    if not result.meets_privacy_threshold:
        return {
            "message": f"Insufficient responses. Minimum {settings.min_respondents_for_display} required.",
            "team_id": team_id,
            "respondent_count": result.respondent_count,
            "minimum_required": settings.min_respondents_for_display,
            "meets_privacy_threshold": False,
        }

    return result


@router.get("/{team_id}/metrics/history", response_model=list[MetricResultResponse])
def get_team_metrics_history(
    team_id: str,
    request: Request,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """
    Get historical metrics for a team.

    Returns metrics from multiple survey cycles for trend analysis.
    Only results meeting the privacy threshold are included.
    """
    audit = get_audit_logger()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    results = (
        db.query(MetricResult)
        .filter(
            MetricResult.team_id == team_id,
            MetricResult.meets_privacy_threshold == True,
        )
        .order_by(MetricResult.calculation_date.desc())
        .limit(limit)
        .all()
    )

    # Log the access
    audit.log_metrics_access(
        team_id=team_id,
        action=AuditAction.VIEW_METRICS_HISTORY,
        privacy_check_passed=True,  # Only returning privacy-compliant results
        respondent_count=len(results),
        request_info=get_request_info(request),
    )

    return results


@router.get("/{team_id}/metrics/friction-breakdown")
def get_friction_breakdown(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get friction scores broken down by dimension for heatmap visualization.

    Returns scores for each friction dimension (Clarity, Tooling, Process, Rework, Delay, Safety).
    Only available when privacy threshold is met.
    """
    audit = get_audit_logger()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get the most recent metric result
    result = (
        db.query(MetricResult)
        .filter(MetricResult.team_id == team_id)
        .order_by(MetricResult.calculation_date.desc())
        .first()
    )

    if not result:
        audit.log_metrics_access(
            team_id=team_id,
            action=AuditAction.VIEW_FRICTION_BREAKDOWN,
            privacy_check_passed=False,
            respondent_count=0,
            request_info=get_request_info(request),
        )
        return {
            "message": "No metrics available yet",
            "team_id": team_id,
            "dimensions": [],
        }

    # Log the access
    audit.log_metrics_access(
        team_id=team_id,
        action=AuditAction.VIEW_FRICTION_BREAKDOWN,
        privacy_check_passed=result.meets_privacy_threshold,
        respondent_count=result.respondent_count,
        request_info=get_request_info(request),
    )

    if not result.meets_privacy_threshold:
        return {
            "message": f"Insufficient responses. Minimum {settings.min_respondents_for_display} required.",
            "team_id": team_id,
            "meets_threshold": False,
            "respondent_count": result.respondent_count,
            "dimensions": [],
        }

    # Extract friction breakdown from stored data or calculate from survey
    friction_data = result.friction_breakdown or {}

    # Build dimension breakdown for heatmap
    dimensions = [
        {
            "dimension": "clarity",
            "label": "Task Clarity",
            "score": friction_data.get("clarity", 50),
            "description": "How clear are requirements and expectations",
        },
        {
            "dimension": "tooling",
            "label": "Tooling",
            "score": friction_data.get("tooling", 50),
            "description": "Effectiveness of tools and systems",
        },
        {
            "dimension": "process",
            "label": "Process",
            "score": friction_data.get("process", 50),
            "description": "Efficiency of workflows and approvals",
        },
        {
            "dimension": "rework",
            "label": "Rework",
            "score": friction_data.get("rework", 50),
            "description": "Frequency of redoing completed work",
        },
        {
            "dimension": "delay",
            "label": "Delays",
            "score": friction_data.get("delay", 50),
            "description": "Wait times for dependencies and decisions",
        },
        {
            "dimension": "safety",
            "label": "Psych Safety",
            "score": friction_data.get("safety", 50),
            "description": "Comfort speaking up and taking risks",
        },
    ]

    return {
        "team_id": team_id,
        "survey_id": result.survey_id,
        "calculation_date": result.calculation_date.isoformat(),
        "overall_friction_score": result.friction_score,
        "meets_threshold": True,
        "dimensions": dimensions,
    }


@router.get("/{team_id}/metrics/{survey_id}", response_model=Union[MetricResultResponse, dict])
def get_team_survey_metrics(
    team_id: str,
    survey_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get metrics for a specific team and survey.

    Calculates metrics if not already calculated.
    """
    audit = get_audit_logger()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.team_id != team_id:
        raise HTTPException(status_code=400, detail="Survey does not belong to this team")

    # Check if metrics already calculated
    result = (
        db.query(MetricResult)
        .filter(MetricResult.team_id == team_id, MetricResult.survey_id == survey_id)
        .first()
    )

    if not result:
        # Calculate metrics
        calculator = MetricsCalculator(db)
        result = calculator.calculate_metrics(survey)

    if not result:
        return {
            "message": "Could not calculate metrics",
            "team_id": team_id,
            "survey_id": survey_id,
        }

    # Log the access
    audit.log_metrics_access(
        team_id=team_id,
        action=AuditAction.VIEW_TEAM_METRICS,
        privacy_check_passed=result.meets_privacy_threshold,
        respondent_count=result.respondent_count,
        request_info=get_request_info(request),
    )

    if not result.meets_privacy_threshold:
        return {
            "message": f"Insufficient responses. Minimum {settings.min_respondents_for_display} required.",
            "team_id": team_id,
            "survey_id": survey_id,
            "respondent_count": result.respondent_count,
            "minimum_required": settings.min_respondents_for_display,
            "meets_privacy_threshold": False,
        }

    return result


@router.post("/{team_id}/metrics/calculate")
def calculate_team_metrics(
    team_id: str,
    survey_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Manually trigger metrics calculation for a survey.

    Useful for recalculating metrics after additional responses are submitted.
    """
    audit = get_audit_logger()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.team_id != team_id:
        raise HTTPException(status_code=400, detail="Survey does not belong to this team")

    if survey.status == SurveyStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Cannot calculate metrics for draft survey")

    # Delete existing metrics for this survey
    db.query(MetricResult).filter(
        MetricResult.team_id == team_id,
        MetricResult.survey_id == survey_id,
    ).delete()
    db.commit()

    # Calculate fresh metrics
    calculator = MetricsCalculator(db)
    result = calculator.calculate_metrics(survey)

    if not result:
        return {
            "message": "Could not calculate metrics",
            "team_id": team_id,
            "survey_id": survey_id,
        }

    # Log the calculation
    audit.log_metrics_access(
        team_id=team_id,
        action=AuditAction.CALCULATE_METRICS,
        privacy_check_passed=result.meets_privacy_threshold,
        respondent_count=result.respondent_count,
        request_info=get_request_info(request),
    )

    return {
        "message": "Metrics calculated successfully",
        "team_id": team_id,
        "survey_id": survey_id,
        "respondent_count": result.respondent_count,
        "meets_privacy_threshold": result.meets_privacy_threshold,
        "flow_score": result.flow_score,
        "friction_score": result.friction_score,
        "safety_score": result.safety_score,
        "portfolio_balance_score": result.portfolio_balance_score,
    }
