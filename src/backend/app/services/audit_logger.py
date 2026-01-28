"""Audit logging service for tracking data access and modifications."""

import logging
import json
from datetime import datetime
from enum import Enum
from typing import Optional, Any
from dataclasses import dataclass, asdict

# Configure audit logger
audit_logger = logging.getLogger("kwex.audit")
audit_logger.setLevel(logging.INFO)


class AuditAction(str, Enum):
    """Types of auditable actions."""
    # Read operations
    VIEW_TEAM_METRICS = "view_team_metrics"
    VIEW_METRICS_HISTORY = "view_metrics_history"
    VIEW_FRICTION_BREAKDOWN = "view_friction_breakdown"
    VIEW_OPPORTUNITIES = "view_opportunities"
    VIEW_SURVEY = "view_survey"
    VIEW_SURVEY_STATS = "view_survey_stats"
    VIEW_EXECUTIVE_DASHBOARD = "view_executive_dashboard"

    # Survey operations
    START_SURVEY_RESPONSE = "start_survey_response"
    SAVE_SURVEY_PROGRESS = "save_survey_progress"
    SUBMIT_SURVEY_RESPONSE = "submit_survey_response"

    # Management operations
    CREATE_SURVEY = "create_survey"
    ACTIVATE_SURVEY = "activate_survey"
    CLOSE_SURVEY = "close_survey"
    GENERATE_QUESTIONS = "generate_questions"
    GENERATE_SURVEY_LINK = "generate_survey_link"

    # Opportunity operations
    UPDATE_OPPORTUNITY = "update_opportunity"
    GENERATE_OPPORTUNITIES = "generate_opportunities"

    # Metrics operations
    CALCULATE_METRICS = "calculate_metrics"

    # Team operations
    CREATE_TEAM = "create_team"
    UPDATE_TEAM = "update_team"

    # Export operations
    EXPORT_DATA = "export_data"


class DataSensitivity(str, Enum):
    """Sensitivity level of accessed data."""
    LOW = "low"           # Non-sensitive (public info)
    MEDIUM = "medium"     # Team-level aggregated data
    HIGH = "high"         # Privacy-protected data (requires 7 respondents)
    CRITICAL = "critical" # Individual response data (should never be accessed directly)


@dataclass
class AuditEntry:
    """Represents an audit log entry."""
    timestamp: str
    action: str
    sensitivity: str
    team_id: Optional[str] = None
    survey_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    success: bool = True
    details: Optional[dict] = None
    privacy_check_passed: Optional[bool] = None
    respondent_count: Optional[int] = None

    def to_json(self) -> str:
        """Convert entry to JSON string."""
        return json.dumps(asdict(self), default=str)


class AuditLogger:
    """Service for logging audit events."""

    def __init__(self):
        self.logger = audit_logger

    def log(
        self,
        action: AuditAction,
        sensitivity: DataSensitivity,
        team_id: Optional[str] = None,
        survey_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
        success: bool = True,
        details: Optional[dict] = None,
        privacy_check_passed: Optional[bool] = None,
        respondent_count: Optional[int] = None,
    ) -> None:
        """Log an audit event."""
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            action=action.value,
            sensitivity=sensitivity.value,
            team_id=team_id,
            survey_id=survey_id,
            user_agent=user_agent,
            ip_address=ip_address,
            request_id=request_id,
            success=success,
            details=details,
            privacy_check_passed=privacy_check_passed,
            respondent_count=respondent_count,
        )

        # Log at appropriate level
        if not success:
            self.logger.warning(entry.to_json())
        elif sensitivity in (DataSensitivity.HIGH, DataSensitivity.CRITICAL):
            self.logger.info(entry.to_json())
        else:
            self.logger.debug(entry.to_json())

    def log_metrics_access(
        self,
        team_id: str,
        action: AuditAction,
        privacy_check_passed: bool,
        respondent_count: int,
        request_info: Optional[dict] = None,
    ) -> None:
        """Log access to metrics data with privacy context."""
        self.log(
            action=action,
            sensitivity=DataSensitivity.HIGH if privacy_check_passed else DataSensitivity.CRITICAL,
            team_id=team_id,
            user_agent=request_info.get("user_agent") if request_info else None,
            ip_address=request_info.get("ip_address") if request_info else None,
            request_id=request_info.get("request_id") if request_info else None,
            success=True,
            privacy_check_passed=privacy_check_passed,
            respondent_count=respondent_count,
        )

    def log_survey_action(
        self,
        action: AuditAction,
        survey_id: str,
        team_id: Optional[str] = None,
        request_info: Optional[dict] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Log survey-related actions."""
        self.log(
            action=action,
            sensitivity=DataSensitivity.MEDIUM,
            team_id=team_id,
            survey_id=survey_id,
            user_agent=request_info.get("user_agent") if request_info else None,
            ip_address=request_info.get("ip_address") if request_info else None,
            request_id=request_info.get("request_id") if request_info else None,
            success=True,
            details=details,
        )

    def log_response_action(
        self,
        action: AuditAction,
        survey_id: str,
        request_info: Optional[dict] = None,
        success: bool = True,
    ) -> None:
        """Log survey response actions (anonymous - no user tracking)."""
        self.log(
            action=action,
            sensitivity=DataSensitivity.CRITICAL,
            survey_id=survey_id,
            # Note: We deliberately do NOT log IP/user-agent for response actions
            # to maintain anonymity
            success=success,
        )

    def log_opportunity_action(
        self,
        action: AuditAction,
        team_id: str,
        opportunity_id: Optional[str] = None,
        request_info: Optional[dict] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Log opportunity management actions."""
        self.log(
            action=action,
            sensitivity=DataSensitivity.MEDIUM,
            team_id=team_id,
            user_agent=request_info.get("user_agent") if request_info else None,
            ip_address=request_info.get("ip_address") if request_info else None,
            request_id=request_info.get("request_id") if request_info else None,
            success=True,
            details={"opportunity_id": opportunity_id, **(details or {})},
        )


# Singleton instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get the audit logger singleton."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
