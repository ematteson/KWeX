"""Faethm API client with CSV-based mock data for MVP."""

from __future__ import annotations

import csv
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from app.core.config import get_settings

settings = get_settings()


def _get_csv_path() -> Path:
    """Get the path to the Faethm jobs CSV file."""
    # Look for CSV file in multiple locations
    # Start from this file's location and go up to find the project root
    current_dir = Path(__file__).resolve().parent
    # Go up: services -> app -> backend -> src -> KWeX (project root)
    project_root = current_dir.parent.parent.parent.parent
    csv_path = project_root / "faethm_jobs.csv"

    # If not found, try relative to current working directory
    if not csv_path.exists():
        # Try cwd (backend directory)
        cwd_path = Path.cwd() / "faethm_jobs.csv"
        if cwd_path.exists():
            return cwd_path
        # Try going up from cwd
        cwd_parent = Path.cwd().parent.parent / "faethm_jobs.csv"
        if cwd_parent.exists():
            return cwd_parent

    return csv_path


@lru_cache(maxsize=1)
def _load_occupations_from_csv() -> list[dict]:
    """Load occupations from the Faethm jobs CSV file."""
    csv_path = _get_csv_path()
    print(f"FaethmClient: Looking for CSV at {csv_path}")

    if not csv_path.exists():
        print(f"Warning: Faethm jobs CSV not found at {csv_path}, using fallback data")
        return _get_fallback_occupations()

    print(f"FaethmClient: Found CSV at {csv_path}")

    occupations = []
    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Map CSV columns to occupation structure
                faethm_code = row.get("id", "").strip()
                name = row.get("name", "").strip()
                description = row.get("description", "").strip()

                if not faethm_code or not name:
                    continue

                # Determine ideal run/change percentages based on job category prefix
                # These are reasonable defaults that can be customized
                ideal_run, ideal_change = _estimate_portfolio_balance(faethm_code, name)

                occupations.append({
                    "faethm_code": faethm_code,
                    "name": name,
                    "description": description,
                    "ideal_run_percentage": ideal_run,
                    "ideal_change_percentage": ideal_change,
                    "throughput_indicators": _generate_throughput_indicators(faethm_code, name),
                })

        print(f"Loaded {len(occupations)} occupations from {csv_path}")
        return occupations
    except Exception as e:
        print(f"Error loading CSV: {e}, using fallback data")
        return _get_fallback_occupations()


def _estimate_portfolio_balance(code: str, name: str) -> tuple[float, float]:
    """Estimate ideal run/change percentage based on job category."""
    # Extract category prefix from code (e.g., "ADM" from "ADM.ABP")
    prefix = code.split(".")[0] if "." in code else code[:3]

    # Define portfolio balance by job category
    # Run = operational/maintenance work, Change = new/innovation work
    category_balance = {
        # Administrative roles - higher run percentage
        "ADM": (0.60, 0.40),
        # Technology/IT roles - more balanced toward change
        "ICT": (0.35, 0.65),
        "TEC": (0.35, 0.65),
        # Management roles - balanced
        "MGT": (0.40, 0.60),
        "MAN": (0.40, 0.60),
        # Sales/Marketing - balanced toward change
        "SAL": (0.45, 0.55),
        "MKT": (0.40, 0.60),
        # Finance/Accounting - higher run
        "FIN": (0.55, 0.45),
        "ACC": (0.60, 0.40),
        # Creative/Design - lower run
        "DES": (0.25, 0.75),
        "CRE": (0.30, 0.70),
        # Engineering - balanced toward change
        "ENG": (0.35, 0.65),
        # Research/Science - lower run
        "SCI": (0.30, 0.70),
        "RES": (0.25, 0.75),
        # Operations - higher run
        "OPS": (0.55, 0.45),
        # HR/People - balanced
        "HRM": (0.45, 0.55),
        "PEO": (0.45, 0.55),
        # Customer Service - higher run
        "CUS": (0.55, 0.45),
        "SVC": (0.55, 0.45),
        # Legal/Compliance - higher run
        "LEG": (0.50, 0.50),
        # Healthcare - balanced
        "HEA": (0.50, 0.50),
        "MED": (0.50, 0.50),
        # Education - balanced
        "EDU": (0.45, 0.55),
        # Construction/Trades
        "CON": (0.50, 0.50),
        "TRD": (0.55, 0.45),
    }

    # Return category-specific balance or default
    return category_balance.get(prefix, (0.45, 0.55))


