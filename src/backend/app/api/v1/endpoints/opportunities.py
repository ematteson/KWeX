"""Opportunity management API endpoints."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.models import Opportunity, Survey, Team, OpportunityStatus
from app.schemas import (
    OpportunityResponse,
    OpportunityUpdate,
    OpportunityCreate,
)
from app.services.opportunity_generator import (
    OpportunityGenerator,
    calculate_rice_score,
)

router = APIRouter(prefix="/teams", tags=["opportunities"])
settings = get_settings()


@router.get("/{team_id}/opportunities", response_model=list[OpportunityResponse])
def get_team_opportunities(
    team_id: str,
    status: Optional[OpportunityStatus] = None,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    """
    Get opportunities for a team.

    Returns opportunities sorted by RICE score (highest priority first).
    Optionally filter by status.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    query = db.query(Opportunity).filter(Opportunity.team_id == team_id)

    if status:
        query = query.filter(Opportunity.status == status)

    opportunities = (
        query.order_by(Opportunity.rice_score.desc()).limit(limit).all()
    )

    return opportunities


@router.get(
    "/{team_id}/opportunities/{opportunity_id}",
    response_model=OpportunityResponse,
)
def get_opportunity(
    team_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific opportunity."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    opportunity = (
        db.query(Opportunity)
        .filter(
            Opportunity.id == opportunity_id,
            Opportunity.team_id == team_id,
        )
        .first()
    )

    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    return opportunity


@router.patch(
    "/{team_id}/opportunities/{opportunity_id}",
    response_model=OpportunityResponse,
)
def update_opportunity(
    team_id: str,
    opportunity_id: str,
    update_data: OpportunityUpdate,
    db: Session = Depends(get_db),
):
    """
    Update an opportunity.

    Can update RICE factors, status, title, or description.
    RICE score is automatically recalculated if factors change.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    opportunity = (
        db.query(Opportunity)
        .filter(
            Opportunity.id == opportunity_id,
            Opportunity.team_id == team_id,
        )
        .first()
    )

    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Track if RICE factors changed
    rice_changed = False
    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if field in ("reach", "impact", "confidence", "effort") and value is not None:
            rice_changed = True
        setattr(opportunity, field, value)

    # Recalculate RICE score if factors changed
    if rice_changed:
        opportunity.rice_score = calculate_rice_score(
            opportunity.reach,
            opportunity.impact,
            opportunity.confidence,
            opportunity.effort,
        )

    # Handle status transitions
    if update_data.status:
        generator = OpportunityGenerator(db)
        generator.update_opportunity_status(opportunity, update_data.status)
    else:
        db.commit()

    db.refresh(opportunity)
    return opportunity


@router.post("/{team_id}/opportunities", response_model=OpportunityResponse)
def create_opportunity(
    team_id: str,
    opportunity_data: OpportunityCreate,
    db: Session = Depends(get_db),
):
    """
    Manually create an opportunity.

    Allows creating opportunities outside of automated survey analysis.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Calculate RICE score
    rice_score = calculate_rice_score(
        opportunity_data.reach,
        opportunity_data.impact,
        opportunity_data.confidence,
        opportunity_data.effort,
    )

    opportunity = Opportunity(
        team_id=team_id,
        survey_id=opportunity_data.survey_id,
        title=opportunity_data.title,
        description=opportunity_data.description,
        friction_type=opportunity_data.friction_type,
        reach=opportunity_data.reach,
        impact=opportunity_data.impact,
        confidence=opportunity_data.confidence,
        effort=opportunity_data.effort,
        rice_score=rice_score,
        source_score=opportunity_data.source_score,
        status=OpportunityStatus.IDENTIFIED,
    )

    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)

    return opportunity


@router.delete("/{team_id}/opportunities/{opportunity_id}")
def delete_opportunity(
    team_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
):
    """Delete an opportunity."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    opportunity = (
        db.query(Opportunity)
        .filter(
            Opportunity.id == opportunity_id,
            Opportunity.team_id == team_id,
        )
        .first()
    )

    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    db.delete(opportunity)
    db.commit()

    return {"message": "Opportunity deleted", "id": opportunity_id}


@router.post("/{team_id}/surveys/{survey_id}/generate-opportunities")
def generate_opportunities(
    team_id: str,
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate opportunities from survey results.

    Analyzes friction signals from survey responses and creates
    RICE-scored improvement opportunities.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.team_id != team_id:
        raise HTTPException(
            status_code=400, detail="Survey does not belong to this team"
        )

    # Clear existing opportunities for this survey
    db.query(Opportunity).filter(
        Opportunity.survey_id == survey_id,
        Opportunity.team_id == team_id,
    ).delete()
    db.commit()

    # Generate new opportunities
    generator = OpportunityGenerator(db)
    opportunities = generator.generate_opportunities(survey)

    return {
        "message": "Opportunities generated successfully",
        "team_id": team_id,
        "survey_id": survey_id,
        "opportunities_created": len(opportunities),
        "opportunities": [
            {
                "id": opp.id,
                "title": opp.title,
                "friction_type": opp.friction_type.value if opp.friction_type else None,
                "rice_score": opp.rice_score,
            }
            for opp in opportunities
        ],
    }


@router.get("/{team_id}/opportunities/summary")
def get_opportunities_summary(
    team_id: str,
    db: Session = Depends(get_db),
):
    """
    Get summary statistics for team opportunities.

    Returns counts by status and top priorities.
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get all opportunities
    opportunities = (
        db.query(Opportunity).filter(Opportunity.team_id == team_id).all()
    )

    # Count by status
    status_counts = {}
    for status in OpportunityStatus:
        status_counts[status.value] = sum(
            1 for o in opportunities if o.status == status
        )

    # Get top 5 by RICE score
    top_opportunities = sorted(
        [o for o in opportunities if o.status == OpportunityStatus.IDENTIFIED],
        key=lambda x: x.rice_score,
        reverse=True,
    )[:5]

    # Calculate average RICE score
    active_opportunities = [
        o
        for o in opportunities
        if o.status in (OpportunityStatus.IDENTIFIED, OpportunityStatus.IN_PROGRESS)
    ]
    avg_rice = (
        sum(o.rice_score for o in active_opportunities) / len(active_opportunities)
        if active_opportunities
        else 0
    )

    return {
        "team_id": team_id,
        "total_opportunities": len(opportunities),
        "status_counts": status_counts,
        "average_rice_score": round(avg_rice, 2),
        "top_priorities": [
            {
                "id": o.id,
                "title": o.title,
                "rice_score": round(o.rice_score, 2),
                "friction_type": o.friction_type.value if o.friction_type else None,
            }
            for o in top_opportunities
        ],
    }
