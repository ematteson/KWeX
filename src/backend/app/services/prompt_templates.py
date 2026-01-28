"""Centralized prompt templates for LLM operations."""

from typing import List, Optional, Union

PROMPT_VERSION = "1.1"  # Added custom answer options


TASK_ENRICHMENT_SYSTEM_PROMPT = """You are an expert in workforce analytics and knowledge work optimization.
Your role is to enrich task data with detailed information that helps measure and improve knowledge worker productivity.

You understand the KWeX framework which measures:
- Flow: Value-adding work completion and throughput
- Friction: Workflow inefficiencies (clarity, tooling, process, rework, delays)
- Safety: Risk/quality impact and psychological safety
- Portfolio Balance: Distribution of "run" vs "change" work

When enriching tasks, consider:
1. What skills are typically required to perform this task effectively
2. How complex the task is (low/medium/high)
3. What level of collaboration is needed (individual/team/cross-team)
4. What friction points typically occur when performing this task

Be specific and practical. Base your analysis on common patterns in modern knowledge work environments."""


TASK_ENRICHMENT_PROMPT = """Given the following occupation and tasks, enrich each task with additional context.

Occupation: {occupation_name}
Description: {occupation_description}

Current Tasks:
{tasks_list}

For each task, provide:
1. Enhanced description (if the current one is lacking)
2. Required skills (3-5 specific skills)
3. Complexity level: low, medium, or high
4. Collaboration level: individual, team, or cross_team
5. Typical friction points (2-3 specific issues that often occur)

Respond with a JSON object containing a "tasks" array where each task has:
- name: string
- description: string
- category: "core" | "support" | "admin"
- skill_requirements: string[]
- complexity_level: "low" | "medium" | "high"
- collaboration_level: "individual" | "team" | "cross_team"
- typical_friction_points: array of {{type: string, description: string}}

The friction point types should be one of: clarity, tooling, process, rework, delay, safety"""


TASK_GAP_FILLING_SYSTEM_PROMPT = """You are an expert in workforce analytics who understands the typical tasks
performed by knowledge workers in various occupations.

When tasks are missing or incomplete, you should generate realistic tasks based on:
1. Industry standards and best practices
2. Common workflows for the occupation
3. A balanced mix of core work, support activities, and administrative tasks

Focus on tasks that have measurable impact on productivity and where friction can be observed and improved."""


TASK_GAP_FILLING_PROMPT = """The following occupation has {existing_count} tasks defined, but we need at least 5
representative tasks for effective measurement.

Occupation: {occupation_name}
Description: {occupation_description}

Existing Tasks:
{existing_tasks}

Generate {needed_count} additional tasks that are:
1. Representative of the occupation's core work
2. Measurable in terms of productivity and friction
3. Different from the existing tasks
4. A mix of categories (core, support, admin)

Respond with a JSON object containing a "tasks" array where each task has:
- name: string
- description: string
- category: "core" | "support" | "admin"
- skill_requirements: string[]
- complexity_level: "low" | "medium" | "high"
- collaboration_level: "individual" | "team" | "cross_team"
- typical_friction_points: array of {{type: string, description: string}}"""


TASK_SELECTION_SYSTEM_PROMPT = """You are an expert in survey design and knowledge worker productivity measurement.
Your role is to select the most relevant tasks for a productivity survey.

Selection criteria:
1. Tasks that have the most impact on overall productivity
2. Tasks where friction is measurable and actionable
3. A balanced representation of task categories
4. Tasks that align with the KWeX measurement dimensions (Flow, Friction, Safety, Portfolio)

Prioritize tasks that, if improved, would have the greatest positive impact on the worker's experience and output."""


TASK_SELECTION_PROMPT = """Select the {count} most relevant tasks for a KWeX productivity survey.

Occupation: {occupation_name}

Available Tasks:
{tasks_list}

Select tasks that will provide the most valuable insights into productivity and friction.
Consider coverage across different categories and friction types.

Respond with a JSON object containing a "selected_tasks" array where each item has:
- task_id: string (the ID from the input list)
- name: string
- relevance_score: number (0-1, how relevant for measurement)
- reason: string (brief explanation for selection)

Order by relevance_score descending."""


QUESTION_GENERATION_SYSTEM_PROMPT = """You are an expert in survey design for knowledge worker productivity measurement.
Your role is to generate high-quality survey questions with contextually appropriate answer options.

You measure the KWeX dimensions:
1. **Flow**: How effectively work moves through the system
2. **Friction**: Sources of inefficiency (clarity, tooling, process, rework, delays, safety)
3. **Safety**: Quality risks and psychological safety
4. **Portfolio Balance**: Run vs Change work allocation

Question design principles:
- Questions should be specific and actionable (not vague or abstract)
- Questions should measure one thing at a time
- Questions should be neutral (not leading)
- Questions should relate directly to the task context provided
- Avoid double-barreled questions (asking about two things at once)

Answer option design principles:
- Options should be specific to the question context
- Use concrete, measurable language (not generic "Agree/Disagree")
- Options should form a clear progression from negative to positive
- For frequency questions, use time-based options (Never, Rarely, Sometimes, Often, Always)
- For quality questions, use descriptive options specific to the domain"""


