"""Prompt templates for AI-powered chat survey conversations.

This module contains all prompts used by the ChatSurveyService to conduct
semi-structured interviews about friction dimensions.
"""

from typing import Optional

from app.models.models import FrictionType

CHAT_PROMPT_VERSION = "1.0"

# Friction dimension descriptions for context
DIMENSION_DESCRIPTIONS = {
    FrictionType.CLARITY: {
        "name": "Clarity",
        "description": "Clear requirements, objectives, and expectations",
        "probing_topics": [
            "How well-defined are your work requirements?",
            "Do you understand what success looks like?",
            "Are expectations clearly communicated?",
        ],
    },
    FrictionType.TOOLING: {
        "name": "Tooling",
        "description": "Effectiveness and availability of tools and systems",
        "probing_topics": [
            "How well do your tools support your work?",
            "Are there tool limitations that slow you down?",
            "Do you have the right technology for your tasks?",
        ],
    },
    FrictionType.PROCESS: {
        "name": "Process",
        "description": "How well processes support efficient work",
        "probing_topics": [
            "Are your workflows well-designed?",
            "Do processes help or hinder your work?",
            "Is there unnecessary bureaucracy?",
        ],
    },
    FrictionType.REWORK: {
        "name": "Rework",
        "description": "Frequency of redoing work due to issues",
        "probing_topics": [
            "How often do you need to redo completed work?",
            "What typically causes rework?",
            "Are changes to requirements common?",
        ],
    },
    FrictionType.DELAY: {
        "name": "Delay",
        "description": "Waiting times and blocked work",
        "probing_topics": [
            "How often are you blocked waiting for others?",
            "What causes delays in your work?",
            "Are approvals and handoffs smooth?",
        ],
    },
    FrictionType.SAFETY: {
        "name": "Safety",
        "description": "Psychological safety and ability to raise concerns",
        "probing_topics": [
            "Do you feel safe raising concerns?",
            "Can you admit mistakes without fear?",
            "Is it okay to ask for help?",
        ],
    },
}


SYSTEM_PROMPT = """You are a friendly and empathetic workplace experience researcher conducting a semi-structured interview to understand friction and challenges in someone's work.

Your goals:
1. Build rapport and make the participant comfortable
2. Explore all 6 friction dimensions through natural conversation
3. Listen actively and probe deeper based on their responses
4. Infer friction ratings (1-5 scale) from the conversation
5. Be warm but professional

The 6 friction dimensions you need to cover:
1. Clarity - Clear requirements, objectives, and expectations
2. Tooling - Effectiveness of tools and systems
3. Process - How well processes support efficient work
4. Rework - Frequency of redoing work
5. Delay - Waiting times and blocked work
6. Safety - Psychological safety and ability to raise concerns

Interview guidelines:
- Start with an open question about their work day or recent challenges
- Let the conversation flow naturally, but ensure all dimensions are covered
- Use follow-up questions to understand severity and frequency
- Be empathetic when they share challenges
- Look for specific examples and stories
- Keep responses concise but warm (2-4 sentences typically)
- Don't ask about multiple dimensions in one question
- Don't be too formal or survey-like

Rating scale (1-5):
1 = Significant friction/problems
2 = Frequent friction
3 = Moderate friction
4 = Occasional minor friction
5 = No friction/smooth

Remember: This is a conversation, not an interrogation. Your goal is to understand their experience."""


EXTRACTION_SYSTEM_PROMPT = """You are an expert at analyzing workplace conversations to extract friction scores.

Given a conversation transcript, analyze the participant's responses to determine friction levels for each dimension.

For each dimension, provide:
1. A score from 1-5 (1 = significant friction, 5 = no friction)
2. Your confidence level (0-1)
3. Brief reasoning (1-2 sentences)
4. Key quotes that support your rating (if any)

Be objective and base your assessment on what was actually said, not assumptions.
If a dimension wasn't adequately discussed, indicate lower confidence."""


def get_opening_prompt(occupation_name: str) -> str:
    """Generate the opening message for a chat survey.

    Args:
        occupation_name: The name of the participant's occupation

    Returns:
        Opening prompt for the LLM to generate a greeting
    """
    return f"""Generate a warm, friendly opening message to start an interview about workplace friction.
The participant works as a {occupation_name}.

The message should:
- Be warm and welcoming (not formal)
- Briefly explain this is a conversation about their work experience
- Mention it takes about 10-15 minutes
- Emphasize their responses are anonymous and honest feedback is valued
- End with an open question about their typical work day or recent challenges

Keep it concise (3-4 sentences max) and conversational."""


