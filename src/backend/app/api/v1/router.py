"""API v1 router - aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    chat_surveys,
    llm,
    metrics,
    occupations,
    opportunities,
    responses,
    status,
    surveys,
    tasks,
    teams,
)

api_router = APIRouter()

api_router.include_router(occupations.router)
# Note: opportunities.router must come before teams.router because both use /teams prefix
# and opportunities has more specific routes like /{team_id}/opportunities/summary
api_router.include_router(opportunities.router)
api_router.include_router(teams.router)
api_router.include_router(surveys.router)
api_router.include_router(responses.router)
api_router.include_router(metrics.router)
api_router.include_router(status.router)
api_router.include_router(llm.router)
api_router.include_router(tasks.router)
api_router.include_router(chat_surveys.router)
