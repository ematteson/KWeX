"""Team API endpoints."""

import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Team, Occupation
from app.schemas import TeamCreate, TeamResponse

router = APIRouter(prefix="/teams", tags=["teams"])


class CSVUploadResult(BaseModel):
    """Result of CSV upload operation."""

    total_rows: int
    created: int
    updated: int
    errors: list[dict]
    teams: list[TeamResponse]


@router.get("", response_model=list[TeamResponse])
def list_teams(db: Session = Depends(get_db)):
    """List all teams."""
    return db.query(Team).all()


@router.post("", response_model=TeamResponse, status_code=201)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    """Create a new team."""
    # Verify occupation exists
    occupation = db.query(Occupation).filter(Occupation.id == team.occupation_id).first()
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")

    db_team = Team(**team.model_dump())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: str, db: Session = Depends(get_db)):
    """Get a specific team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(team_id: str, team_update: TeamCreate, db: Session = Depends(get_db)):
    """Update a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    for key, value in team_update.model_dump().items():
        setattr(team, key, value)

    db.commit()
    db.refresh(team)
    return team


@router.post("/upload-csv", response_model=CSVUploadResult)
async def upload_teams_csv(
    file: UploadFile = File(...),
    update_existing: bool = False,
    db: Session = Depends(get_db),
):
    """
    Upload teams from a CSV file.

    CSV Format:
    - name (required): Team name
    - function (required): Department/function name
    - occupation_code (required): Faethm occupation code (e.g., PM001) or occupation name
    - member_count (optional): Number of team members (default: 0)

    Example CSV:
    ```
    name,function,occupation_code,member_count
    Product Team Alpha,Product Management,PM001,12
    Design Team Beta,Design,DES001,8
    Sales Ops Team,Sales,SALES001,15
    ```

    If update_existing=true, teams with matching names will be updated.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail=f"File must be a CSV file, got: {file.filename}")

    # Read file content
    try:
        content = await file.read()
        decoded = content.decode("utf-8-sig")  # utf-8-sig handles BOM automatically
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(decoded))

    # Validate required columns
    required_columns = {"name", "function", "occupation_code"}
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no headers")

    fieldnames_lower = {f.lower().strip() for f in reader.fieldnames}
    missing_columns = required_columns - fieldnames_lower
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing_columns)}. Found columns: {', '.join(reader.fieldnames)}",
        )

    # Create a mapping from header names to normalized names
    header_map = {}
    for f in reader.fieldnames:
        normalized = f.lower().strip()
        header_map[f] = normalized

    # Cache occupations for lookup
    occupations = db.query(Occupation).all()
    occupation_by_code = {o.faethm_code: o for o in occupations if o.faethm_code}
    occupation_by_name = {o.name.lower(): o for o in occupations}

    results = {
        "total_rows": 0,
        "created": 0,
        "updated": 0,
        "errors": [],
        "teams": [],
    }

    for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
        results["total_rows"] += 1

        # Normalize row keys
        normalized_row = {}
        for key, value in row.items():
            normalized_key = header_map.get(key, key.lower().strip())
            normalized_row[normalized_key] = value.strip() if value else ""

        # Extract values
        name = normalized_row.get("name", "").strip()
        function = normalized_row.get("function", "").strip()
        occupation_code = normalized_row.get("occupation_code", "").strip()
        # Support both member_count and member_code as column names
        member_count_str = normalized_row.get("member_count", normalized_row.get("member_code", "0")).strip()

        # Validate required fields
        if not name:
            results["errors"].append({"row": row_num, "error": "Missing team name"})
            continue
        if not function:
            results["errors"].append({"row": row_num, "error": "Missing function"})
            continue
        if not occupation_code:
            results["errors"].append({"row": row_num, "error": "Missing occupation_code"})
            continue

        # Parse member_count
        try:
            member_count = int(member_count_str) if member_count_str else 0
        except ValueError:
            results["errors"].append(
                {"row": row_num, "error": f"Invalid member_count: {member_count_str}"}
            )
            continue

        # Find occupation by code or name
        occupation = occupation_by_code.get(occupation_code)
        if not occupation:
            occupation = occupation_by_name.get(occupation_code.lower())
        if not occupation:
            results["errors"].append(
                {
                    "row": row_num,
                    "error": f"Occupation not found: {occupation_code}. "
                    "Sync occupations first via POST /api/v1/occupations/sync",
                }
            )
            continue

        # Check if team already exists
        existing_team = db.query(Team).filter(Team.name == name).first()

        if existing_team:
            if update_existing:
                # Update existing team
                existing_team.function = function
                existing_team.occupation_id = occupation.id
                existing_team.member_count = member_count
                db.commit()
                db.refresh(existing_team)
                results["updated"] += 1
                results["teams"].append(TeamResponse.model_validate(existing_team))
            else:
                results["errors"].append(
                    {"row": row_num, "error": f"Team already exists: {name}"}
                )
        else:
            # Create new team
            new_team = Team(
                name=name,
                function=function,
                occupation_id=occupation.id,
                member_count=member_count,
            )
            db.add(new_team)
            db.commit()
            db.refresh(new_team)
            results["created"] += 1
            results["teams"].append(TeamResponse.model_validate(new_team))

    return CSVUploadResult(**results)


@router.get("/csv-template")
def get_csv_template():
    """
    Get a sample CSV template for team upload.

    Returns a downloadable CSV file with example data.
    """
    from fastapi.responses import StreamingResponse

    template = """name,function,occupation_code,member_count
Product Team Alpha,Product Management,PM001,12
Design Team Beta,Design,DES001,8
Sales Ops Team,Sales Operations,SALES001,15
Finance Analytics,Finance,FIN001,10
Customer Success,Customer Experience,CX001,20
"""
    return StreamingResponse(
        io.StringIO(template),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=teams_template.csv"},
    )
