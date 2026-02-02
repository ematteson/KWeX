"""
KWeX Workflow Visualizer using Daggr.

Provides visual canvas for inspecting and debugging:
- Chat Survey Flow
- Metrics Calculation Pipeline
- Opportunity Generation Workflow
"""

from __future__ import annotations

import json
from typing import Any, Optional

import gradio as gr
from daggr import FnNode, Graph

from app.core.config import get_settings


# =============================================================================
# CHAT SURVEY WORKFLOW
# =============================================================================

def process_user_input(message: str, dimension: str) -> dict:
    """Simulate processing user input in chat survey."""
    return {
        "message": message,
        "dimension": dimension,
        "word_count": len(message.split()),
        "sentiment_indicators": {
            "positive": any(w in message.lower() for w in ["good", "great", "love", "enjoy"]),
            "negative": any(w in message.lower() for w in ["bad", "frustrating", "hate", "annoying"]),
        }
    }


def generate_llm_response(user_input: dict, system_prompt: str) -> dict:
    """Simulate LLM response generation."""
    dimension = user_input.get("dimension", "clarity")
    follow_up_questions = {
        "clarity": "Can you tell me more about what information you felt was missing?",
        "tooling": "Which specific tools cause the most friction in your daily work?",
        "process": "What part of the process feels most cumbersome?",
        "rework": "How often do you need to redo work, and what typically causes it?",
        "delay": "Where do you experience the longest wait times?",
        "safety": "Do you feel comfortable raising concerns with your team?",
    }

    return {
        "response": follow_up_questions.get(dimension, "Tell me more about your experience."),
        "dimension_explored": dimension,
        "confidence": 0.85,
        "tokens_used": 150,
    }


def extract_rating(conversation: dict, dimension: str) -> dict:
    """Extract rating from conversation for a dimension."""
    # Simulate rating extraction based on sentiment
    sentiment = conversation.get("sentiment_indicators", {})

    if sentiment.get("positive"):
        score = 4.0
        confidence = 0.8
    elif sentiment.get("negative"):
        score = 2.0
        confidence = 0.85
    else:
        score = 3.0
        confidence = 0.6

    return {
        "dimension": dimension,
        "ai_inferred_score": score,
        "ai_confidence": confidence,
        "reasoning": f"Based on conversation analysis for {dimension}",
        "needs_confirmation": confidence < 0.75,
    }


def confirm_rating(extracted_rating: dict, user_confirmed: bool, adjusted_score: Optional[float] = None) -> dict:
    """Process rating confirmation from user."""
    final_score = adjusted_score if adjusted_score else extracted_rating["ai_inferred_score"]

    return {
        "dimension": extracted_rating["dimension"],
        "final_score": final_score,
        "was_adjusted": adjusted_score is not None,
        "normalized_score": (final_score - 1) * 25,  # Convert 1-5 to 0-100
    }


def create_chat_survey_workflow() -> Graph:
    """Create the Chat Survey workflow visualization."""

    # Node 1: User Input Processing
    user_input_node = FnNode(
        fn=process_user_input,
        name="Process User Input",
        inputs={
            "message": gr.Textbox(
                label="User Message",
                value="I often struggle to find the documentation I need for my tasks.",
                lines=3,
            ),
            "dimension": gr.Dropdown(
                label="Current Dimension",
                choices=["clarity", "tooling", "process", "rework", "delay", "safety"],
                value="clarity",
            ),
        },
        outputs={
            "processed": gr.JSON(label="Processed Input"),
        },
    )

    # Node 2: LLM Response Generation
    llm_response_node = FnNode(
        fn=generate_llm_response,
        name="Generate LLM Response",
        inputs={
            "user_input": user_input_node.processed,
            "system_prompt": gr.Textbox(
                label="System Prompt",
                value="You are a helpful assistant gathering feedback about work friction.",
                lines=2,
            ),
        },
        outputs={
            "response": gr.JSON(label="LLM Response"),
        },
    )

    # Node 3: Rating Extraction
    rating_extraction_node = FnNode(
        fn=extract_rating,
        name="Extract Rating",
        inputs={
            "conversation": user_input_node.processed,
            "dimension": gr.Textbox(label="Dimension", value="clarity"),
        },
        outputs={
            "rating": gr.JSON(label="Extracted Rating"),
        },
    )

    # Node 4: Rating Confirmation
    confirmation_node = FnNode(
        fn=confirm_rating,
        name="Confirm Rating",
        inputs={
            "extracted_rating": rating_extraction_node.rating,
            "user_confirmed": gr.Checkbox(label="User Confirmed", value=True),
            "adjusted_score": gr.Number(label="Adjusted Score (optional)", value=None),
        },
        outputs={
            "final_rating": gr.JSON(label="Final Confirmed Rating"),
        },
    )

    return Graph(
        name="Chat Survey Flow",
        nodes=[user_input_node, llm_response_node, rating_extraction_node, confirmation_node],
    )