def _generate_throughput_indicators(code: str, name: str) -> list[str]:
    """Generate relevant throughput indicators based on job type."""
    name_lower = name.lower()

    # Generic indicators that can be customized
    if "manager" in name_lower or "director" in name_lower:
        return ["decisions made", "projects completed", "team objectives met"]
    elif "analyst" in name_lower:
        return ["analyses completed", "reports delivered", "insights generated"]
    elif "engineer" in name_lower or "developer" in name_lower:
        return ["features delivered", "bugs resolved", "code reviews completed"]
    elif "designer" in name_lower:
        return ["designs delivered", "iterations completed", "prototypes created"]
    elif "sales" in name_lower:
        return ["deals closed", "proposals sent", "pipeline generated"]
    elif "support" in name_lower or "service" in name_lower:
        return ["tickets resolved", "customer satisfaction", "issues escalated"]
    elif "coordinator" in name_lower or "assistant" in name_lower:
        return ["tasks completed", "requests processed", "schedules managed"]
    elif "specialist" in name_lower:
        return ["cases handled", "solutions delivered", "standards maintained"]
    elif "clerk" in name_lower:
        return ["records processed", "documents filed", "transactions completed"]
    else:
        return ["tasks completed", "deliverables produced", "objectives achieved"]


def _get_fallback_occupations() -> list[dict]:
    """Fallback mock data if CSV is not available."""
    return [
        {
            "faethm_code": "MGT.PRD",
            "name": "Product Manager",
            "description": "Manage product development lifecycle and strategy",
            "ideal_run_percentage": 0.30,
            "ideal_change_percentage": 0.70,
            "throughput_indicators": ["decisions closed", "roadmap items shipped", "features released"],
        },
        {
            "faethm_code": "DES.UXD",
            "name": "UX Designer",
            "description": "Design user experiences and interfaces",
            "ideal_run_percentage": 0.25,
            "ideal_change_percentage": 0.75,
            "throughput_indicators": ["designs delivered", "iterations completed", "prototypes created"],
        },
        {
            "faethm_code": "SAL.OPS",
            "name": "Sales Operations",
            "description": "Support sales processes and operations",
            "ideal_run_percentage": 0.45,
            "ideal_change_percentage": 0.55,
            "throughput_indicators": ["proposals sent", "deals progressed", "contracts processed"],
        },
        {
            "faethm_code": "FIN.ANA",
            "name": "Finance Analyst",
            "description": "Analyze financial data and provide insights",
            "ideal_run_percentage": 0.55,
            "ideal_change_percentage": 0.45,
            "throughput_indicators": ["forecasts delivered", "reports completed", "analyses performed"],
        },
        {
            "faethm_code": "CUS.EXP",
            "name": "Customer Experience Specialist",
            "description": "Ensure positive customer experiences",
            "ideal_run_percentage": 0.55,
            "ideal_change_percentage": 0.45,
            "throughput_indicators": ["tickets resolved", "CSAT maintained", "customers assisted"],
        },
    ]


