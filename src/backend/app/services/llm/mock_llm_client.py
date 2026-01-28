"""Mock LLM client for development and testing."""

import json
import random
import time
from typing import Any, Dict, List, Optional

from app.services.llm.base_client import BaseLLMClient, LLMMessage, LLMResponse


class MockLLMClient(BaseLLMClient):
    """Mock LLM client that returns realistic responses for development."""

    def __init__(
        self,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        super().__init__(
            model_name="mock-llm",
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def is_available(self) -> bool:
        """Mock client is always available."""
        return True

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a mock response."""
        # Simulate latency
        latency = random.randint(100, 500)
        time.sleep(latency / 1000)

        # Determine response type from prompt content
        prompt_lower = prompt.lower()

        if "enrich" in prompt_lower or "task" in prompt_lower:
            content = self._generate_task_enrichment_response()
        elif "question" in prompt_lower:
            content = self._generate_question_response()
        elif "select" in prompt_lower:
            content = self._generate_task_selection_response()
        else:
            content = "This is a mock response for development purposes."

        return LLMResponse(
            content=content,
            model=self.model_name,
            tokens_input=len(prompt.split()) * 2,
            tokens_output=len(content.split()) * 2,
            latency_ms=latency,
        )

    async def generate_chat(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a mock chat response."""
        # Combine all user messages into one prompt
        prompt = " ".join(
            msg.content for msg in messages if msg.role in ["user", "system"]
        )
        return await self.generate(prompt, temperature=temperature, max_tokens=max_tokens)

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate a mock JSON response."""
        prompt_lower = prompt.lower()

        if "enrich" in prompt_lower:
            return self._generate_mock_enriched_tasks()
        elif "select" in prompt_lower:
            return self._generate_mock_task_selection()
        elif "question" in prompt_lower:
            return self._generate_mock_questions()
        else:
            return {"mock": True, "message": "Mock JSON response"}

    def _generate_task_enrichment_response(self) -> str:
        """Generate mock task enrichment content."""
        return json.dumps(self._generate_mock_enriched_tasks(), indent=2)

    def _generate_question_response(self) -> str:
        """Generate mock question content."""
        return json.dumps(self._generate_mock_questions(), indent=2)

    def _generate_task_selection_response(self) -> str:
        """Generate mock task selection content."""
        return json.dumps(self._generate_mock_task_selection(), indent=2)

    def _generate_mock_enriched_tasks(self) -> Dict[str, Any]:
        """Generate mock enriched task data."""
        return {
            "tasks": [
                {
                    "name": "Sprint Planning",
                    "description": "Collaborative session to plan work for the upcoming sprint",
                    "category": "core",
                    "skill_requirements": [
                        "Agile methodology",
                        "Estimation",
                        "Collaboration",
                    ],
                    "complexity_level": "medium",
                    "collaboration_level": "team",
                    "typical_friction_points": [
                        {
                            "type": "clarity",
                            "description": "Unclear requirements from stakeholders",
                        },
                        {
                            "type": "delay",
                            "description": "Dependencies on other teams not resolved",
                        },
                    ],
                },
                {
                    "name": "Code Review",
                    "description": "Review and provide feedback on team members' code changes",
                    "category": "core",
                    "skill_requirements": [
                        "Code quality",
                        "Technical knowledge",
                        "Communication",
                    ],
                    "complexity_level": "medium",
                    "collaboration_level": "team",
                    "typical_friction_points": [
                        {
                            "type": "delay",
                            "description": "Long wait times for reviewers",
                        },
                        {
                            "type": "rework",
                            "description": "Multiple rounds of changes needed",
                        },
                    ],
                },
                {
                    "name": "Technical Documentation",
                    "description": "Create and maintain technical documentation",
                    "category": "support",
                    "skill_requirements": [
                        "Writing",
                        "Technical knowledge",
                        "Organization",
                    ],
                    "complexity_level": "low",
                    "collaboration_level": "individual",
                    "typical_friction_points": [
                        {
                            "type": "tooling",
                            "description": "Fragmented documentation systems",
                        },
                        {
                            "type": "process",
                            "description": "Unclear documentation standards",
                        },
                    ],
                },
                {
                    "name": "Debugging Production Issues",
                    "description": "Investigate and resolve issues in production systems",
                    "category": "core",
                    "skill_requirements": [
                        "Debugging",
                        "Systems knowledge",
                        "Problem solving",
                    ],
                    "complexity_level": "high",
                    "collaboration_level": "cross_team",
                    "typical_friction_points": [
                        {
                            "type": "tooling",
                            "description": "Limited access to production logs",
                        },
                        {
                            "type": "safety",
                            "description": "Pressure to fix quickly may lead to errors",
                        },
                    ],
                },
                {
                    "name": "Stakeholder Communication",
                    "description": "Communicate project status and technical details to stakeholders",
                    "category": "support",
                    "skill_requirements": [
                        "Communication",
                        "Presentation",
                        "Technical translation",
                    ],
                    "complexity_level": "medium",
                    "collaboration_level": "cross_team",
                    "typical_friction_points": [
                        {
                            "type": "clarity",
                            "description": "Misaligned expectations between technical and non-technical stakeholders",
                        },
                    ],
                },
            ]
        }

    def _generate_mock_task_selection(self) -> Dict[str, Any]:
        """Generate mock task selection data."""
        return {
            "selected_tasks": [
                {
                    "task_id": "task_1",
                    "name": "Sprint Planning",
                    "relevance_score": 0.95,
                    "reason": "Critical for team productivity and directly impacts flow metrics",
                },
                {
                    "task_id": "task_2",
                    "name": "Code Review",
                    "relevance_score": 0.90,
                    "reason": "Key friction point for delivery velocity",
                },
                {
                    "task_id": "task_3",
                    "name": "Debugging Production Issues",
                    "relevance_score": 0.85,
                    "reason": "High-impact activity with safety implications",
                },
                {
                    "task_id": "task_4",
                    "name": "Stakeholder Communication",
                    "relevance_score": 0.80,
                    "reason": "Affects clarity and cross-team collaboration",
                },
                {
                    "task_id": "task_5",
                    "name": "Technical Documentation",
                    "relevance_score": 0.75,
                    "reason": "Supports knowledge transfer and reduces friction",
                },
            ]
        }

    def _generate_mock_questions(self) -> Dict[str, Any]:
        """Generate mock question data for surveys."""
        questions = {
            "questions": [
                {
                    "dimension": "clarity",
                    "text": "How clearly defined are the requirements and objectives for your sprint planning sessions?",
                    "question_type": "likert_5",
                    "metric_mapping": ["flow", "friction"],
                    "quality_score": 0.88,
                },
                {
                    "dimension": "tooling",
                    "text": "How effective are your current tools for conducting code reviews?",
                    "question_type": "likert_5",
                    "metric_mapping": ["friction"],
                    "quality_score": 0.85,
                },
                {
                    "dimension": "process",
                    "text": "How well do your team's processes support efficient code review completion?",
                    "question_type": "likert_5",
                    "metric_mapping": ["friction", "flow"],
                    "quality_score": 0.82,
                },
                {
                    "dimension": "rework",
                    "text": "How often do you need to make multiple rounds of changes to documentation due to unclear standards?",
                    "question_type": "likert_5",
                    "metric_mapping": ["friction", "safety"],
                    "quality_score": 0.80,
                },
                {
                    "dimension": "delay",
                    "text": "How frequently do dependencies on other teams delay your ability to complete planned work?",
                    "question_type": "likert_5",
                    "metric_mapping": ["friction", "flow"],
                    "quality_score": 0.86,
                },
                {
                    "dimension": "safety",
                    "text": "Do you feel you have enough time to properly test production fixes before deploying them?",
                    "question_type": "likert_5",
                    "metric_mapping": ["safety"],
                    "quality_score": 0.90,
                },
            ]
        }
        return questions
