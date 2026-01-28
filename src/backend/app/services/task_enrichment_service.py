"""Service for enriching tasks with LLM-generated context."""

import time
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    CollaborationLevel,
    ComplexityLevel,
    EnrichedTask,
    LLMGenerationLog,
    LLMOperationType,
    Occupation,
    Task,
    TaskCategory,
)
from app.services.llm import LLMError, get_llm_client
from app.services.prompt_templates import (
    PROMPT_VERSION,
    TASK_ENRICHMENT_PROMPT,
    TASK_ENRICHMENT_SYSTEM_PROMPT,
    TASK_GAP_FILLING_PROMPT,
    TASK_GAP_FILLING_SYSTEM_PROMPT,
    TASK_SELECTION_PROMPT,
    TASK_SELECTION_SYSTEM_PROMPT,
    format_tasks_for_prompt,
)
from app.services.question_cache_service import QuestionCacheService


class TaskEnrichmentService:
    """Service for enriching tasks with LLM-generated context and metadata."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.cache_service = QuestionCacheService(db)

    async def enrich_tasks_for_occupation(
        self,
        occupation_id: str,
        force_refresh: bool = False,
    ) -> list[EnrichedTask]:
        """Enrich all tasks for an occupation using LLM.

        Args:
            occupation_id: The occupation to enrich tasks for
            force_refresh: If True, re-enrich even if already enriched

        Returns:
            List of enriched tasks
        """
        occupation = self.db.query(Occupation).filter(
            Occupation.id == occupation_id
        ).first()

        if not occupation:
            raise ValueError(f"Occupation not found: {occupation_id}")

        # Get existing tasks
        existing_tasks = self.db.query(Task).filter(
            Task.occupation_id == occupation_id
        ).all()

        # Check if we already have enriched tasks
        if not force_refresh:
            enriched = self.db.query(EnrichedTask).filter(
                EnrichedTask.occupation_id == occupation_id
            ).all()
            if enriched:
                return enriched

        # Get or create LLM client
        llm_client = get_llm_client()

        # Fill gaps if needed
        if len(existing_tasks) < 5:
            existing_tasks = await self._fill_task_gaps(
                occupation, existing_tasks, llm_client
            )

        # Enrich tasks with LLM
        enriched_tasks = await self._enrich_with_llm(
            occupation, existing_tasks, llm_client
        )

        return enriched_tasks

    async def _fill_task_gaps(
        self,
        occupation: Occupation,
        existing_tasks: list[Task],
        llm_client,
    ) -> list[Task]:
        """Fill gaps in task data when occupation has too few tasks."""
        needed_count = 5 - len(existing_tasks)
        if needed_count <= 0:
            return existing_tasks

        start_time = time.time()

        prompt = TASK_GAP_FILLING_PROMPT.format(
            existing_count=len(existing_tasks),
            occupation_name=occupation.name,
            occupation_description=occupation.description or "No description available",
            existing_tasks=format_tasks_for_prompt(existing_tasks),
            needed_count=needed_count,
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=TASK_GAP_FILLING_SYSTEM_PROMPT,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Log the operation
            self._log_operation(
                operation_type=LLMOperationType.TASK_GAP_FILLING,
                model_used=llm_client.get_model_name(),
                input_context={
                    "occupation_id": occupation.id,
                    "existing_task_count": len(existing_tasks),
                    "needed_count": needed_count,
                },
                output_data=response_data,
                latency_ms=latency_ms,
                success=True,
                occupation_id=occupation.id,
            )

            # Create new tasks from LLM response
            new_tasks = response_data.get("tasks", [])
            for task_data in new_tasks:
                task = Task(
                    occupation_id=occupation.id,
                    name=task_data.get("name", "Generated Task"),
                    description=task_data.get("description"),
                    category=self._parse_category(task_data.get("category", "core")),
                )
                self.db.add(task)
                existing_tasks.append(task)

            self.db.commit()

        except LLMError as e:
            self._log_operation(
                operation_type=LLMOperationType.TASK_GAP_FILLING,
                model_used=llm_client.get_model_name(),
                input_context={"occupation_id": occupation.id},
                success=False,
                error_message=str(e),
                occupation_id=occupation.id,
            )
            # Continue with existing tasks on error

        return existing_tasks

    async def _enrich_with_llm(
        self,
        occupation: Occupation,
        tasks: list[Task],
        llm_client,
    ) -> list[EnrichedTask]:
        """Enrich tasks with LLM-generated metadata."""
        start_time = time.time()

        prompt = TASK_ENRICHMENT_PROMPT.format(
            occupation_name=occupation.name,
            occupation_description=occupation.description or "No description available",
            tasks_list=format_tasks_for_prompt(tasks),
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=TASK_ENRICHMENT_SYSTEM_PROMPT,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Log the operation
            self._log_operation(
                operation_type=LLMOperationType.TASK_ENRICHMENT,
                model_used=llm_client.get_model_name(),
                input_context={
                    "occupation_id": occupation.id,
                    "task_count": len(tasks),
                },
                output_data=response_data,
                latency_ms=latency_ms,
                success=True,
                occupation_id=occupation.id,
            )

            # Create enriched tasks
            enriched_tasks = []
            enriched_data = response_data.get("tasks", [])

            for i, task_data in enumerate(enriched_data):
                # Find matching source task if available
                source_task = tasks[i] if i < len(tasks) else None

                # Generate task signature for caching
                skills = task_data.get("skill_requirements", [])
                category = task_data.get("category", "core")
                complexity = task_data.get("complexity_level", "medium")
                collaboration = task_data.get("collaboration_level", "team")

                task_signature = self.cache_service.generate_task_signature(
                    category=category,
                    skills=skills,
                    complexity=complexity,
                    collaboration=collaboration,
                )

                enriched_task = EnrichedTask(
                    occupation_id=occupation.id,
                    source_task_id=source_task.id if source_task else None,
                    name=task_data.get("name", f"Task {i + 1}"),
                    description=task_data.get("description"),
                    category=self._parse_category(category),
                    skill_requirements=skills,
                    complexity_level=self._parse_complexity(complexity),
                    collaboration_level=self._parse_collaboration(collaboration),
                    typical_friction_points=task_data.get("typical_friction_points"),
                    task_signature=task_signature,
                    source="llm_enriched" if source_task else "llm_generated",
                    model_used=llm_client.get_model_name(),
                )

                self.db.add(enriched_task)
                enriched_tasks.append(enriched_task)

            self.db.commit()
            for task in enriched_tasks:
                self.db.refresh(task)

            return enriched_tasks

        except LLMError as e:
            self._log_operation(
                operation_type=LLMOperationType.TASK_ENRICHMENT,
                model_used=llm_client.get_model_name(),
                input_context={"occupation_id": occupation.id},
                success=False,
                error_message=str(e),
                occupation_id=occupation.id,
            )
            raise

    async def select_tasks_for_survey(
        self,
        occupation_id: str,
        count: int = 5,
    ) -> list[dict[str, Any]]:
        """Select the most relevant tasks for a survey using LLM.

        Args:
            occupation_id: The occupation to select tasks for
            count: Number of tasks to select

        Returns:
            List of selected task information with relevance scores
        """
        occupation = self.db.query(Occupation).filter(
            Occupation.id == occupation_id
        ).first()

        if not occupation:
            raise ValueError(f"Occupation not found: {occupation_id}")

        # Get enriched tasks (or regular tasks as fallback)
        enriched_tasks = self.db.query(EnrichedTask).filter(
            EnrichedTask.occupation_id == occupation_id
        ).all()

        if not enriched_tasks:
            # Fall back to regular tasks
            regular_tasks = self.db.query(Task).filter(
                Task.occupation_id == occupation_id
            ).all()
            if not regular_tasks:
                raise ValueError(f"No tasks found for occupation: {occupation_id}")

            # Return regular tasks without LLM selection
            return [
                {
                    "task_id": task.id,
                    "name": task.name,
                    "relevance_score": 0.8,
                    "reason": "Selected from available tasks",
                }
                for task in regular_tasks[:count]
            ]

        llm_client = get_llm_client()
        start_time = time.time()

        # Format tasks for prompt
        tasks_for_prompt = []
        for task in enriched_tasks:
            tasks_for_prompt.append({
                "id": task.id,
                "name": task.name,
                "description": task.description,
                "category": task.category.value if task.category else "core",
                "complexity": task.complexity_level.value if task.complexity_level else "medium",
                "collaboration": task.collaboration_level.value if task.collaboration_level else "team",
            })

        prompt = TASK_SELECTION_PROMPT.format(
            count=count,
            occupation_name=occupation.name,
            tasks_list=format_tasks_for_prompt(tasks_for_prompt),
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=TASK_SELECTION_SYSTEM_PROMPT,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            self._log_operation(
                operation_type=LLMOperationType.TASK_SELECTION,
                model_used=llm_client.get_model_name(),
                input_context={
                    "occupation_id": occupation.id,
                    "available_task_count": len(enriched_tasks),
                    "requested_count": count,
                },
                output_data=response_data,
                latency_ms=latency_ms,
                success=True,
                occupation_id=occupation.id,
            )

            return response_data.get("selected_tasks", [])[:count]

        except LLMError as e:
            self._log_operation(
                operation_type=LLMOperationType.TASK_SELECTION,
                model_used=llm_client.get_model_name(),
                input_context={"occupation_id": occupation.id},
                success=False,
                error_message=str(e),
                occupation_id=occupation.id,
            )
            # Return top tasks by default
            return [
                {
                    "task_id": task.id,
                    "name": task.name,
                    "relevance_score": 0.7,
                    "reason": "Selected due to LLM error fallback",
                }
                for task in enriched_tasks[:count]
            ]

    def get_enriched_tasks(
        self,
        occupation_id: str,
    ) -> list[EnrichedTask]:
        """Get all enriched tasks for an occupation.

        Args:
            occupation_id: The occupation ID

        Returns:
            List of enriched tasks
        """
        return self.db.query(EnrichedTask).filter(
            EnrichedTask.occupation_id == occupation_id
        ).all()

    def _log_operation(
        self,
        operation_type: LLMOperationType,
        model_used: str,
        input_context: Optional[dict] = None,
        output_data: Optional[dict] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        latency_ms: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        occupation_id: Optional[str] = None,
        survey_id: Optional[str] = None,
    ):
        """Log an LLM operation for auditing."""
        log = LLMGenerationLog(
            operation_type=operation_type,
            model_used=model_used,
            prompt_version=PROMPT_VERSION,
            input_context=input_context,
            output_data=output_data,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            success=success,
            error_message=error_message,
            occupation_id=occupation_id,
            survey_id=survey_id,
        )
        self.db.add(log)
        self.db.commit()

    def _parse_category(self, value: str) -> TaskCategory:
        """Parse category string to enum."""
        value = str(value).lower().strip()
        try:
            return TaskCategory(value)
        except ValueError:
            return TaskCategory.CORE

    def _parse_complexity(self, value: str) -> ComplexityLevel:
        """Parse complexity string to enum."""
        value = str(value).lower().strip()
        try:
            return ComplexityLevel(value)
        except ValueError:
            return ComplexityLevel.MEDIUM

    def _parse_collaboration(self, value: str) -> CollaborationLevel:
        """Parse collaboration string to enum."""
        value = str(value).lower().strip()
        try:
            return CollaborationLevel(value)
        except ValueError:
            return CollaborationLevel.TEAM