# =============================================================================
# METRICS CALCULATION WORKFLOW
# =============================================================================

def aggregate_responses(responses: str) -> dict:
    """Aggregate survey responses."""
    # Parse JSON string input
    try:
        response_list = json.loads(responses)
    except:
        response_list = [{"score": 70}, {"score": 65}, {"score": 80}]

    scores = [r.get("score", 50) for r in response_list]

    return {
        "count": len(scores),
        "average": sum(scores) / len(scores) if scores else 0,
        "min": min(scores) if scores else 0,
        "max": max(scores) if scores else 0,
    }


def check_privacy_threshold(aggregated: dict, threshold: int = 7) -> dict:
    """Check if response count meets privacy threshold."""
    meets_threshold = aggregated["count"] >= threshold

    return {
        "meets_threshold": meets_threshold,
        "respondent_count": aggregated["count"],
        "required_count": threshold,
        "can_display_results": meets_threshold,
        "message": "Results available" if meets_threshold else f"Need {threshold - aggregated['count']} more responses",
    }


def calculate_flow_score(responses: dict, weights: str) -> dict:
    """Calculate Flow score from dimension scores."""
    try:
        weight_dict = json.loads(weights)
    except:
        weight_dict = {"clarity": 0.4, "delay": 0.3, "process": 0.3}

    # Simulate dimension scores
    dimension_scores = {
        "clarity": responses.get("average", 70),
        "delay": responses.get("average", 70) * 0.9,
        "process": responses.get("average", 70) * 0.95,
    }

    weighted_sum = sum(
        dimension_scores.get(dim, 50) * weight
        for dim, weight in weight_dict.items()
    )

    return {
        "flow_score": round(weighted_sum, 2),
        "dimension_contributions": {
            dim: round(dimension_scores.get(dim, 50) * weight, 2)
            for dim, weight in weight_dict.items()
        },
        "interpretation": "Good" if weighted_sum >= 70 else "Needs Attention" if weighted_sum >= 50 else "Critical",
    }


def calculate_friction_score(responses: dict) -> dict:
    """Calculate Friction score from dimension scores."""
    base_score = responses.get("average", 50)

    # Friction dimensions
    friction_breakdown = {
        "clarity": max(0, 100 - base_score * 1.1),
        "tooling": max(0, 100 - base_score * 0.95),
        "process": max(0, 100 - base_score * 1.0),
        "rework": max(0, 100 - base_score * 1.05),
        "delay": max(0, 100 - base_score * 0.9),
    }

    friction_score = sum(friction_breakdown.values()) / len(friction_breakdown)

    return {
        "friction_score": round(friction_score, 2),
        "friction_breakdown": {k: round(v, 2) for k, v in friction_breakdown.items()},
        "highest_friction": max(friction_breakdown, key=friction_breakdown.get),
        "interpretation": "Low Friction" if friction_score < 30 else "Moderate" if friction_score < 50 else "High Friction",
    }