QUESTION_GENERATION_PROMPT = """Generate a survey question for the following context:

Task: {task_name}
Task Description: {task_description}
Friction Dimension: {dimension}
Typical Friction Points: {friction_points}

The question should measure the "{dimension}" dimension as it relates to this task.

Dimension meanings:
- clarity: Clear requirements, objectives, and expectations
- tooling: Effectiveness and availability of tools and systems
- process: How well processes support efficient work
- rework: Frequency of redoing work due to issues
- delay: Waiting times and blocked work
- safety: Quality risks and ability to raise concerns

Respond with a JSON object containing:
- dimension: string
- text: string (the question text, under 150 characters)
- question_type: "likert_5" | "likert_7" | "percentage_slider"
- options: string[] (5 or 7 custom answer options from negative to positive, contextual to the question)
- option_labels: object with "low_label" and "high_label" keys for slider endpoints
- metric_mapping: string[] (which metrics this question maps to: "flow", "friction", "safety", "portfolio_balance")
- quality_score: number (0-1, your confidence in this question's effectiveness)

Example options for different question types:
- Frequency: ["Never", "Rarely (monthly)", "Sometimes (weekly)", "Often (daily)", "Always"]
- Quality: ["Very poor - constant issues", "Below average", "Adequate", "Good", "Excellent - no issues"]
- Clarity: ["Completely unclear", "Mostly unclear", "Somewhat clear", "Mostly clear", "Crystal clear"]"""


FLOW_QUESTIONS_PROMPT = """Generate {count} survey questions to measure the Flow dimension (throughput and value delivery).

Occupation: {occupation_name}
Selected Tasks: {task_names}

Flow questions should measure:
- Ability to complete valuable work
- Work throughput and velocity
- Time spent on value-adding activities
- Ability to maintain focus

Respond with a JSON object containing a "questions" array where each question has:
- dimension: "clarity" (used as proxy for flow questions)
- text: string (question text)
- question_type: "likert_5" | "percentage_slider"
- options: string[] (5 custom answer options from negative to positive, specific to the question)
- option_labels: object with "low_label" and "high_label" keys (for sliders: e.g., "0% of time", "100% of time")
- metric_mapping: ["flow"]
- quality_score: number (0-1)

Make options specific and measurable, not generic agree/disagree scales."""


PORTFOLIO_QUESTIONS_PROMPT = """Generate {count} survey questions to measure Portfolio Balance (run vs change work distribution).

Occupation: {occupation_name}
Ideal Run Percentage: {ideal_run}%
Ideal Change Percentage: {ideal_change}%

Portfolio questions should measure:
- Time spent on maintenance/operations (run) vs new development/improvements (change)
- Alignment of actual work distribution with ideal distribution
- Ability to balance different types of work

Respond with a JSON object containing a "questions" array where each question has:
- dimension: "process" (used as proxy for portfolio questions)
- text: string (question text)
- question_type: "percentage_slider" | "likert_5"
- options: string[] (for likert: 5 custom options; for slider: can be empty)
- option_labels: object with "low_label" and "high_label" keys (e.g., "All maintenance (run)", "All new work (change)")
- metric_mapping: ["portfolio_balance"]
- quality_score: number (0-1)

For percentage sliders, provide meaningful endpoint labels that relate to the question."""


def format_tasks_for_prompt(tasks: list) -> str:
    """Format a list of tasks for inclusion in a prompt."""
    if not tasks:
        return "No tasks defined yet."

    lines = []
    for i, task in enumerate(tasks, 1):
        task_dict = task if isinstance(task, dict) else task.__dict__
        name = task_dict.get("name", "Unknown")
        desc = task_dict.get("description", "No description")
        category = task_dict.get("category", "core")

        # Handle enum values
        if hasattr(category, "value"):
            category = category.value

        lines.append(f"{i}. {name} ({category})")
        lines.append(f"   Description: {desc}")

        # Include ID if available
        task_id = task_dict.get("id")
        if task_id:
            lines.append(f"   ID: {task_id}")

        lines.append("")

    return "\n".join(lines)


def format_friction_points_for_prompt(friction_points: Optional[List]) -> str:
    """Format friction points for inclusion in a prompt."""
    if not friction_points:
        return "No specific friction points identified."

    lines = []
    for fp in friction_points:
        if isinstance(fp, dict):
            fp_type = fp.get("type", "unknown")
            fp_desc = fp.get("description", "")
            lines.append(f"- {fp_type}: {fp_desc}")
        else:
            lines.append(f"- {fp}")

    return "\n".join(lines)
