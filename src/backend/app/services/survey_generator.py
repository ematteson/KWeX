"""Survey generation service - maps occupation tasks to survey questions.

This service implements the core KWeX survey engine that:
1. Pulls occupation tasks from Faethm (or mock data)
2. Maps tasks to friction signals
3. Generates survey questions covering 6 friction dimensions
4. Targets < 7 minute completion time (15-20 questions max)
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.models import (
    FrictionSignal,
    FrictionType,
    MetricType,
    Occupation,
    Question,
    QuestionType,
    Severity,
    Survey,
    SurveyStatus,
    Task,
    TaskCategory,
)
from app.services.faethm_client import FaethmClient


# Question templates for each friction dimension
# Each template maps to specific Core 4 metrics
QUESTION_TEMPLATES = {
    FrictionType.CLARITY: [
        {
            "text": "How clear are the requirements and expectations for your key tasks?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FLOW, MetricType.FRICTION],
            "core": True,
        },
        {
            "text": "How often do you have to seek clarification on what needs to be done?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": False,
        },
        {
            "text": "How well do you understand the priorities among your tasks?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FLOW],
            "core": False,
        },
    ],
    FrictionType.TOOLING: [
        {
            "text": "How much do your tools and systems help vs. hinder your work?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": True,
        },
        {
            "text": "How often do technical issues or tool problems slow down your work?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": False,
        },
        {
            "text": "How easy is it to find the information you need in your systems?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FLOW, MetricType.FRICTION],
            "core": False,
        },
    ],
    FrictionType.PROCESS: [
        {
            "text": "How often do unclear processes slow down your work?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": True,
        },
        {
            "text": "How streamlined are the workflows for your regular tasks?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FLOW],
            "core": False,
        },
        {
            "text": "How much time do you spend navigating bureaucracy or approvals?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": False,
        },
    ],
    FrictionType.REWORK: [
        {
            "text": "How often do you have to redo work due to changing requirements?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION, MetricType.SAFETY],
            "core": True,
        },
        {
            "text": "How often does your work require significant revisions after review?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.SAFETY],
            "core": False,
        },
        {
            "text": "How often do quality issues require rework before delivery?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.SAFETY],
            "core": False,
        },
    ],
    FrictionType.DELAY: [
        {
            "text": "How much of your time is spent waiting on others to proceed?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION, MetricType.FLOW],
            "core": True,
        },
        {
            "text": "How often do dependencies on other teams delay your work?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FRICTION],
            "core": False,
        },
        {
            "text": "How quickly can you get decisions when you need them?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.FLOW],
            "core": False,
        },
    ],
    # VOICE dimension - measures behavioral indicators of speak-up culture
    # (Psychological safety proper is measured via separate dedicated assessment)
    FrictionType.SAFETY: [
        {
            "text": "When issues or blockers arise, how quickly are they typically raised with the team?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.SAFETY, MetricType.FRICTION],
            "core": True,
            "options": {"low_label": "Often delayed or not raised", "high_label": "Raised immediately"},
        },
        {
            "text": "When someone makes a mistake, how constructively is it typically addressed?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.SAFETY],
            "core": False,
            "options": {"low_label": "Blame-focused", "high_label": "Learning-focused"},
        },
        {
            "text": "How often do you see problems or inefficiencies that aren't being discussed openly?",
            "type": QuestionType.LIKERT_5,
            "metrics": [MetricType.SAFETY, MetricType.FRICTION],
            "core": False,
            "options": {"low_label": "Very often", "high_label": "Rarely or never"},
        },
    ],
}

# Flow-specific throughput questions
FLOW_QUESTIONS = [
    {
        "text": "In a typical week, how much of your planned work do you complete?",
        "type": QuestionType.LIKERT_5,
        "dimension": FrictionType.CLARITY,  # Maps to general flow
        "metrics": [MetricType.FLOW],
        "core": True,
    },
    {
        "text": "How often are you able to work without significant blockers?",
        "type": QuestionType.LIKERT_5,
        "dimension": FrictionType.DELAY,
        "metrics": [MetricType.FLOW],
        "core": True,
    },
    {
        "text": "How consistently are you able to deliver value in your role?",
        "type": QuestionType.LIKERT_5,
        "dimension": FrictionType.CLARITY,
        "metrics": [MetricType.FLOW],
        "core": False,
    },
]

# Portfolio Balance questions
PORTFOLIO_QUESTIONS = [
    {
        "text": "What percentage of your time is spent on operational/maintenance work?",
        "type": QuestionType.PERCENTAGE_SLIDER,
        "dimension": FrictionType.PROCESS,
        "metrics": [MetricType.PORTFOLIO_BALANCE],
        "core": True,
    },
    {
        "text": "What percentage of your time is spent on new initiatives or improvements?",
        "type": QuestionType.PERCENTAGE_SLIDER,
        "dimension": FrictionType.PROCESS,
        "metrics": [MetricType.PORTFOLIO_BALANCE],
        "core": True,
    },
    {
        "text": "Do you have enough time for strategic vs. tactical work?",
        "type": QuestionType.LIKERT_5,
        "dimension": FrictionType.PROCESS,
        "metrics": [MetricType.PORTFOLIO_BALANCE, MetricType.FLOW],
        "core": False,
    },
]


class SurveyGenerator:
    """Generates KWeX surveys from occupation tasks."""

    def __init__(self, db: Session):
        self.db = db
        self.faethm_client = FaethmClient()

    def generate_survey(
        self,
        survey: Survey,
        max_questions: int = 18,
        include_all_core: bool = True,
    ) -> list[Question]:
        """
        Generate questions for a survey based on its occupation.

        Args:
            survey: The survey to generate questions for
            max_questions: Maximum number of questions (target: 15-18 for < 7 min)
            include_all_core: Always include core questions for each dimension

        Returns:
            List of Question objects created for the survey
        """
        occupation = survey.occupation
        if not occupation:
            raise ValueError("Survey must have an associated occupation")

        questions = []
        question_order = 0

        # 1. Add core Flow questions (2-3)
        for flow_q in FLOW_QUESTIONS:
            if flow_q["core"] or len(questions) < max_questions:
                question = self._create_question(
                    survey_id=survey.id,
                    text=flow_q["text"],
                    question_type=flow_q["type"],
                    dimension=flow_q["dimension"],
                    metrics=flow_q["metrics"],
                    order=question_order,
                )
                questions.append(question)
                question_order += 1
                if len(questions) >= max_questions:
                    break

        # 2. Add core questions for each friction dimension (6 core)
        for friction_type, templates in QUESTION_TEMPLATES.items():
            for template in templates:
                if template["core"]:
                    question = self._create_question(
                        survey_id=survey.id,
                        text=template["text"],
                        question_type=template["type"],
                        dimension=friction_type,
                        metrics=template["metrics"],
                        order=question_order,
                    )
                    questions.append(question)
                    question_order += 1

                if len(questions) >= max_questions:
                    break
            if len(questions) >= max_questions:
                break

        # 3. Add Portfolio Balance questions (2-3)
        for pf_q in PORTFOLIO_QUESTIONS:
            if pf_q["core"] or len(questions) < max_questions:
                question = self._create_question(
                    survey_id=survey.id,
                    text=pf_q["text"],
                    question_type=pf_q["type"],
                    dimension=pf_q["dimension"],
                    metrics=pf_q["metrics"],
                    order=question_order,
                )
                questions.append(question)
                question_order += 1
                if len(questions) >= max_questions:
                    break

        # 4. Fill remaining slots with non-core questions if space allows
        if len(questions) < max_questions:
            remaining_slots = max_questions - len(questions)
            non_core_questions = self._get_non_core_questions(survey.id, question_order)
            for q in non_core_questions[:remaining_slots]:
                questions.append(q)

        # Save all questions to database
        for q in questions:
            self.db.add(q)
        self.db.commit()

        return questions

    def generate_survey_from_tasks(
        self,
        survey: Survey,
        include_task_specific: bool = True,
        max_questions: int = 18,
    ) -> list[Question]:
        """
        Generate survey with task-specific questions based on Faethm data.

        This method creates questions that reference specific tasks from the
        occupation's task list, making the survey more contextually relevant.

        Args:
            survey: The survey to generate questions for
            include_task_specific: Include questions tied to specific tasks
            max_questions: Maximum number of questions

        Returns:
            List of Question objects created for the survey
        """
        occupation = survey.occupation
        if not occupation:
            raise ValueError("Survey must have an associated occupation")

        # First, ensure occupation has tasks loaded from Faethm
        self._sync_occupation_tasks(occupation)

        questions = []
        question_order = 0

        # 1. Add core Flow questions
        for flow_q in FLOW_QUESTIONS:
            if flow_q["core"]:
                question = self._create_question(
                    survey_id=survey.id,
                    text=flow_q["text"],
                    question_type=flow_q["type"],
                    dimension=flow_q["dimension"],
                    metrics=flow_q["metrics"],
                    order=question_order,
                )
                questions.append(question)
                question_order += 1

        # 2. Add task-specific friction questions for CORE tasks
        if include_task_specific and occupation.tasks:
            core_tasks = [t for t in occupation.tasks if t.category == TaskCategory.CORE]
            for task in core_tasks[:3]:  # Limit to top 3 core tasks
                # Add a clarity question for this task
                question = self._create_question(
                    survey_id=survey.id,
                    text=f"How clear are the requirements for: {task.name}?",
                    question_type=QuestionType.LIKERT_5,
                    dimension=FrictionType.CLARITY,
                    metrics=[MetricType.FLOW, MetricType.FRICTION],
                    order=question_order,
                    task_id=task.id,
                )
                questions.append(question)
                question_order += 1

                if len(questions) >= max_questions:
                    break

        # 3. Add core friction dimension questions
        for friction_type, templates in QUESTION_TEMPLATES.items():
            for template in templates:
                if template["core"] and len(questions) < max_questions:
                    question = self._create_question(
                        survey_id=survey.id,
                        text=template["text"],
                        question_type=template["type"],
                        dimension=friction_type,
                        metrics=template["metrics"],
                        order=question_order,
                    )
                    questions.append(question)
                    question_order += 1

        # 4. Add Portfolio Balance questions
        for pf_q in PORTFOLIO_QUESTIONS:
            if pf_q["core"] and len(questions) < max_questions:
                question = self._create_question(
                    survey_id=survey.id,
                    text=pf_q["text"],
                    question_type=pf_q["type"],
                    dimension=pf_q["dimension"],
                    metrics=pf_q["metrics"],
                    order=question_order,
                )
                questions.append(question)
                question_order += 1

        # Save all questions
        for q in questions:
            self.db.add(q)
        self.db.commit()

        return questions

    def _create_question(
        self,
        survey_id: str,
        text: str,
        question_type: QuestionType,
        dimension: FrictionType,
        metrics: list[MetricType],
        order: int,
        task_id: str | None = None,
        friction_signal_id: str | None = None,
    ) -> Question:
        """Create a Question object without saving to DB."""
        return Question(
            survey_id=survey_id,
            task_id=task_id,
            friction_signal_id=friction_signal_id,
            dimension=dimension,
            metric_mapping=[m.value for m in metrics],
            text=text,
            type=question_type,
            order=order,
            required=True,
        )

    def _get_non_core_questions(self, survey_id: str, start_order: int) -> list[Question]:
        """Get non-core questions to fill remaining survey slots."""
        questions = []
        order = start_order

        for friction_type, templates in QUESTION_TEMPLATES.items():
            for template in templates:
                if not template["core"]:
                    question = self._create_question(
                        survey_id=survey_id,
                        text=template["text"],
                        question_type=template["type"],
                        dimension=friction_type,
                        metrics=template["metrics"],
                        order=order,
                    )
                    questions.append(question)
                    order += 1

        # Add non-core flow and portfolio questions
        for q_list in [FLOW_QUESTIONS, PORTFOLIO_QUESTIONS]:
            for template in q_list:
                if not template["core"]:
                    question = self._create_question(
                        survey_id=survey_id,
                        text=template["text"],
                        question_type=template["type"],
                        dimension=template["dimension"],
                        metrics=template["metrics"],
                        order=order,
                    )
                    questions.append(question)
                    order += 1

        return questions

    def _sync_occupation_tasks(self, occupation: Occupation) -> None:
        """Ensure occupation has tasks synced from Faethm."""
        if occupation.tasks:
            return  # Already has tasks

        if not occupation.faethm_code:
            return  # Can't sync without Faethm code

        # Get tasks from Faethm
        tasks_data = self.faethm_client.get_tasks(occupation.faethm_code)

        for task_data in tasks_data:
            task = Task(
                occupation_id=occupation.id,
                faethm_task_id=task_data.get("faethm_task_id"),
                name=task_data["name"],
                description=task_data.get("description"),
                category=TaskCategory(task_data.get("category", "core")),
            )
            self.db.add(task)

        self.db.commit()
        self.db.refresh(occupation)

    def estimate_completion_time(self, question_count: int) -> int:
        """
        Estimate survey completion time in minutes.

        Based on research, average time per question:
        - Likert scale: ~15-20 seconds
        - Slider: ~10-15 seconds
        - Multiple choice: ~15-20 seconds

        We use 20 seconds average to be conservative.
        """
        avg_seconds_per_question = 20
        buffer_multiplier = 1.2  # 20% buffer for reading/thinking

        total_seconds = question_count * avg_seconds_per_question * buffer_multiplier
        return int(total_seconds / 60) + 1  # Round up to next minute


def generate_survey_questions(
    db: Session,
    survey: Survey,
    use_task_specific: bool = False,
    max_questions: int = 18,
) -> list[Question]:
    """
    Convenience function to generate survey questions.

    Args:
        db: Database session
        survey: Survey to generate questions for
        use_task_specific: Include task-specific questions from Faethm
        max_questions: Maximum number of questions (default 18 for < 7 min)

    Returns:
        List of generated Question objects
    """
    generator = SurveyGenerator(db)

    if use_task_specific:
        return generator.generate_survey_from_tasks(survey, max_questions=max_questions)
    else:
        return generator.generate_survey(survey, max_questions=max_questions)