def create_metrics_workflow() -> Graph:
    """Create the Metrics Calculation workflow visualization."""

    # Node 1: Aggregate Responses
    aggregate_node = FnNode(
        fn=aggregate_responses,
        name="Aggregate Responses",
        inputs={
            "responses": gr.Textbox(
                label="Survey Responses (JSON)",
                value='[{"score": 75}, {"score": 68}, {"score": 82}, {"score": 71}, {"score": 79}, {"score": 65}, {"score": 88}]',
                lines=3,
            ),
        },
        outputs={
            "aggregated": gr.JSON(label="Aggregated Data"),
        },
    )

    # Node 2: Privacy Threshold Check
    privacy_node = FnNode(
        fn=check_privacy_threshold,
        name="Privacy Threshold Check",
        inputs={
            "aggregated": aggregate_node.aggregated,
            "threshold": gr.Slider(label="Privacy Threshold", minimum=3, maximum=10, value=7, step=1),
        },
        outputs={
            "privacy_result": gr.JSON(label="Privacy Check Result"),
        },
    )

    # Node 3: Calculate Flow Score
    flow_node = FnNode(
        fn=calculate_flow_score,
        name="Calculate Flow Score",
        inputs={
            "responses": aggregate_node.aggregated,
            "weights": gr.Textbox(
                label="Dimension Weights (JSON)",
                value='{"clarity": 0.4, "delay": 0.3, "process": 0.3}',
            ),
        },
        outputs={
            "flow_result": gr.JSON(label="Flow Score"),
        },
    )

    # Node 4: Calculate Friction Score
    friction_node = FnNode(
        fn=calculate_friction_score,
        name="Calculate Friction Score",
        inputs={
            "responses": aggregate_node.aggregated,
        },
        outputs={
            "friction_result": gr.JSON(label="Friction Score"),
        },
    )

    return Graph(
        name="Metrics Calculation Pipeline",
        nodes=[aggregate_node, privacy_node, flow_node, friction_node],
    )


# =============================================================================
# OPPORTUNITY GENERATION WORKFLOW
# =============================================================================

def analyze_friction_signals(metrics: str) -> dict:
    """Analyze friction signals from metrics."""
    try:
        metrics_dict = json.loads(metrics)
    except:
        metrics_dict = {
            "friction_breakdown": {
                "clarity": 45,
                "tooling": 62,
                "process": 38,
                "rework": 55,
                "delay": 48,
            }
        }

    breakdown = metrics_dict.get("friction_breakdown", {})

    # Find high friction areas (above 40)
    high_friction = {k: v for k, v in breakdown.items() if v > 40}

    return {
        "high_friction_areas": high_friction,
        "count": len(high_friction),
        "priority_order": sorted(high_friction.keys(), key=lambda x: high_friction[x], reverse=True),
    }


def generate_opportunities(signals: dict, team_size: int) -> dict:
    """Generate improvement opportunities from friction signals."""
    opportunities = []

    opportunity_templates = {
        "clarity": {
            "title": "Improve Documentation Clarity",
            "description": "Create clearer documentation and knowledge base",
            "effort": 3,
        },
        "tooling": {
            "title": "Tool Stack Optimization",
            "description": "Evaluate and improve development tools",
            "effort": 4,
        },
        "process": {
            "title": "Streamline Workflows",
            "description": "Review and simplify team processes",
            "effort": 3,
        },
        "rework": {
            "title": "Reduce Rework Through Better Reviews",
            "description": "Implement earlier feedback loops",
            "effort": 2,
        },
        "delay": {
            "title": "Reduce Wait Times",
            "description": "Identify and eliminate bottlenecks",
            "effort": 3,
        },
    }

    for dim in signals.get("priority_order", []):
        template = opportunity_templates.get(dim, {})
        score = signals.get("high_friction_areas", {}).get(dim, 50)

        opportunities.append({
            "dimension": dim,
            "title": template.get("title", f"Address {dim} friction"),
            "description": template.get("description", ""),
            "source_score": score,
            "reach": team_size,
            "impact": min(5, int(score / 20) + 1),
            "confidence": 0.7,
            "effort": template.get("effort", 3),
        })

    return {
        "opportunities": opportunities,
        "count": len(opportunities),
    }


def calculate_rice_scores(opportunities: dict) -> dict:
    """Calculate RICE scores for opportunities."""
    scored = []

    for opp in opportunities.get("opportunities", []):
        reach = opp.get("reach", 10)
        impact = opp.get("impact", 3)
        confidence = opp.get("confidence", 0.7)
        effort = opp.get("effort", 3)

        rice_score = (reach * impact * confidence) / effort

        scored.append({
            **opp,
            "rice_score": round(rice_score, 2),
        })

    # Sort by RICE score
    scored.sort(key=lambda x: x["rice_score"], reverse=True)

    return {
        "prioritized_opportunities": scored,
        "top_priority": scored[0] if scored else None,
    }


