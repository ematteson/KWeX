"""Occupation API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Occupation, GlobalTask, OccupationTask, TaskCategory
from app.schemas import OccupationCreate, OccupationResponse

router = APIRouter(prefix="/occupations", tags=["occupations"])


@router.get("", response_model=list[OccupationResponse])
def list_occupations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List occupations with pagination."""
    return db.query(Occupation).offset(skip).limit(limit).all()


@router.get("/search", response_model=list[OccupationResponse])
def search_occupations(
    q: str = Query(..., min_length=2, description="Search query (min 2 characters)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search occupations by name or code."""
    search_term = f"%{q}%"
    results = (
        db.query(Occupation)
        .filter(
            (Occupation.name.ilike(search_term))
            | (Occupation.faethm_code.ilike(search_term))
        )
        .limit(limit)
        .all()
    )
    return results


@router.get("/available")
def list_available_occupations(
    q: Optional[str] = Query(None, min_length=2, description="Optional search query"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    List available occupations from the Faethm data source (not yet synced).

    Use this to see what occupations can be synced before actually syncing them.
    """
    from app.services.faethm_client import FaethmClient

    client = FaethmClient()

    if q:
        occupations = client.search_occupations(q, limit=limit)
    else:
        # Return first N occupations
        all_occupations = client.get_occupations()
        occupations = all_occupations[:limit]

    return {
        "total_available": len(client.get_occupations()),
        "returned": len(occupations),
        "occupations": [
            {
                "faethm_code": o["faethm_code"],
                "name": o["name"],
                "description": o.get("description", "")[:200],  # Truncate for preview
            }
            for o in occupations
        ],
    }


@router.post("", response_model=OccupationResponse, status_code=201)
def create_occupation(occupation: OccupationCreate, db: Session = Depends(get_db)):
    """Create a new occupation."""
    db_occupation = Occupation(**occupation.model_dump())
    db.add(db_occupation)
    db.commit()
    db.refresh(db_occupation)
    return db_occupation


@router.get("/{occupation_id}", response_model=OccupationResponse)
def get_occupation(occupation_id: str, db: Session = Depends(get_db)):
    """Get a specific occupation."""
    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")
    return occupation


@router.post("/sync")
def sync_occupations_from_faethm(
    codes: Optional[list[str]] = Query(
        None, description="Specific Faethm codes to sync. If empty, syncs all."
    ),
    search: Optional[str] = Query(
        None, description="Search term to filter which occupations to sync"
    ),
    limit: int = Query(50, ge=1, le=500, description="Max occupations to sync at once"),
    db: Session = Depends(get_db),
):
    """
    Sync occupations from Faethm API.

    Options:
    - Provide specific `codes` to sync only those occupations
    - Provide a `search` term to sync matching occupations
    - Leave both empty to sync first `limit` occupations

    Returns count of synced occupations.
    """
    from app.services.faethm_client import FaethmClient

    client = FaethmClient()

    # Get occupations to sync
    if codes:
        # Sync specific codes
        occupations = []
        for code in codes:
            occ = client.get_occupation(code)
            if occ:
                occupations.append(occ)
    elif search:
        # Sync occupations matching search
        occupations = client.search_occupations(search, limit=limit)
    else:
        # Sync first N occupations
        all_occupations = client.get_occupations()
        occupations = all_occupations[:limit]

    created = 0
    updated = 0
    synced_names = []

    for occ_data in occupations:
        faethm_code = occ_data.get("faethm_code")
        print(f"Syncing occupation: faethm_code={faethm_code}, name={occ_data.get('name', 'N/A')[:40]}")

        if not faethm_code:
            print(f"  WARNING: Missing faethm_code in data: {occ_data}")
            continue

        existing = (
            db.query(Occupation)
            .filter(Occupation.faethm_code == faethm_code)
            .first()
        )
        if existing:
            # Update existing
            for key, value in occ_data.items():
                setattr(existing, key, value)
            db.flush()
            _sync_tasks_for_occupation(db, client, existing, faethm_code)
            updated += 1
            synced_names.append(f"{faethm_code} (updated)")
        else:
            # Create new
            new_occ = Occupation(**occ_data)
            db.add(new_occ)
            db.flush()  # Get the ID before syncing tasks
            _sync_tasks_for_occupation(db, client, new_occ, faethm_code)
            created += 1
            synced_names.append(f"{faethm_code} (created)")

    db.commit()

    return {
        "total_synced": created + updated,
        "created": created,
        "updated": updated,
        "occupations": synced_names,
    }


@router.post("/sync-by-code/{faethm_code}", response_model=OccupationResponse)
def sync_single_occupation(faethm_code: str, db: Session = Depends(get_db)):
    """Sync a single occupation by its Faethm code, including tasks."""
    from app.services.faethm_client import FaethmClient

    client = FaethmClient()
    occ_data = client.get_occupation(faethm_code)

    if not occ_data:
        raise HTTPException(
            status_code=404,
            detail=f"Occupation with code '{faethm_code}' not found in Faethm data"
        )

    existing = (
        db.query(Occupation)
        .filter(Occupation.faethm_code == faethm_code)
        .first()
    )

    if existing:
        for key, value in occ_data.items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        occupation = existing
    else:
        new_occ = Occupation(**occ_data)
        db.add(new_occ)
        db.commit()
        db.refresh(new_occ)
        occupation = new_occ

    # Sync tasks for this occupation
    _sync_tasks_for_occupation(db, client, occupation, faethm_code, commit=True)

    return occupation


@router.post("/{occupation_id}/sync-tasks")
def sync_tasks_for_occupation(occupation_id: str, db: Session = Depends(get_db)):
    """Sync tasks for an existing occupation.

    Use this to add tasks to occupations that were synced before task syncing was implemented.
    """
    from app.services.faethm_client import FaethmClient

    occupation = db.query(Occupation).filter(Occupation.id == occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    if not occupation.faethm_code:
        raise HTTPException(
            status_code=400,
            detail="Occupation has no faethm_code - cannot sync tasks from Faethm"
        )

    client = FaethmClient()
    tasks_synced = _sync_tasks_for_occupation(
        db, client, occupation, occupation.faethm_code, commit=True
    )

    return {
        "occupation_id": occupation_id,
        "occupation_name": occupation.name,
        "tasks_synced": tasks_synced,
    }


def _sync_tasks_for_occupation(
    db: Session,
    client,
    occupation: Occupation,
    faethm_code: str,
    commit: bool = False
) -> int:
    """Sync tasks from Faethm and create OccupationTask assignments.

    Returns the number of tasks synced.
    """
    # Get tasks from Faethm
    faethm_tasks = client.get_tasks(faethm_code)

    if not faethm_tasks:
        return 0

    # Map category strings to enum
    category_map = {
        "core": TaskCategory.CORE,
        "support": TaskCategory.SUPPORT,
        "admin": TaskCategory.ADMIN,
    }

    tasks_synced = 0
    for idx, task_data in enumerate(faethm_tasks):
        faethm_task_id = task_data.get("faethm_task_id")
        task_name = task_data.get("name")
        task_description = task_data.get("description", "")
        task_category = category_map.get(task_data.get("category", "core"), TaskCategory.CORE)
        # Get time_percent from Faethm API (percentage of time spent on this task)
        time_percent = task_data.get("time_percent", 0.0)

        if not task_name:
            continue

        # Check if GlobalTask already exists (by faethm_task_id)
        global_task = None
        if faethm_task_id:
            global_task = (
                db.query(GlobalTask)
                .filter(GlobalTask.faethm_task_id == faethm_task_id)
                .first()
            )

        # If not found by ID, try to find by name (for Faethm tasks without ID)
        if not global_task:
            global_task = (
                db.query(GlobalTask)
                .filter(GlobalTask.name == task_name, GlobalTask.source == "faethm")
                .first()
            )

        # Create GlobalTask if it doesn't exist
        if not global_task:
            global_task = GlobalTask(
                faethm_task_id=faethm_task_id,
                name=task_name,
                description=task_description,
                category=task_category,
                is_custom=False,
                source="faethm",
            )
            db.add(global_task)
            db.flush()  # Get the ID

        # Check if OccupationTask assignment already exists
        existing_assignment = (
            db.query(OccupationTask)
            .filter(
                OccupationTask.occupation_id == occupation.id,
                OccupationTask.global_task_id == global_task.id,
            )
            .first()
        )

        # Create or update OccupationTask assignment
        if existing_assignment:
            # Update time_percentage if it was 0 (not yet set by user)
            if existing_assignment.time_percentage == 0.0 and time_percent > 0:
                existing_assignment.time_percentage = time_percent
        else:
            assignment = OccupationTask(
                occupation_id=occupation.id,
                global_task_id=global_task.id,
                time_percentage=time_percent,  # Use Faethm's time allocation
                display_order=idx,
            )
            db.add(assignment)
            tasks_synced += 1

    if commit:
        db.commit()

    return tasks_synced
