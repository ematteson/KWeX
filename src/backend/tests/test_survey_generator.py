"""Tests for the survey generation service."""

import pytest

from app.models.models import Occupation, Team, Survey, FrictionType, QuestionType
from app.services.survey_generator import SurveyGenerator, QUESTION_TEMPLATES


def test_question_templates_cover_all_dimensions():
    """Verify all 6 friction dimensions have question templates."""
    expected_dimensions = {
        FrictionType.CLARITY,
        FrictionType.TOOLING,
        FrictionType.PROCESS,
        FrictionType.REWORK,
        FrictionType.DELAY,
        FrictionType.SAFETY,
    }
    actual_dimensions = set(QUESTION_TEMPLATES.keys())
    assert actual_dimensions == expected_dimensions


def test_each_dimension_has_core_question():
    """Verify each dimension has at least one core question."""
    for dimension, templates in QUESTION_TEMPLATES.items():
        core_questions = [t for t in templates if t["core"]]
        assert len(core_questions) >= 1, f"Dimension {dimension} missing core question"


def test_generate_survey_creates_questions(db_session):
    """Test that survey generation creates questions."""
    # Setup: Create occupation, team, and survey
    occupation = Occupation(
        name="Product Manager",
        faethm_code="PM001",
        ideal_run_percentage=0.30,
        ideal_change_percentage=0.70,
    )
    db_session.add(occupation)
    db_session.commit()

    team = Team(
        name="Product Team",
        function="Product",
        occupation_id=occupation.id,
        member_count=10,
    )
    db_session.add(team)
    db_session.commit()

    survey = Survey(
        name="Q1 KWeX Survey",
        occupation_id=occupation.id,
        team_id=team.id,
    )
    db_session.add(survey)
    db_session.commit()

    # Generate questions
    generator = SurveyGenerator(db_session)
    questions = generator.generate_survey(survey, max_questions=18)

    # Verify questions were created
    assert len(questions) > 0
    assert len(questions) <= 18

    # Verify questions cover multiple dimensions
    dimensions_covered = {q.dimension for q in questions}
    assert len(dimensions_covered) >= 4  # Should cover most dimensions


def test_generate_survey_respects_max_questions(db_session):
    """Test that survey generation respects max_questions limit."""
    occupation = Occupation(name="Designer", faethm_code="DES001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(name="Design Team", function="Design", occupation_id=occupation.id)
    db_session.add(team)
    db_session.commit()

    survey = Survey(name="Test Survey", occupation_id=occupation.id, team_id=team.id)
    db_session.add(survey)
    db_session.commit()

    generator = SurveyGenerator(db_session)

    # Test with different limits
    questions_10 = generator.generate_survey(survey, max_questions=10)
    assert len(questions_10) <= 10

    # Clear questions for next test
    for q in questions_10:
        db_session.delete(q)
    db_session.commit()

    questions_15 = generator.generate_survey(survey, max_questions=15)
    assert len(questions_15) <= 15


def test_estimate_completion_time():
    """Test completion time estimation."""
    generator = SurveyGenerator(None)

    # 18 questions should estimate around 7-8 minutes
    time_18 = generator.estimate_completion_time(18)
    assert 6 <= time_18 <= 9

    # 10 questions should be faster
    time_10 = generator.estimate_completion_time(10)
    assert time_10 < time_18


def test_questions_have_required_fields(db_session):
    """Test that generated questions have all required fields."""
    occupation = Occupation(name="Finance Analyst", faethm_code="FIN001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(name="Finance Team", function="Finance", occupation_id=occupation.id)
    db_session.add(team)
    db_session.commit()

    survey = Survey(name="Test Survey", occupation_id=occupation.id, team_id=team.id)
    db_session.add(survey)
    db_session.commit()

    generator = SurveyGenerator(db_session)
    questions = generator.generate_survey(survey)

    for q in questions:
        assert q.survey_id == survey.id
        assert q.text is not None and len(q.text) > 0
        assert q.dimension is not None
        assert q.type is not None
        assert q.metric_mapping is not None and len(q.metric_mapping) > 0
        assert q.order >= 0
        assert q.required is True


def test_questions_map_to_metrics(db_session):
    """Test that questions are mapped to Core 4 metrics."""
    occupation = Occupation(name="Sales Ops", faethm_code="SALES001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(name="Sales Team", function="Sales", occupation_id=occupation.id)
    db_session.add(team)
    db_session.commit()

    survey = Survey(name="Test Survey", occupation_id=occupation.id, team_id=team.id)
    db_session.add(survey)
    db_session.commit()

    generator = SurveyGenerator(db_session)
    questions = generator.generate_survey(survey)

    # Collect all metrics mapped
    all_metrics = set()
    for q in questions:
        all_metrics.update(q.metric_mapping)

    # Should cover all 4 core metrics
    expected_metrics = {"flow", "friction", "safety", "portfolio_balance"}
    assert expected_metrics.issubset(all_metrics)
