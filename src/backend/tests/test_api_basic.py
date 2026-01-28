"""Basic API tests for KWeX backend."""

import pytest


def test_root_endpoint(client):
    """Test root endpoint returns API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "KWeX API"
    assert data["status"] == "healthy"


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_list_teams_empty(client):
    """Test listing teams when empty."""
    response = client.get("/api/v1/teams")
    assert response.status_code == 200
    assert response.json() == []


def test_list_occupations_empty(client):
    """Test listing occupations when empty."""
    response = client.get("/api/v1/occupations")
    assert response.status_code == 200
    assert response.json() == []


def test_create_occupation(client):
    """Test creating an occupation."""
    occupation_data = {
        "name": "Product Manager",
        "faethm_code": "PM001",
        "ideal_run_percentage": 0.30,
        "ideal_change_percentage": 0.70,
    }
    response = client.post("/api/v1/occupations", json=occupation_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Product Manager"
    assert data["faethm_code"] == "PM001"
    assert "id" in data


def test_create_team(client):
    """Test creating a team."""
    # First create an occupation
    occ_response = client.post(
        "/api/v1/occupations",
        json={"name": "Product Manager", "faethm_code": "PM001"},
    )
    occ_id = occ_response.json()["id"]

    # Create team
    team_data = {
        "name": "Product Team Alpha",
        "function": "Product",
        "occupation_id": occ_id,
        "member_count": 10,
    }
    response = client.post("/api/v1/teams", json=team_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Product Team Alpha"
    assert data["member_count"] == 10


def test_sync_occupations_from_faethm(client):
    """Test syncing occupations from Faethm mock data."""
    response = client.post("/api/v1/occupations/sync")
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 5
    assert "Product Manager" in data["occupations"]
    assert "Designer" in data["occupations"]


def test_create_survey(client):
    """Test creating a survey."""
    # Setup: Create occupation and team
    occ_response = client.post(
        "/api/v1/occupations",
        json={"name": "Product Manager", "faethm_code": "PM001"},
    )
    occ_id = occ_response.json()["id"]

    team_response = client.post(
        "/api/v1/teams",
        json={"name": "Team A", "function": "Product", "occupation_id": occ_id, "member_count": 15},
    )
    team_id = team_response.json()["id"]

    # Create survey
    survey_data = {
        "occupation_id": occ_id,
        "team_id": team_id,
        "name": "Q1 2024 KWeX Survey",
        "anonymous_mode": True,
        "estimated_completion_minutes": 7,
    }
    response = client.post("/api/v1/surveys", json=survey_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Q1 2024 KWeX Survey"
    assert data["status"] == "draft"
    assert data["anonymous_mode"] is True
