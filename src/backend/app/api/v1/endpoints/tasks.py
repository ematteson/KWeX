"""Task curation API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models import GlobalTask, Occupation, OccupationTask, TaskCategory
from app.schemas import (
    AllocationSummary,
    BulkTimeAllocationUpdate,
    GlobalTaskCreate,
    GlobalTaskResponse,
    GlobalTaskUpdate,
    OccupationTaskCreate,
    OccupationTaskResponse,
    OccupationTaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ============================================================================
# Global Task Library Endpoints
# ============================================================================


@router.get("", response_model=list[GlobalTaskResponse])
def list_global_tasks(
    search: Optional[str] = Query(None, min_length=2, description="Search by name"),
    category: Optional[TaskCategory] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(None, description="Filter by source (faethm, custom)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List all global tasks with optional search and filters."""
    query = db.query(GlobalTask)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (GlobalTask.name.ilike(search_term)) | (GlobalTask.description.ilike(search_term))
        )

    if category:
        query = query.filter(GlobalTask.category == category)

    if source:
        query = query.filter(GlobalTask.source == source)

    return query.order_by(GlobalTask.name).offset(skip).limit(limit).all()


@router.post("", response_model=GlobalTaskResponse, status_code=201)
def create_global_task(task: GlobalTaskCreate, db: Session = Depends(get_db)):
    """Create a new custom global task."""
    # Check for duplicate faethm_task_id if provided
    if task.faethm_task_id:
        existing = (
            db.query(GlobalTask)
            .filter(GlobalTask.faethm_task_id == task.faethm_task_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Task with faethm_task_id '{task.faethm_task_id}' already exists",
            )

    db_task = GlobalTask(
        **task.model_dump(),
        is_custom=True,
        source="custom",
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/{task_id}", response_model=GlobalTaskResponse)
def get_global_task(task_id: str, db: Session = Depends(get_db)):
    """Get a single global task by ID."""
    task = db.query(GlobalTask).filter(GlobalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=GlobalTaskResponse)
def update_global_task(
    task_id: str, task_update: GlobalTaskUpdate, db: Session = Depends(get_db)
):
    """Update a custom global task. Only custom tasks can be updated."""
    task = db.query(GlobalTask).filter(GlobalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.is_custom:
        raise HTTPException(
            status_code=400,
            detail="Cannot update Faethm tasks. Only custom tasks can be modified.",
        )

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_global_task(task_id: str, db: Session = Depends(get_db)):
    """Delete a custom global task. Only custom tasks with no assignments can be deleted."""
    task = db.query(GlobalTask).filter(GlobalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.is_custom:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete Faethm tasks. Only custom tasks can be deleted.",
        )

    # Check for existing assignments
    assignments = (
        db.query(OccupationTask)
        .filter(OccupationTask.global_task_id == task_id)
        .count()
    )
    if assignments > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete task: it is assigned to {assignments} occupation(s). Remove assignments first.",
        )

    db.delete(task)
    db.commit()
    return None


# ============================================================================
# Occupation Task Assignment Endpoints
# ============================================================================


@router.get("/occupations/{occupation_id}", response_model=list[OccupationTaskResponse])
def list_occupation_tasks(occupation_id: str, db: Session = Depends(get_db)):
    """List all tasks assigned to an occupation with their time allocations."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    assignments = (
        db.query(OccupationTask)
        .filter(OccupationTask.occupation_id == occupation_id)
        .options(joinedload(OccupationTask.global_task))
        .order_by(OccupationTask.display_order)
        .all()
    )
    return assignments


@router.post(
    "/occupations/{occupation_id}",
    response_model=OccupationTaskResponse,
    status_code=201,
)
def assign_task_to_occupation(
    occupation_id: str, assignment: OccupationTaskCreate, db: Session = Depends(get_db)
):
    """Assign a global task to an occupation."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    # Verify global task exists
    global_task = (
        db.query(GlobalTask).filter(GlobalTask.id == assignment.global_task_id).first()
    )
    if not global_task:
        raise HTTPException(status_code=404, detail="Global task not found")

    # Check if already assigned
    existing = (
        db.query(OccupationTask)
        .filter(
            OccupationTask.occupation_id == occupation_id,
            OccupationTask.global_task_id == assignment.global_task_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Task is already assigned to this occupation"
        )

    # Get max display order for this occupation
    max_order = (
        db.query(OccupationTask)
        .filter(OccupationTask.occupation_id == occupation_id)
        .count()
    )

    db_assignment = OccupationTask(
        occupation_id=occupation_id,
        global_task_id=assignment.global_task_id,
        time_percentage=assignment.time_percentage,
        category_override=assignment.category_override,
        display_order=assignment.display_order if assignment.display_order else max_order,
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)

    # Reload with relationship
    db_assignment = (
        db.query(OccupationTask)
        .filter(OccupationTask.id == db_assignment.id)
        .options(joinedload(OccupationTask.global_task))
        .first()
    )
    return db_assignment


@router.patch(
    "/occupations/{occupation_id}/{assignment_id}",
    response_model=OccupationTaskResponse,
)
def update_task_assignment(
    occupation_id: str,
    assignment_id: str,
    update: OccupationTaskUpdate,
    db: Session = Depends(get_db),
):
    """Update a task assignment (time percentage, category override, display order)."""
    assignment = (
        db.query(OccupationTask)
        .filter(
            OccupationTask.id == assignment_id,
            OccupationTask.occupation_id == occupation_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(assignment, key, value)

    db.commit()
    db.refresh(assignment)

    # Reload with relationship
    assignment = (
        db.query(OccupationTask)
        .filter(OccupationTask.id == assignment.id)
        .options(joinedload(OccupationTask.global_task))
        .first()
    )
    return assignment


@router.delete("/occupations/{occupation_id}/{assignment_id}", status_code=204)
def remove_task_from_occupation(
    occupation_id: str, assignment_id: str, db: Session = Depends(get_db)
):
    """Remove a task from an occupation."""
    assignment = (
        db.query(OccupationTask)
        .filter(
            OccupationTask.id == assignment_id,
            OccupationTask.occupation_id == occupation_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return None


@router.put("/occupations/{occupation_id}/time-allocations")
def bulk_update_time_allocations(
    occupation_id: str,
    bulk_update: BulkTimeAllocationUpdate,
    db: Session = Depends(get_db),
):
    """Bulk update time allocations for multiple tasks at once."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    updated = 0
    errors = []

    for allocation in bulk_update.allocations:
        assignment_id = allocation.get("id")
        time_percentage = allocation.get("time_percentage")

        if not assignment_id or time_percentage is None:
            errors.append({"id": assignment_id, "error": "Missing id or time_percentage"})
            continue

        if time_percentage < 0 or time_percentage > 100:
            errors.append({"id": assignment_id, "error": "time_percentage must be 0-100"})
            continue

        assignment = (
            db.query(OccupationTask)
            .filter(
                OccupationTask.id == assignment_id,
                OccupationTask.occupation_id == occupation_id,
            )
            .first()
        )
        if not assignment:
            errors.append({"id": assignment_id, "error": "Assignment not found"})
            continue

        assignment.time_percentage = time_percentage
        updated += 1

    db.commit()

    return {"updated": updated, "errors": errors}


@router.get("/occupations/{occupation_id}/summary", response_model=AllocationSummary)
def get_allocation_summary(occupation_id: str, db: Session = Depends(get_db)):
    """Get a summary of task allocations for an occupation."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    assignments = (
        db.query(OccupationTask)
        .filter(OccupationTask.occupation_id == occupation_id)
        .all()
    )

    total_percentage = sum(a.time_percentage for a in assignments)
    tasks_with_allocation = sum(1 for a in assignments if a.time_percentage > 0)

    return AllocationSummary(
        occupation_id=occupation_id,
        total_tasks=len(assignments),
        total_percentage=total_percentage,
        tasks_with_allocation=tasks_with_allocation,
    )