class FaethmClient:
    """Client for Faethm API with CSV-based mock data for MVP."""

    def __init__(self):
        # Re-import settings to get fresh values (cache may have been cleared)
        from app.core.config import get_settings
        current_settings = get_settings()

        self.api_url = current_settings.faethm_api_url
        # Check for FaethmPROD env var as primary API key source
        self.api_key = os.environ.get("FaethmPROD", current_settings.faethm_api_key)

        # Determine if we should use mock mode:
        # - If faethm_api_mock is explicitly True, use mock
        # - If API URL is missing or invalid, fallback to mock
        # - If API key is missing, fallback to mock
        self._config_use_mock = current_settings.faethm_api_mock
        self._api_url_valid = bool(
            self.api_url and
            (self.api_url.startswith("http://") or self.api_url.startswith("https://"))
        )
        self._api_key_valid = bool(self.api_key)

        # Use mock if configured OR if API isn't properly configured
        self.use_mock = self._config_use_mock or not (self._api_url_valid and self._api_key_valid)

        # Detailed logging to help debug
        print(f"FaethmClient: faethm_api_mock setting = {self._config_use_mock}")
        print(f"FaethmClient: FAETHM_API_MOCK env = {os.environ.get('FAETHM_API_MOCK', '(not set)')}")
        print(f"FaethmClient: API URL = '{self.api_url}' (valid: {self._api_url_valid})")
        print(f"FaethmClient: API key set = {self._api_key_valid}")
        print(f"FaethmClient: Final use_mock = {self.use_mock}")

        if not self._config_use_mock and self.use_mock:
            # Log that we're falling back to mock due to missing config
            if not self._api_url_valid:
                print("FaethmClient: Falling back to mock - FAETHM_API_URL not set or invalid")
            elif not self._api_key_valid:
                print("FaethmClient: Falling back to mock - FaethmPROD/FAETHM_API_KEY not set")

        self._occupations_cache: Optional[list[dict]] = None

    def get_occupations(self) -> list[dict]:
        """Get list of occupations.

        Always uses CSV data since the Faethm API requires special authentication.
        """
        return _load_occupations_from_csv()

    def get_occupation(self, faethm_code: str) -> dict | None:
        """Get a specific occupation by Faethm code.

        Always uses CSV data since the Faethm API requires special authentication.
        """
        occupations = _load_occupations_from_csv()
        for occ in occupations:
            if occ["faethm_code"] == faethm_code:
                return occ
        return None

    def get_tasks(self, faethm_code: str) -> list[dict]:
        """Get tasks for an occupation from the Faethm API.

        Calls: GET /di/v1/occupations/{occupation_id}/tasks/skills
        Returns tasks with time_percent from Faethm's ontology.

        API Response structure:
        {
            "occupation": {...},
            "occupation_level": null,
            "tasks": [
                {
                    "id": "TK000088",
                    "name": "Task description...",
                    "time_percent": 9.22,
                    "linked_skills": [...]
                },
                ...
            ]
        }
        """
        if self.use_mock:
            print(f"FaethmClient: Mock mode - returning empty tasks for {faethm_code}")
            return []

        try:
            endpoint = f"/di/v1/occupations/{faethm_code}/tasks/skills"
            print(f"FaethmClient: Fetching tasks from API: {endpoint}")

            response = self._call_api(endpoint)

            # Response is a dict with "tasks" key containing the task list
            if not isinstance(response, dict):
                print(f"FaethmClient: Unexpected response type: {type(response)}")
                return []

            task_list = response.get("tasks", [])
            print(f"FaethmClient: Found {len(task_list)} tasks in response")

            tasks = []
            for task_data in task_list:
                if not isinstance(task_data, dict):
                    continue

                # Extract skill names for reference
                linked_skills = task_data.get("linked_skills", [])
                skill_names = [s.get("name", "") for s in linked_skills if isinstance(s, dict)]

                task = {
                    "faethm_task_id": task_data.get("id"),
                    "name": task_data.get("name", ""),
                    "description": "",  # API doesn't provide task description, name IS the description
                    "time_percent": task_data.get("time_percent", 0),
                    "category": self._categorize_task(task_data.get("name", "")),
                    "linked_skills": linked_skills,
                    "skill_names": skill_names,  # Flattened for easy display
                }
                tasks.append(task)

            print(f"FaethmClient: Parsed {len(tasks)} tasks for {faethm_code}")
            return tasks

        except Exception as e:
            import traceback
            print(f"FaethmClient: Error fetching tasks for {faethm_code}: {e}")
            print(f"FaethmClient: Traceback: {traceback.format_exc()}")
            return []

    def _categorize_task(self, task_name: str) -> str:
        """Categorize a task based on its name.

        Returns: 'core', 'support', or 'admin'
        """
        name_lower = task_name.lower()

        # Admin tasks
        admin_keywords = [
            "administrative", "admin", "paperwork", "filing", "scheduling",
            "record", "documentation", "report", "compliance", "audit"
        ]
        if any(kw in name_lower for kw in admin_keywords):
            return "admin"

        # Support tasks
        support_keywords = [
            "support", "assist", "help", "coordinate", "communicate",
            "meeting", "collaborate", "training", "mentoring"
        ]
        if any(kw in name_lower for kw in support_keywords):
            return "support"

        # Default to core
        return "core"

    def get_skills(self, faethm_code: str) -> list[dict]:
        """Get skills for an occupation.

        Note: Skills not included in CSV - could be enriched by LLM.
        """
        return []

    def get_activities(self, faethm_code: str) -> list[dict]:
        """Get work activities for an occupation.

        Note: Activities not included in CSV - could be enriched by LLM.
        """
        return []

    def search_occupations(self, query: str, limit: int = 20) -> list[dict]:
        """Search occupations by name or code.

        Always uses CSV data since the Faethm API requires special authentication.
        The CSV contains all occupation data needed for the application.
        """
        # Always use CSV for search - more reliable and contains full data
        occupations = _load_occupations_from_csv()
        query_lower = query.lower()

        # Search by code prefix or name
        matches = []
        for occ in occupations:
            code = occ.get("faethm_code", "").lower()
            name = occ.get("name", "").lower()
            desc = occ.get("description", "").lower()

            if query_lower in code or query_lower in name or query_lower in desc:
                matches.append(occ)
                if len(matches) >= limit:
                    break

        return matches

    def _call_api(self, endpoint: str) -> dict | list:
        """Make an API call to Faethm."""
        import httpx

        # Safety check - should never hit this if use_mock logic is correct
        if not self._api_url_valid:
            raise ValueError(
                f"Faethm API URL is not configured or invalid: '{self.api_url}'. "
                "Set FAETHM_API_URL environment variable with a valid URL."
            )

        headers = {"Authorization": f"Bearer {self.api_key}"}
        response = httpx.get(f"{self.api_url}{endpoint}", headers=headers)
        response.raise_for_status()
        return response.json()
