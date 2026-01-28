"""API v1 router - aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    llm,
    metrics,
    occupations,
    opportunities,
    responses,
    status,
    surveys,
    teams,
)

api_router = APIRouter()

api_router.include_router(occupations.router)
api_router.include_router(teams.router)
api_router.include_router(surveys.router)
api_router.include_router(responses.router)
api_router.include_router(metrics.router)
api_router.include_router(opportunities.router)
api_router.include_router(status.router)
api_router.include_router(llm.router)
