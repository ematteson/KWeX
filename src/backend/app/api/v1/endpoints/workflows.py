"""Workflow visualization API endpoints using Daggr."""

from __future__ import annotations

import threading
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/workflows", tags=["workflows"])

# Track running workflow instances
_workflow_instances: dict[str, dict] = {}


class WorkflowLaunchRequest(BaseModel):
    """Request to launch a workflow visualizer."""
    workflow: str = "all"  # "chat", "metrics", "opportunity", or "all"
    share: bool = False
    port: int = 7860


class WorkflowStatus(BaseModel):
    """Status of a workflow instance."""
    workflow: str
    running: bool
    port: int
    share_url: Optional[str] = None
    local_url: str


@router.get("")
def list_available_workflows():
    """
    List all available workflow visualizations.

    Returns information about each workflow that can be visualized.
    """
    return {
        "workflows": [
            {
                "id": "chat",
                "name": "Chat Survey Flow",
                "description": "Visualizes the chat survey conversation pipeline: user input processing, LLM response generation, rating extraction, and confirmation flow.",
                "nodes": ["Process User Input", "Generate LLM Response", "Extract Rating", "Confirm Rating"],
            },
            {
                "id": "metrics",
                "name": "Metrics Calculation Pipeline",
                "description": "Shows how survey responses are aggregated, privacy checked, and converted to Flow and Friction scores.",
                "nodes": ["Aggregate Responses", "Privacy Threshold Check", "Calculate Flow Score", "Calculate Friction Score"],
            },
            {
                "id": "opportunity",
                "name": "Opportunity Generation Pipeline",
                "description": "Demonstrates how friction signals are analyzed and converted to RICE-scored improvement opportunities.",
                "nodes": ["Analyze Friction Signals", "Generate Opportunities", "Calculate RICE Scores"],
            },
            {
                "id": "all",
                "name": "All Workflows",
                "description": "Combined interface with tabs for all workflow visualizations.",
                "nodes": [],
            },
        ],
        "status": _workflow_instances,
    }


def _launch_workflow_background(workflow: str, share: bool, port: int):
    """Background task to launch workflow."""
    try:
        from app.services.workflow_visualizer import launch_workflow_visualizer
        launch_workflow_visualizer(workflow=workflow, share=share, port=port)
    except Exception as e:
        _workflow_instances[workflow] = {
            "running": False,
            "error": str(e),
        }


@router.post("/launch")
def launch_workflow(request: WorkflowLaunchRequest, background_tasks: BackgroundTasks):
    """
    Launch a workflow visualizer in the background.

    The visualizer will be accessible at the specified port.
    Use share=true to get a public Gradio share link.
    """
    workflow = request.workflow
    port = request.port
    share = request.share

    # Check if already running
    if workflow in _workflow_instances and _workflow_instances[workflow].get("running"):
        return {
            "message": f"Workflow '{workflow}' is already running",
            "local_url": f"http://localhost:{_workflow_instances[workflow].get('port', port)}",
            "status": "already_running",
        }

    # Mark as starting
    _workflow_instances[workflow] = {
        "running": True,
        "port": port,
        "share": share,
    }

    # Launch in background thread (not FastAPI background task, as it blocks)
    thread = threading.Thread(
        target=_launch_workflow_background,
        args=(workflow, share, port),
        daemon=True,
    )
    thread.start()

    return {
        "message": f"Launching workflow visualizer: {workflow}",
        "local_url": f"http://localhost:{port}",
        "share_enabled": share,
        "status": "starting",
        "note": "The visualizer may take a few seconds to start. Visit the local_url once ready.",
    }


@router.get("/status/{workflow}")
def get_workflow_status(workflow: str):
    """Get the status of a workflow visualizer."""
    if workflow not in _workflow_instances:
        return {
            "workflow": workflow,
            "running": False,
            "message": "Workflow has not been launched",
        }

    return {
        "workflow": workflow,
        **_workflow_instances[workflow],
    }


@router.post("/launch-direct/{workflow}")
def launch_workflow_direct(workflow: str, port: int = 7860, share: bool = False):
    """
    Launch a specific workflow visualizer directly.

    This is a convenience endpoint that launches immediately.
    Note: This will block the API thread - use /launch for non-blocking operation.
    """
    valid_workflows = ["chat", "metrics", "opportunity", "all"]
    if workflow not in valid_workflows:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid workflow. Choose from: {valid_workflows}",
        )

    # Mark as starting and launch in background
    _workflow_instances[workflow] = {
        "running": True,
        "port": port,
        "share": share,
    }

    thread = threading.Thread(
        target=_launch_workflow_background,
        args=(workflow, share, port),
        daemon=True,
    )
    thread.start()

    return {
        "message": f"Launching {workflow} workflow visualizer",
        "local_url": f"http://localhost:{port}",
        "share_enabled": share,
    }
