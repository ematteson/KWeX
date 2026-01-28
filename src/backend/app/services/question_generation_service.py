"""Service for LLM-powered question generation with caching."""

import time
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    EnrichedTask,
    FrictionType,
    GenerationMethod,
    LLMGenerationLog,
    LLMOperationType,
    Occupation,
    Question,
    QuestionType,
    Survey,
)
from app.services.llm import LLMError, get_llm_client
from app.services.prompt_templates import (
    FLOW_QUESTIONS_PROMPT,
    PORTFOLIO_QUESTIONS_PROMPT,
    PROMPT_VERSION,
    QUESTION_GENERATION_PROMPT,
    QUESTION_GENERATION_SYSTEM_PROMPT,
    format_friction_points_for_prompt,
)
from app.services.question_cache_service import QuestionCacheService
from app.services.survey_generator import SurveyGenerator
from app.services.task_enrichment_service import TaskEnrichmentService


class QuestionGenerationService:
    """Service for generating survey questions using LLM with caching."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.cache_service = QuestionCacheService(db)
        self.task_enrichment_service = TaskEnrichmentService(db)
        self.static_generator = SurveyGenerator(db)

    async def generate_questions_for_survey(
        self,
        survey_id: str,
        use_cache: bool = True,
        max_questions: int = 18,
    ) -> list[Question]:
        """Generate questions for a survey using LLM with caching.

        This is the main entry point for LLM-powered question generation.

        Args:
            survey_id: The survey to generate questions for
            use_cache: Whether to use cached questions (default True)
            max_questions: Maximum number of questions to generate

        Returns:
            List of generated Question objects
        """
        survey = self.db.query(Survey).filter(Survey.id == survey_id).first()
        if not survey:
            raise ValueError(f"Survey not found: {survey_id}")

        occupation = self.db.query(Occupation).filter(
            Occupation.id == survey.occupation_id
        ).first()
        if not occupation:
            raise ValueError(f"Occupation not found: {survey.occupation_id}")

        # Get or create enriched tasks
        try:
            enriched_tasks = await self.task_enrichment_service.enrich_tasks_for_occupation(
                occupation.id
            )
        except LLMError:
            # Fall back to static generation on LLM error
            return self._fallback_to_static(survey)

        # Select tasks for this survey
        try:
            selected_tasks = await self.task_enrichment_service.select_tasks_for_survey(
                occupation.id, count=5
            )
        except LLMError:
            # Use all enriched tasks on error
            selected_tasks = [
                {"task_id": task.id, "name": task.name, "relevance_score": 0.7}
                for task in enriched_tasks[:5]
            ]

        # Map selected task IDs to enriched task objects
        task_id_map = {task.id: task for task in enriched_tasks}
        tasks_to_use = [
            task_id_map.get(st.get("task_id"))
            for st in selected_tasks
            if st.get("task_id") in task_id_map
        ]
        tasks_to_use = [t for t in tasks_to_use if t is not None]

        if not tasks_to_use:
            tasks_to_use = enriched_tasks[:5]

        # Generate questions for each dimension
        questions = []
        dimensions_covered = set()

        # Generate friction questions for each task
        for task in tasks_to_use:
            task_questions = await self._generate_questions_for_task(
                survey=survey,
                task=task,
                use_cache=use_cache,
            )
            questions.extend(task_questions)

            for q in task_questions:
                dimensions_covered.add(q.dimension)

            if len(questions) >= max_questions - 4:  # Leave room for flow/portfolio
                break

        # Add flow questions
        flow_questions = await self._generate_flow_questions(
            survey=survey,
            occupation=occupation,
            tasks=tasks_to_use,
        )
        questions.extend(flow_questions)

        # Add portfolio balance questions
        portfolio_questions = await self._generate_portfolio_questions(
            survey=survey,
            occupation=occupation,
        )
        questions.extend(portfolio_questions)

        # Ensure dimension coverage
        questions = self._ensure_dimension_coverage(
            questions=questions,
            survey=survey,
            dimensions_covered=dimensions_covered,
        )

        # Order questions
        for i, question in enumerate(questions):
            question.order = i

        self.db.commit()

        return questions

    async def _generate_questions_for_task(
        self,
        survey: Survey,
        task: EnrichedTask,
        use_cache: bool = True,
    ) -> list[Question]:
        """Generate friction questions for a specific task."""
        questions = []

        # Determine which dimensions to cover based on task friction points
        dimensions_to_cover = self._get_dimensions_for_task(task)

        for dimension in dimensions_to_cover:
            # Check cache first
            if use_cache:
                cached_template = self.cache_service.get_cached_template(
                    task_signature=task.task_signature,
                    dimension=dimension,
                )

                if cached_template:
                    question = self._create_question_from_template(
                        survey=survey,
                        template=cached_template,
                        method=GenerationMethod.LLM_CACHED,
                    )
                    questions.append(question)
                    continue

            # Generate with LLM
            try:
                question = await self._generate_question_with_llm(
                    survey=survey,
                    task=task,
                    dimension=dimension,
                )
                questions.append(question)
            except LLMError:
                # Add static fallback question
                static_question = self._create_static_fallback_question(
                    survey=survey,
                    dimension=dimension,
                )
                if static_question:
                    questions.append(static_question)

        return questions

    async def _generate_question_with_llm(
        self,
        survey: Survey,
        task: EnrichedTask,
        dimension: FrictionType,
    ) -> Question:
        """Generate a single question using LLM."""
        llm_client = get_llm_client()
        start_time = time.time()

        friction_points = []
        if task.typical_friction_points:
            friction_points = [
                fp for fp in task.typical_friction_points
                if fp.get("type") == dimension.value
            ]

        prompt = QUESTION_GENERATION_PROMPT.format(
            task_name=task.name,
            task_description=task.description or "No description available",
            dimension=dimension.value,
            friction_points=format_friction_points_for_prompt(friction_points),
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=QUESTION_GENERATION_SYSTEM_PROMPT,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Log the operation
            self._log_operation(
                operation_type=LLMOperationType.QUESTION_GENERATION,
                model_used=llm_client.get_model_name(),
                input_context={
                    "task_id": task.id,
                    "task_name": task.name,
                    "dimension": dimension.value,
                },
                output_data=response_data,
                latency_ms=latency_ms,
                success=True,
                survey_id=survey.id,
            )

            # Parse response
            question_text = response_data.get("text", "")
            question_type = self._parse_question_type(
                response_data.get("question_type", "likert_5")
            )
            metric_mapping = response_data.get("metric_mapping", ["friction"])
            quality_score = response_data.get("quality_score", 0.8)

            # Parse custom options
            options = self._parse_options(response_data, question_type)

            # Cache the template
            cached_template = self.cache_service.cache_template(
                task_signature=task.task_signature,
                dimension=dimension,
                question_text=question_text,
                question_type=question_type,
                metric_mapping=metric_mapping,
                model_used=llm_client.get_model_name(),
                quality_score=quality_score,
                options=options,
            )

            # Create the question
            question = Question(
                survey_id=survey.id,
                dimension=dimension,
                metric_mapping=metric_mapping,
                text=question_text,
                type=question_type,
                options=options,
                required=True,
                generation_method=GenerationMethod.LLM_GENERATED,
                llm_template_id=cached_template.id,
            )

            self.db.add(question)
            return question

        except LLMError as e:
            self._log_operation(
                operation_type=LLMOperationType.QUESTION_GENERATION,
                model_used=llm_client.get_model_name(),
                input_context={"task_id": task.id, "dimension": dimension.value},
                success=False,
                error_message=str(e),
                survey_id=survey.id,
            )
            raise

    async def _generate_flow_questions(
        self,
        survey: Survey,
        occupation: Occupation,
        tasks: list[EnrichedTask],
        count: int = 2,
    ) -> list[Question]:
        """Generate Flow metric questions."""
        llm_client = get_llm_client()

        task_names = ", ".join([t.name for t in tasks[:3]])

        prompt = FLOW_QUESTIONS_PROMPT.format(
            count=count,
            occupation_name=occupation.name,
            task_names=task_names,
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=QUESTION_GENERATION_SYSTEM_PROMPT,
            )

            questions = []
            for q_data in response_data.get("questions", [])[:count]:
                q_type = self._parse_question_type(q_data.get("question_type", "likert_5"))
                options = self._parse_options(q_data, q_type)

                question = Question(
                    survey_id=survey.id,
                    dimension=FrictionType.CLARITY,  # Use clarity as flow proxy
                    metric_mapping=["flow"],
                    text=q_data.get("text", ""),
                    type=q_type,
                    options=options,
                    required=True,
                    generation_method=GenerationMethod.LLM_GENERATED,
                )
                self.db.add(question)
                questions.append(question)

            return questions

        except LLMError:
            # Return static flow questions
            return self._create_static_flow_questions(survey, count)

    async def _generate_portfolio_questions(
        self,
        survey: Survey,
        occupation: Occupation,
        count: int = 2,
    ) -> list[Question]:
        """Generate Portfolio Balance metric questions."""
        llm_client = get_llm_client()

        prompt = PORTFOLIO_QUESTIONS_PROMPT.format(
            count=count,
            occupation_name=occupation.name,
            ideal_run=int(occupation.ideal_run_percentage * 100),
            ideal_change=int(occupation.ideal_change_percentage * 100),
        )

        try:
            response_data = await llm_client.generate_json(
                prompt=prompt,
                system_prompt=QUESTION_GENERATION_SYSTEM_PROMPT,
            )

            questions = []
            for q_data in response_data.get("questions", [])[:count]:
                q_type = self._parse_question_type(q_data.get("question_type", "percentage_slider"))
                options = self._parse_options(q_data, q_type)

                question = Question(
                    survey_id=survey.id,
                    dimension=FrictionType.PROCESS,  # Use process as portfolio proxy
                    metric_mapping=["portfolio_balance"],
                    text=q_data.get("text", ""),
                    type=q_type,
                    options=options,
                    required=True,
                    generation_method=GenerationMethod.LLM_GENERATED,
                )
                self.db.add(question)
                questions.append(question)

            return questions

        except LLMError:
            # Return static portfolio questions
            return self._create_static_portfolio_questions(survey, count)

    def _get_dimensions_for_task(self, task: EnrichedTask) -> list[FrictionType]:
        """Determine which friction dimensions to cover for a task."""
        dimensions = []

        if task.typical_friction_points:
            # Extract unique dimension types from friction points
            fp_types = set()
            for fp in task.typical_friction_points:
                fp_type = fp.get("type", "").lower()
                try:
                    dim = FrictionType(fp_type)
                    fp_types.add(dim)
                except ValueError:
                    pass
            dimensions = list(fp_types)

        # Ensure at least 2 dimensions per task
        if len(dimensions) < 2:
            all_dims = list(FrictionType)
            for dim in all_dims:
                if dim not in dimensions:
                    dimensions.append(dim)
                if len(dimensions) >= 2:
                    break

        return dimensions[:3]  # Max 3 dimensions per task

    def _create_question_from_template(
        self,
        survey: Survey,
        template,
        method: GenerationMethod,
    ) -> Question:
        """Create a Question from a cached template."""
        # Get options from template if available
        options = getattr(template, 'options', None)
        if not options:
            options = self._parse_options({}, template.question_type)

        question = Question(
            survey_id=survey.id,
            dimension=template.dimension,
            metric_mapping=template.metric_mapping,
            text=template.question_text,
            type=template.question_type,
            options=options,
            required=True,
            generation_method=method,
            llm_template_id=template.id,
        )
        self.db.add(question)
        return question

    def _create_static_fallback_question(
        self,
        survey: Survey,
        dimension: FrictionType,
    ) -> Optional[Question]:
        """Create a static fallback question for a dimension."""
        static_templates = {
            FrictionType.CLARITY: {
                "text": "How clearly defined are the requirements for your work?",
                "options": ["Very unclear", "Mostly unclear", "Somewhat clear", "Mostly clear", "Very clear"],
            },
            FrictionType.TOOLING: {
                "text": "How effective are the tools you use for your daily work?",
                "options": ["Very ineffective", "Somewhat ineffective", "Adequate", "Effective", "Highly effective"],
            },
            FrictionType.PROCESS: {
                "text": "How well do your team's processes support efficient work?",
                "options": ["Very poorly", "Poorly", "Adequately", "Well", "Very well"],
            },
            FrictionType.REWORK: {
                "text": "How often do you need to redo work due to unclear requirements?",
                "options": ["Almost always", "Frequently", "Sometimes", "Rarely", "Almost never"],
            },
            FrictionType.DELAY: {
                "text": "How often is your work delayed waiting for others?",
                "options": ["Almost always", "Frequently", "Sometimes", "Rarely", "Almost never"],
            },
            FrictionType.SAFETY: {
                "text": "How comfortable do you feel raising concerns about quality issues?",
                "options": ["Very uncomfortable", "Uncomfortable", "Neutral", "Comfortable", "Very comfortable"],
            },
        }

        template = static_templates.get(dimension)
        if not template:
            return None

        options = {
            "choices": template["options"],
            "low_label": "",
            "high_label": "",
        }

        question = Question(
            survey_id=survey.id,
            dimension=dimension,
            metric_mapping=["friction"],
            text=template["text"],
            type=QuestionType.LIKERT_5,
            options=options,
            required=True,
            generation_method=GenerationMethod.STATIC,
        )
        self.db.add(question)
        return question

    def _create_static_flow_questions(
        self, survey: Survey, count: int
    ) -> list[Question]:
        """Create static flow questions as fallback."""
        templates = [
            {
                "text": "How much of your time is spent on work that directly adds value?",
                "options": ["Very little (< 20%)", "Some (20-40%)", "About half (40-60%)", "Most (60-80%)", "Almost all (> 80%)"],
            },
            {
                "text": "How often are you able to complete planned work without interruption?",
                "options": ["Rarely", "Sometimes", "About half the time", "Usually", "Almost always"],
            },
        ]

        questions = []
        for template in templates[:count]:
            options = {
                "choices": template["options"],
                "low_label": "",
                "high_label": "",
            }
            question = Question(
                survey_id=survey.id,
                dimension=FrictionType.CLARITY,
                metric_mapping=["flow"],
                text=template["text"],
                type=QuestionType.LIKERT_5,
                options=options,
                required=True,
                generation_method=GenerationMethod.STATIC,
            )
            self.db.add(question)
            questions.append(question)

        return questions

    def _create_static_portfolio_questions(
        self, survey: Survey, count: int
    ) -> list[Question]:
        """Create static portfolio questions as fallback."""
        templates = [
            {
                "text": "What percentage of your time is spent on maintenance vs new development?",
                "type": QuestionType.PERCENTAGE_SLIDER,
                "options": {
                    "choices": [],
                    "low_label": "All maintenance/operations",
                    "high_label": "All new development/change",
                },
            },
            {
                "text": "How well does your work distribution match your team's goals?",
                "type": QuestionType.LIKERT_5,
                "options": {
                    "choices": ["Very poorly aligned", "Poorly aligned", "Somewhat aligned", "Well aligned", "Perfectly aligned"],
                    "low_label": "",
                    "high_label": "",
                },
            },
        ]

        questions = []
        for template in templates[:count]:
            question = Question(
                survey_id=survey.id,
                dimension=FrictionType.PROCESS,
                metric_mapping=["portfolio_balance"],
                text=template["text"],
                type=template["type"],
                options=template["options"],
                required=True,
                generation_method=GenerationMethod.STATIC,
            )
            self.db.add(question)
            questions.append(question)

        return questions

    def _ensure_dimension_coverage(
        self,
        questions: list[Question],
        survey: Survey,
        dimensions_covered: set,
    ) -> list[Question]:
        """Ensure all friction dimensions are covered."""
        all_dimensions = set(FrictionType)
        missing = all_dimensions - dimensions_covered

        for dimension in missing:
            static_q = self._create_static_fallback_question(survey, dimension)
            if static_q:
                questions.append(static_q)

        return questions

    def _fallback_to_static(self, survey: Survey) -> list[Question]:
        """Fall back to static question generation."""
        return self.static_generator.generate_survey(survey.id)

    def _parse_question_type(self, value: str) -> QuestionType:
        """Parse question type string to enum."""
        value = str(value).lower().strip()
        try:
            return QuestionType(value)
        except ValueError:
            return QuestionType.LIKERT_5

    def _parse_options(self, response_data: dict, question_type: QuestionType) -> dict:
        """Parse custom options from LLM response."""
        options = response_data.get("options", [])
        option_labels = response_data.get("option_labels", {})

        # Build options dict
        result = {
            "choices": options if isinstance(options, list) else [],
            "low_label": option_labels.get("low_label", ""),
            "high_label": option_labels.get("high_label", ""),
        }

        # Ensure we have appropriate defaults based on question type
        if not result["choices"]:
            if question_type == QuestionType.LIKERT_5:
                result["choices"] = [
                    "Strongly disagree",
                    "Disagree",
                    "Neutral",
                    "Agree",
                    "Strongly agree",
                ]
            elif question_type == QuestionType.LIKERT_7:
                result["choices"] = [
                    "Strongly disagree",
                    "Disagree",
                    "Somewhat disagree",
                    "Neutral",
                    "Somewhat agree",
                    "Agree",
                    "Strongly agree",
                ]

        if question_type == QuestionType.PERCENTAGE_SLIDER:
            if not result["low_label"]:
                result["low_label"] = "0%"
            if not result["high_label"]:
                result["high_label"] = "100%"

        return result

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


async def warmup_cache_for_occupations(
    db: Session,
    occupation_ids: list[str],
) -> dict[str, Any]:
    """Pre-warm the question cache for multiple occupations.

    This function enriches tasks and generates questions for common tasks
    across the specified occupations, populating the cache.

    Args:
        db: Database session
        occupation_ids: List of occupation IDs to warm cache for

    Returns:
        Statistics about the warmup operation
    """
    service = QuestionGenerationService(db)
    task_service = TaskEnrichmentService(db)

    stats = {
        "occupations_processed": 0,
        "tasks_enriched": 0,
        "questions_cached": 0,
        "errors": [],
    }

    for occ_id in occupation_ids:
        try:
            # Enrich tasks
            enriched = await task_service.enrich_tasks_for_occupation(occ_id)
            stats["tasks_enriched"] += len(enriched)

            # Generate questions (which populates cache)
            # We need a survey to generate questions, so this is limited
            stats["occupations_processed"] += 1

        except Exception as e:
            stats["errors"].append({
                "occupation_id": occ_id,
                "error": str(e),
            })

    return stats
