"""Occupation API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Occupation
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
            updated += 1
            synced_names.append(f"{faethm_code} (updated)")
        else:
            # Create new
            new_occ = Occupation(**occ_data)
            db.add(new_occ)
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
    """Sync a single occupation by its Faethm code."""
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
        return existing
    else:
        new_occ = Occupation(**occ_data)
        db.add(new_occ)
        db.commit()
        db.refresh(new_occ)
        return new_occ