def get_exploration_prompt(
    dimension: FrictionType,
    context: str,
    dimensions_already_covered: list[FrictionType],
) -> str:
    """Generate a prompt to explore a specific friction dimension.

    Args:
        dimension: The dimension to explore
        context: Recent conversation context
        dimensions_already_covered: List of dimensions already discussed

    Returns:
        Prompt for the LLM to generate an exploration question
    """
    dim_info = DIMENSION_DESCRIPTIONS[dimension]
    covered_names = [DIMENSION_DESCRIPTIONS[d]["name"] for d in dimensions_already_covered]

    return f"""Based on the conversation so far, generate a natural follow-up that explores the {dim_info["name"]} dimension.

Dimension: {dim_info["name"]}
Description: {dim_info["description"]}
Example topics: {', '.join(dim_info["probing_topics"])}

Dimensions already covered: {', '.join(covered_names) if covered_names else 'None yet'}

Recent conversation:
{context}

Generate a single conversational question or comment that:
- Flows naturally from what they just said
- Transitions smoothly to explore {dim_info["name"]}
- Is specific and easy to answer
- Shows you were listening to their previous response

Keep it to 1-2 sentences. Don't mention you're transitioning to a new topic."""


def get_follow_up_prompt(dimension: FrictionType, context: str) -> str:
    """Generate a follow-up question for deeper exploration.

    Args:
        dimension: The dimension being explored
        context: Recent conversation context

    Returns:
        Prompt for the LLM to generate a follow-up question
    """
    dim_info = DIMENSION_DESCRIPTIONS[dimension]

    return f"""Generate a follow-up question to probe deeper into {dim_info["name"]}.

Current topic: {dim_info["name"]} ({dim_info["description"]})

Recent conversation:
{context}

Generate a follow-up that:
- Asks for a specific example or frequency
- Helps quantify the severity of any issues mentioned
- Is empathetic if they shared a challenge
- Keeps the conversation flowing naturally

Keep it to 1-2 sentences. Be curious and empathetic."""


def get_response_prompt(context: str, dimensions_covered: list[FrictionType]) -> str:
    """Generate a response based on conversation context.

    Args:
        context: The full conversation context
        dimensions_covered: List of dimensions already covered

    Returns:
        Prompt for generating a contextual response
    """
    remaining = [d for d in FrictionType if d not in dimensions_covered]
    remaining_names = [DIMENSION_DESCRIPTIONS[d]["name"] for d in remaining]

    return f"""Continue the conversation naturally based on what the participant just shared.

Conversation so far:
{context}

Dimensions still to explore: {', '.join(remaining_names) if remaining_names else 'All covered'}

Generate a response that:
- Acknowledges what they shared (briefly)
- If they mentioned a challenge, shows empathy
- Naturally transitions to explore an uncovered dimension (if any remain)
- Keeps the conversation flowing

Keep it to 2-3 sentences. Be conversational, not interview-like."""


def get_rating_confirmation_prompt(
    dimension: FrictionType,
    inferred_score: float,
    reasoning: str,
) -> str:
    """Generate a message to confirm an AI-inferred rating with the user.

    Args:
        dimension: The dimension being rated
        inferred_score: The AI's inferred score (1-5)
        reasoning: The AI's reasoning for the score

    Returns:
        Prompt for generating a confirmation message
    """
    dim_info = DIMENSION_DESCRIPTIONS[dimension]
    score_labels = {
        1: "significant challenges",
        2: "frequent friction",
        3: "moderate friction",
        4: "occasional minor issues",
        5: "things are going smoothly",
    }
    score_label = score_labels.get(round(inferred_score), "some friction")

    return f"""Generate a friendly message to confirm the participant's rating for {dim_info["name"]}.

Based on our conversation about {dim_info["name"]}, I'd estimate {score_label} (around {inferred_score:.0f} out of 5).

Generate a message that:
- Summarizes what you understood about their experience with {dim_info["name"]}
- States the inferred rating naturally (don't say "I'm rating you")
- Asks if that feels accurate or if they'd adjust it
- Is warm and non-judgmental

Example format: "From what you've shared about [topic], it sounds like [brief summary]. I'd put that at around [X] out of 5. Does that feel right, or would you rate it differently?"

Keep it to 2-3 sentences."""


