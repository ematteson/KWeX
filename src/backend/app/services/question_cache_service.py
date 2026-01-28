"""Service for managing the LLM question template cache."""

import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import (
    FrictionType,
    LLMQuestionTemplate,
    QuestionType,
)


class QuestionCacheService:
    """Service for caching and retrieving LLM-generated question templates."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def generate_task_signature(
        self,
        category: str,
        skills: list[str],
        complexity: str,
        collaboration: str,
    ) -> str:
        """Generate a unique signature for a task based on its characteristics.

        This signature is used as the cache key to allow question reuse across
        similar tasks in different occupations.

        Args:
            category: Task category (core, support, admin)
            skills: List of required skills
            complexity: Complexity level (low, medium, high)
            collaboration: Collaboration level (individual, team, cross_team)

        Returns:
            A hash string that uniquely identifies tasks with these characteristics.
        """
        # Normalize inputs
        category_norm = str(category).lower().strip()
        complexity_norm = str(complexity).lower().strip()
        collaboration_norm = str(collaboration).lower().strip()

        # Sort skills for consistent ordering
        skills_norm = sorted([s.lower().strip() for s in skills if s])

        # Create the signature components
        components = [
            f"cat:{category_norm}",
            f"skills:{','.join(skills_norm)}",
            f"comp:{complexity_norm}",
            f"collab:{collaboration_norm}",
        ]

        # Create a hash of the combined signature
        signature_str = "|".join(components)
        return hashlib.sha256(signature_str.encode()).hexdigest()[:32]

    def get_cached_template(
        self,
        task_signature: str,
        dimension: FrictionType,
    ) -> Optional[LLMQuestionTemplate]:
        """Look up a cached question template by task signature and dimension.

        Args:
            task_signature: The task signature (cache key)
            dimension: The friction dimension for the question

        Returns:
            The cached template if found and meets quality threshold, None otherwise.
        """
        template = self.db.query(LLMQuestionTemplate).filter(
            and_(
                LLMQuestionTemplate.task_signature == task_signature,
                LLMQuestionTemplate.dimension == dimension,
                LLMQuestionTemplate.quality_score >= self.settings.question_cache_min_quality,
            )
        ).first()

        if template:
            # Update usage statistics
            template.usage_count += 1
            template.last_used_at = datetime.utcnow()
            self.db.commit()

        return template

    def get_cached_templates_for_task(
        self,
        task_signature: str,
    ) -> list[LLMQuestionTemplate]:
        """Get all cached templates for a task signature.

        Args:
            task_signature: The task signature (cache key)

        Returns:
            List of all cached templates for this signature.
        """
        return self.db.query(LLMQuestionTemplate).filter(
            and_(
                LLMQuestionTemplate.task_signature == task_signature,
                LLMQuestionTemplate.quality_score >= self.settings.question_cache_min_quality,
            )
        ).all()

    def cache_template(
        self,
        task_signature: str,
        dimension: FrictionType,
        question_text: str,
        question_type: QuestionType,
        metric_mapping: list[str],
        model_used: str,
        quality_score: float = 0.8,
        prompt_version: str = "1.0",
        options: Optional[dict] = None,
    ) -> LLMQuestionTemplate:
        """Cache a new question template.

        Args:
            task_signature: The task signature (cache key)
            dimension: The friction dimension
            question_text: The generated question text
            question_type: The question type (likert_5, etc.)
            metric_mapping: List of metrics this question maps to
            model_used: The LLM model that generated this question
            quality_score: Quality score for this question (0-1)
            prompt_version: Version of the prompt used
            options: Custom answer options for the question

        Returns:
            The newly created template.
        """
        # Check if template already exists
        existing = self.db.query(LLMQuestionTemplate).filter(
            and_(
                LLMQuestionTemplate.task_signature == task_signature,
                LLMQuestionTemplate.dimension == dimension,
            )
        ).first()

        if existing:
            # Update existing template if new one is higher quality
            if quality_score > existing.quality_score:
                existing.question_text = question_text
                existing.question_type = question_type
                existing.metric_mapping = metric_mapping
                existing.options = options
                existing.model_used = model_used
                existing.quality_score = quality_score
                existing.prompt_version = prompt_version
                existing.version += 1
                self.db.commit()
                self.db.refresh(existing)
            return existing

        # Create new template
        template = LLMQuestionTemplate(
            task_signature=task_signature,
            dimension=dimension,
            question_text=question_text,
            question_type=question_type,
            options=options,
            metric_mapping=metric_mapping,
            model_used=model_used,
            quality_score=quality_score,
            prompt_version=prompt_version,
            usage_count=0,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        return template

    def get_cache_stats(self) -> dict:
        """Get statistics about the question cache.

        Returns:
            Dictionary with cache statistics.
        """
        total_templates = self.db.query(LLMQuestionTemplate).count()

        # Get breakdown by dimension
        dimension_counts = {}
        for dimension in FrictionType:
            count = self.db.query(LLMQuestionTemplate).filter(
                LLMQuestionTemplate.dimension == dimension
            ).count()
            dimension_counts[dimension.value] = count

        # Get average quality score
        templates = self.db.query(LLMQuestionTemplate).all()
        avg_quality = (
            sum(t.quality_score for t in templates) / len(templates)
            if templates
            else 0.0
        )

        # Get total usage count
        total_usage = sum(t.usage_count for t in templates)

        # Get unique signatures
        unique_signatures = self.db.query(
            LLMQuestionTemplate.task_signature
        ).distinct().count()

        return {
            "total_templates": total_templates,
            "unique_task_signatures": unique_signatures,
            "dimension_breakdown": dimension_counts,
            "average_quality_score": round(avg_quality, 3),
            "total_usage_count": total_usage,
            "cache_hit_potential": (
                f"{unique_signatures} signatures can serve multiple occupations"
            ),
        }

    def warmup_cache_for_dimensions(
        self,
        task_signature: str,
        dimensions: list[FrictionType],
    ) -> dict[str, Optional[LLMQuestionTemplate]]:
        """Pre-check cache for multiple dimensions at once.

        Args:
            task_signature: The task signature to check
            dimensions: List of dimensions to look up

        Returns:
            Dictionary mapping dimension value to template (or None if not cached)
        """
        result = {}
        for dimension in dimensions:
            template = self.get_cached_template(task_signature, dimension)
            result[dimension.value] = template
        return result

    def invalidate_low_quality_templates(
        self,
        quality_threshold: float = 0.5,
    ) -> int:
        """Remove templates below a quality threshold.

        Args:
            quality_threshold: Templates below this score will be removed

        Returns:
            Number of templates removed.
        """
        low_quality = self.db.query(LLMQuestionTemplate).filter(
            LLMQuestionTemplate.quality_score < quality_threshold
        ).all()

        count = len(low_quality)
        for template in low_quality:
            self.db.delete(template)

        self.db.commit()
        return count
