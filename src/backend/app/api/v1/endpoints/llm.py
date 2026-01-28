"""API endpoints for LLM-powered features."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import GenerationMethod, Occupation, Survey
from app.schemas.schemas import (
    CacheStatsResponse,
    CacheWarmupRequest,
    CacheWarmupResponse,
    EnrichedTaskResponse,
    EnrichTasksRequest,
    EnrichTasksResponse,
    GenerateQuestionsLLMRequest,
    GenerateQuestionsLLMResponse,
    QuestionResponse,
)
from app.services.question_cache_service import QuestionCacheService
from app.services.question_generation_service import (
    QuestionGenerationService,
    warmup_cache_for_occupations,
)
from app.services.task_enrichment_service import TaskEnrichmentService

router = APIRouter(prefix="/llm", tags=["llm"])


@router.post(
    "/occupations/{occupation_id}/enrich-tasks",
    response_model=EnrichTasksResponse,
)
async def enrich_tasks_for_occupation(
    occupation_id: str,
    request: EnrichTasksRequest = EnrichTasksRequest(),
    db: Session = Depends(get_db),
):
    """Enrich tasks for an occupation using LLM.

    This endpoint uses an LLM to analyze and enrich task data with:
    - Required skills
    - Complexity levels
    - Collaboration levels
    - Typical friction points

    If the occupation has fewer than 5 tasks, the LLM will also generate
    additional representative tasks.
    """
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    service = TaskEnrichmentService(db)

    try:
        enriched_tasks = await service.enrich_tasks_for_occupation(
            occupation_id=occupation_id,
            force_refresh=request.force_refresh,
        )

        return EnrichTasksResponse(
            occupation_id=occupation_id,
            tasks_enriched=len(enriched_tasks),
            tasks=[
                EnrichedTaskResponse.model_validate(task)
                for task in enriched_tasks
            ],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to enrich tasks: {str(e)}",
        )


@router.get(
    "/occupations/{occupation_id}/enriched-tasks",
    response_model=list[EnrichedTaskResponse],
)
async def get_enriched_tasks(
    occupation_id: str,
    db: Session = Depends(get_db),
):
    """Get all enriched tasks for an occupation.

    Returns the enriched task data including LLM-generated metadata.
    If no enriched tasks exist, returns an empty list.
    """
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    service = TaskEnrichmentService(db)
    tasks = service.get_enriched_tasks(occupation_id)

    return [EnrichedTaskResponse.model_validate(task) for task in tasks]


@router.post(
    "/surveys/{survey_id}/generate-questions-llm",
    response_model=GenerateQuestionsLLMResponse,
)
async def generate_questions_with_llm(
    survey_id: str,
    request: GenerateQuestionsLLMRequest = GenerateQuestionsLLMRequest(),
    db: Session = Depends(get_db),
):
    """Generate survey questions using LLM with caching.

    This endpoint uses an LLM to generate high-quality, contextual survey
    questions based on the occupation's enriched task data.

    Features:
    - Uses task enrichment data for context
    - Caches generated questions for reuse across similar tasks
    - Falls back to static templates on LLM errors
    - Ensures coverage of all friction dimensions

    Args:
        survey_id: The survey to generate questions for
        request: Configuration for question generation

    Returns:
        The generated questions with metadata about cache hits/misses
    """
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Questions can only be generated for draft surveys",
        )

    service = QuestionGenerationService(db)

    try:
        questions = await service.generate_questions_for_survey(
            survey_id=survey_id,
            use_cache=request.use_cache,
            max_questions=request.max_questions,
        )

        # Count cache hits vs LLM calls
        cache_hits = sum(
            1 for q in questions
            if q.generation_method == GenerationMethod.LLM_CACHED
        )
        llm_calls = sum(
            1 for q in questions
            if q.generation_method == GenerationMethod.LLM_GENERATED
        )

        return GenerateQuestionsLLMResponse(
            survey_id=survey_id,
            questions_generated=len(questions),
            questions=[
                QuestionResponse.model_validate(q) for q in questions
            ],
            cache_hits=cache_hits,
            llm_calls=llm_calls,
            method="llm",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate questions: {str(e)}",
        )


@router.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats(db: Session = Depends(get_db)):
    """Get statistics about the question template cache.

    Returns information about:
    - Total cached templates
    - Unique task signatures
    - Breakdown by dimension
    - Average quality score
    - Total usage count
    """
    service = QuestionCacheService(db)
    stats = service.get_cache_stats()
    return CacheStatsResponse(**stats)


@router.post("/cache/warmup", response_model=CacheWarmupResponse)
async def warmup_cache(
    request: CacheWarmupRequest,
    db: Session = Depends(get_db),
):
    """Pre-warm the question cache for multiple occupations.

    This endpoint enriches tasks for the specified occupations,
    which prepares the cache for future question generation.

    This is useful for:
    - Pre-populating the cache before a deployment
    - Ensuring common occupations have cached questions ready
    """
    if not request.occupation_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one occupation ID is required",
        )

    # Verify all occupations exist
    for occ_id in request.occupation_ids:
        occupation = db.query(Occupation).filter(Occupation.id == occ_id).first()
        if not occupation:
            raise HTTPException(
                status_code=404,
                detail=f"Occupation not found: {occ_id}",
            )

    try:
        stats = await warmup_cache_for_occupations(db, request.occupation_ids)
        return CacheWarmupResponse(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to warm up cache: {str(e)}",
        )


@router.delete("/cache/low-quality")
async def invalidate_low_quality_templates(
    quality_threshold: float = 0.5,
    db: Session = Depends(get_db),
):
    """Remove cached templates below a quality threshold.

    This endpoint cleans up low-quality cached questions that might
    have been generated during development or with poor prompts.

    Args:
        quality_threshold: Templates below this score will be removed (default 0.5)

    Returns:
        Number of templates removed
    """
    if quality_threshold < 0 or quality_threshold > 1:
        raise HTTPException(
            status_code=400,
            detail="Quality threshold must be between 0 and 1",
        )

    service = QuestionCacheService(db)
    count = service.invalidate_low_quality_templates(quality_threshold)

    return {"removed": count, "threshold": quality_threshold}