def create_opportunity_workflow() -> Graph:
    """Create the Opportunity Generation workflow visualization."""

    # Node 1: Analyze Friction Signals
    analyze_node = FnNode(
        fn=analyze_friction_signals,
        name="Analyze Friction Signals",
        inputs={
            "metrics": gr.Textbox(
                label="Friction Metrics (JSON)",
                value='{"friction_breakdown": {"clarity": 45, "tooling": 62, "process": 38, "rework": 55, "delay": 48}}',
                lines=3,
            ),
        },
        outputs={
            "signals": gr.JSON(label="Friction Signals"),
        },
    )

    # Node 2: Generate Opportunities
    generate_node = FnNode(
        fn=generate_opportunities,
        name="Generate Opportunities",
        inputs={
            "signals": analyze_node.signals,
            "team_size": gr.Slider(label="Team Size", minimum=5, maximum=50, value=15, step=1),
        },
        outputs={
            "opportunities": gr.JSON(label="Generated Opportunities"),
        },
    )

    # Node 3: Calculate RICE Scores
    rice_node = FnNode(
        fn=calculate_rice_scores,
        name="Calculate RICE Scores",
        inputs={
            "opportunities": generate_node.opportunities,
        },
        outputs={
            "prioritized": gr.JSON(label="Prioritized Opportunities"),
        },
    )

    return Graph(
        name="Opportunity Generation Pipeline",
        nodes=[analyze_node, generate_node, rice_node],
    )


# =============================================================================
# COMBINED WORKFLOW LAUNCHER
# =============================================================================

def launch_workflow_visualizer(workflow: str = "all", share: bool = False, port: int = 7860):
    """
    Launch the workflow visualizer.

    Args:
        workflow: Which workflow to launch ("chat", "metrics", "opportunity", or "all")
        share: Whether to create a public share link
        port: Port to run on
    """
    workflows = {
        "chat": create_chat_survey_workflow,
        "metrics": create_metrics_workflow,
        "opportunity": create_opportunity_workflow,
    }

    if workflow == "all":
        # Create a combined interface
        import gradio as gr

        with gr.Blocks(title="KWeX Workflow Visualizer") as demo:
            gr.Markdown("# KWeX Workflow Visualizer")
            gr.Markdown("Select a workflow to visualize and interact with the processing pipeline.")

            with gr.Tab("Chat Survey Flow"):
                gr.Markdown("## Chat Survey Conversation Flow")
                gr.Markdown("Visualizes how user messages are processed, LLM responses generated, and ratings extracted.")
                chat_btn = gr.Button("Launch Chat Survey Workflow", variant="primary")
                chat_btn.click(lambda: create_chat_survey_workflow().launch(share=share))

            with gr.Tab("Metrics Pipeline"):
                gr.Markdown("## Metrics Calculation Pipeline")
                gr.Markdown("Shows how survey responses are aggregated, privacy checked, and converted to Flow/Friction scores.")
                metrics_btn = gr.Button("Launch Metrics Workflow", variant="primary")
                metrics_btn.click(lambda: create_metrics_workflow().launch(share=share))

            with gr.Tab("Opportunity Generation"):
                gr.Markdown("## Opportunity Generation Pipeline")
                gr.Markdown("Demonstrates how friction signals are analyzed and converted to RICE-scored opportunities.")
                opp_btn = gr.Button("Launch Opportunity Workflow", variant="primary")
                opp_btn.click(lambda: create_opportunity_workflow().launch(share=share))

        demo.launch(share=share, server_port=port)
    else:
        if workflow in workflows:
            graph = workflows[workflow]()
            graph.launch(share=share)
        else:
            raise ValueError(f"Unknown workflow: {workflow}. Choose from: {list(workflows.keys())}")


# For direct execution
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Launch KWeX Workflow Visualizer")
    parser.add_argument(
        "--workflow",
        choices=["chat", "metrics", "opportunity", "all"],
        default="all",
        help="Which workflow to visualize",
    )
    parser.add_argument("--share", action="store_true", help="Create public share link")
    parser.add_argument("--port", type=int, default=7860, help="Port to run on")

    args = parser.parse_args()
    launch_workflow_visualizer(args.workflow, args.share, args.port)