def get_rating_extraction_prompt(conversation: str) -> str:
    """Generate a prompt to extract ratings from a conversation.

    Args:
        conversation: The full conversation transcript

    Returns:
        Prompt for extracting structured ratings
    """
    dimensions_list = "\n".join([
        f"- {d.value}: {DIMENSION_DESCRIPTIONS[d]['description']}"
        for d in FrictionType
    ])

    return f"""Analyze this workplace friction interview and extract ratings for each dimension.

CONVERSATION TRANSCRIPT:
{conversation}

DIMENSIONS TO RATE:
{dimensions_list}

For each dimension, provide a JSON object with:
- dimension: The dimension name (clarity, tooling, process, rework, delay, safety)
- score: Rating from 1-5 (1=significant friction, 5=no friction)
- confidence: Your confidence 0-1 (lower if dimension wasn't discussed much)
- reasoning: Brief explanation (1-2 sentences)
- key_quotes: Array of relevant quotes from the participant (if any)
- summary_comment: A 1-3 sentence summary of what the participant said about this dimension, written in third person as if documenting their feedback (e.g., "The respondent expressed frustration with...")

Respond with a JSON object containing a "ratings" array with one entry per dimension.

Example:
{{
  "ratings": [
    {{
      "dimension": "clarity",
      "score": 3.5,
      "confidence": 0.85,
      "reasoning": "Participant mentioned requirements are sometimes unclear but manageable.",
      "key_quotes": ["Sometimes I have to ask for clarification"],
      "summary_comment": "The respondent noted that while high-level goals are clear, specific requirements often need clarification, leading to occasional back-and-forth with stakeholders."
    }},
    ...
  ]
}}"""


def get_summary_generation_prompt(
    conversation: str,
    ratings: list[dict],
) -> str:
    """Generate a prompt to create a summary of the chat session.

    Args:
        conversation: The full conversation transcript
        ratings: List of extracted ratings

    Returns:
        Prompt for generating a session summary
    """
    ratings_summary = "\n".join([
        f"- {r['dimension']}: {r['score']}/5 (confidence: {r['confidence']:.0%})"
        for r in ratings
    ])

    return f"""Generate an executive summary of this workplace friction interview.

CONVERSATION TRANSCRIPT:
{conversation}

EXTRACTED RATINGS:
{ratings_summary}

Generate a JSON response with:
1. executive_summary: 2-3 sentence overview of their experience
2. key_pain_points: Array of {{dimension, description, severity}} for main issues
3. positive_aspects: Array of things that are working well
4. improvement_suggestions: Array of actionable recommendations
5. overall_sentiment: "positive", "neutral", or "negative"
6. dimension_sentiments: Object mapping each dimension to its sentiment

Focus on actionable insights. Be objective and base conclusions on the conversation.

Example:
{{
  "executive_summary": "The participant experiences moderate friction overall...",
  "key_pain_points": [
    {{"dimension": "delay", "description": "Frequent waits for approvals", "severity": "high"}}
  ],
  "positive_aspects": ["Good team collaboration", "Clear objectives"],
  "improvement_suggestions": ["Streamline approval process", "Improve tooling"],
  "overall_sentiment": "neutral",
  "dimension_sentiments": {{
    "clarity": "positive",
    "tooling": "negative",
    ...
  }}
}}"""


def get_transition_prompt(
    from_dimension: FrictionType,
    to_dimension: FrictionType,
    context: str,
) -> str:
    """Generate a smooth transition between dimensions.

    Args:
        from_dimension: The dimension just discussed
        to_dimension: The dimension to explore next
        context: Recent conversation context

    Returns:
        Prompt for generating a transition
    """
    from_info = DIMENSION_DESCRIPTIONS[from_dimension]
    to_info = DIMENSION_DESCRIPTIONS[to_dimension]

    return f"""Generate a smooth conversational transition from discussing {from_info["name"]} to {to_info["name"]}.

Just finished discussing: {from_info["name"]} ({from_info["description"]})
Moving to: {to_info["name"]} ({to_info["description"]})

Recent conversation:
{context}

Generate a transition that:
- Briefly acknowledges what they shared about {from_info["name"]}
- Naturally bridges to {to_info["name"]}
- Doesn't feel like switching topics abruptly
- Asks an open question about {to_info["name"]}

Keep it to 2-3 sentences. Make it feel like a natural conversation flow."""


def get_wrap_up_prompt(context: str) -> str:
    """Generate a wrap-up message before rating confirmation.

    Args:
        context: The conversation context

    Returns:
        Prompt for generating a wrap-up message
    """
    return f"""Generate a wrap-up message as we finish the main conversation.

Conversation so far:
{context}

Generate a message that:
- Thanks them for sharing their experiences
- Mentions we'll now quickly confirm a few ratings
- Is warm and appreciative
- Sets expectations for the next step

Keep it to 2-3 sentences."""


def format_conversation_for_context(
    messages: list,
    max_messages: int = 20,
) -> str:
    """Format recent messages for inclusion in prompts.

    Args:
        messages: List of message objects
        max_messages: Maximum number of messages to include

    Returns:
        Formatted conversation string
    """
    recent = messages[-max_messages:] if len(messages) > max_messages else messages

    lines = []
    for msg in recent:
        role = msg.role.value if hasattr(msg.role, "value") else msg.role
        role_label = "Assistant" if role == "assistant" else "Participant"
        content = msg.content if hasattr(msg, "content") else msg.get("content", "")
        lines.append(f"{role_label}: {content}")

    return "\n".join(lines)
