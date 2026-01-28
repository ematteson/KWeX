"""Tests for the RICE scoring and opportunity generation service."""

import pytest

from app.models.models import (
    Occupation,
    Team,
    Survey,
    Question,
    Response,
    Answer,
    FrictionType,
    QuestionType,
    OpportunityStatus,
)
from app.services.opportunity_generator import (
    OpportunityGenerator,
    calculate_rice_score,
    IMPACT_SCALE,
    CONFIDENCE_SCALE,
)


def test_rice_score_calculation():
    """Test RICE score formula: (Reach × Impact × Confidence) / Effort."""
    # Basic calculation
    score = calculate_rice_score(reach=10, impact=2.0, confidence=0.8, effort=2.0)
    expected = (10 * 2.0 * 0.8) / 2.0
    assert score == expected == 8.0

    # Zero effort should return 0
    score = calculate_rice_score(reach=10, impact=2.0, confidence=0.8, effort=0)
    assert score == 0.0

    # Negative effort should return 0
    score = calculate_rice_score(reach=10, impact=2.0, confidence=0.8, effort=-1)
    assert score == 0.0


def test_rice_score_with_different_impacts():
    """Test RICE scores scale correctly with impact values."""
    base_params = {"reach": 10, "confidence": 1.0, "effort": 1.0}

    score_minimal = calculate_rice_score(impact=IMPACT_SCALE["minimal"], **base_params)
    score_low = calculate_rice_score(impact=IMPACT_SCALE["low"], **base_params)
    score_medium = calculate_rice_score(impact=IMPACT_SCALE["medium"], **base_params)
    score_high = calculate_rice_score(impact=IMPACT_SCALE["high"], **base_params)
    score_massive = calculate_rice_score(impact=IMPACT_SCALE["massive"], **base_params)

    # Scores should increase with impact
    assert score_minimal < score_low < score_medium < score_high < score_massive


def test_rice_score_with_different_confidence():
    """Test RICE scores scale correctly with confidence values."""
    base_params = {"reach": 10, "impact": 2.0, "effort": 2.0}

    score_low = calculate_rice_score(confidence=CONFIDENCE_SCALE["low"], **base_params)
    score_medium = calculate_rice_score(confidence=CONFIDENCE_SCALE["medium"], **base_params)
    score_high = calculate_rice_score(confidence=CONFIDENCE_SCALE["high"], **base_params)

    # Scores should increase with confidence
    assert score_low < score_medium < score_high


def test_rice_score_effort_relationship():
    """Test RICE score decreases as effort increases."""
    base_params = {"reach": 10, "impact": 2.0, "confidence": 0.8}

    score_low_effort = calculate_rice_score(effort=1.0, **base_params)
    score_medium_effort = calculate_rice_score(effort=2.0, **base_params)
    score_high_effort = calculate_rice_score(effort=4.0, **base_params)

    # Score should decrease with higher effort
    assert score_low_effort > score_medium_effort > score_high_effort


def test_generate_opportunities_creates_from_low_scores(db_session):
    """Test that opportunities are generated from friction dimensions with low scores."""
    # Setup: Create occupation, team, and survey
    occupation = Occupation(name="Engineer", faethm_code="ENG001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(
        name="Engineering Team",
        function="Engineering",
        occupation_id=occupation.id,
        member_count=10,
    )
    db_session.add(team)
    db_session.commit()

    survey = Survey(
        name="Q1 Survey",
        occupation_id=occupation.id,
        team_id=team.id,
    )
    db_session.add(survey)
    db_session.commit()

    # Create questions for different friction dimensions
    questions = [
        Question(
            survey_id=survey.id,
            text="How clear are requirements?",
            dimension=FrictionType.CLARITY,
            type=QuestionType.LIKERT_5,
            order=0,
        ),
        Question(
            survey_id=survey.id,
            text="How effective are your tools?",
            dimension=FrictionType.TOOLING,
            type=QuestionType.LIKERT_5,
            order=1,
        ),
    ]
    for q in questions:
        db_session.add(q)
    db_session.commit()

    # Create responses with low scores for CLARITY, high for TOOLING
    for i in range(8):  # 8 respondents
        response = Response(survey_id=survey.id, is_complete=True)
        db_session.add(response)
        db_session.commit()

        # Low clarity scores (1-2)
        clarity_answer = Answer(
            response_id=response.id,
            question_id=questions[0].id,
            value="2",
            numeric_value=2.0,
        )
        # High tooling scores (4-5)
        tooling_answer = Answer(
            response_id=response.id,
            question_id=questions[1].id,
            value="4",
            numeric_value=4.0,
        )
        db_session.add(clarity_answer)
        db_session.add(tooling_answer)
    db_session.commit()

    # Generate opportunities
    generator = OpportunityGenerator(db_session)
    opportunities = generator.generate_opportunities(survey)

    # Should generate opportunity for low clarity scores but not for high tooling scores
    assert len(opportunities) >= 1
    clarity_opps = [o for o in opportunities if o.friction_type == FrictionType.CLARITY]
    assert len(clarity_opps) == 1

    # Tooling should NOT generate an opportunity (scores are high)
    tooling_opps = [o for o in opportunities if o.friction_type == FrictionType.TOOLING]
    assert len(tooling_opps) == 0


def test_opportunities_sorted_by_rice_score(db_session):
    """Test that generated opportunities are sorted by RICE score descending."""
    occupation = Occupation(name="Analyst", faethm_code="AN001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(
        name="Analysis Team",
        function="Analysis",
        occupation_id=occupation.id,
        member_count=15,
    )
    db_session.add(team)
    db_session.commit()

    survey = Survey(
        name="Test Survey",
        occupation_id=occupation.id,
        team_id=team.id,
    )
    db_session.add(survey)
    db_session.commit()

    # Create questions with different friction types
    questions = [
        Question(
            survey_id=survey.id,
            text="Clarity question",
            dimension=FrictionType.CLARITY,
            type=QuestionType.LIKERT_5,
            order=0,
        ),
        Question(
            survey_id=survey.id,
            text="Process question",
            dimension=FrictionType.PROCESS,
            type=QuestionType.LIKERT_5,
            order=1,
        ),
        Question(
            survey_id=survey.id,
            text="Rework question",
            dimension=FrictionType.REWORK,
            type=QuestionType.LIKERT_5,
            order=2,
        ),
    ]
    for q in questions:
        db_session.add(q)
    db_session.commit()

    # Create responses with varying low scores
    for i in range(10):
        response = Response(survey_id=survey.id, is_complete=True)
        db_session.add(response)
        db_session.commit()

        # Very low clarity (1) - highest priority
        db_session.add(
            Answer(
                response_id=response.id,
                question_id=questions[0].id,
                value="1",
                numeric_value=1.0,
            )
        )
        # Medium-low process (2.5)
        db_session.add(
            Answer(
                response_id=response.id,
                question_id=questions[1].id,
                value="2",
                numeric_value=2.0,
            )
        )
        # Borderline rework (2.8)
        db_session.add(
            Answer(
                response_id=response.id,
                question_id=questions[2].id,
                value="3",
                numeric_value=3.0,
            )
        )
    db_session.commit()

    generator = OpportunityGenerator(db_session)
    opportunities = generator.generate_opportunities(survey)

    # Verify sorted by RICE score
    for i in range(len(opportunities) - 1):
        assert opportunities[i].rice_score >= opportunities[i + 1].rice_score


def test_opportunity_status_workflow(db_session):
    """Test opportunity status transitions."""
    occupation = Occupation(name="PM", faethm_code="PM001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(name="Product", function="Product", occupation_id=occupation.id, member_count=5)
    db_session.add(team)
    db_session.commit()

    survey = Survey(name="Test", occupation_id=occupation.id, team_id=team.id)
    db_session.add(survey)
    db_session.commit()

    question = Question(
        survey_id=survey.id,
        text="Test question",
        dimension=FrictionType.DELAY,
        type=QuestionType.LIKERT_5,
        order=0,
    )
    db_session.add(question)
    db_session.commit()

    # Create responses
    for _ in range(7):
        response = Response(survey_id=survey.id, is_complete=True)
        db_session.add(response)
        db_session.commit()
        db_session.add(
            Answer(
                response_id=response.id,
                question_id=question.id,
                value="2",
                numeric_value=2.0,
            )
        )
    db_session.commit()

    generator = OpportunityGenerator(db_session)
    opportunities = generator.generate_opportunities(survey)
    assert len(opportunities) > 0

    opp = opportunities[0]
    assert opp.status == OpportunityStatus.IDENTIFIED

    # Transition to in_progress
    generator.update_opportunity_status(opp, OpportunityStatus.IN_PROGRESS)
    assert opp.status == OpportunityStatus.IN_PROGRESS

    # Transition to completed
    generator.update_opportunity_status(opp, OpportunityStatus.COMPLETED)
    assert opp.status == OpportunityStatus.COMPLETED
    assert opp.completed_at is not None


def test_recalculate_rice_score(db_session):
    """Test RICE score recalculation after factor updates."""
    occupation = Occupation(name="Designer", faethm_code="DES001")
    db_session.add(occupation)
    db_session.commit()

    team = Team(name="Design", function="Design", occupation_id=occupation.id, member_count=8)
    db_session.add(team)
    db_session.commit()

    survey = Survey(name="Test", occupation_id=occupation.id, team_id=team.id)
    db_session.add(survey)
    db_session.commit()

    question = Question(
        survey_id=survey.id,
        text="Test",
        dimension=FrictionType.TOOLING,
        type=QuestionType.LIKERT_5,
        order=0,
    )
    db_session.add(question)
    db_session.commit()

    for _ in range(7):
        response = Response(survey_id=survey.id, is_complete=True)
        db_session.add(response)
        db_session.commit()
        db_session.add(
            Answer(
                response_id=response.id,
                question_id=question.id,
                value="1",
                numeric_value=1.0,
            )
        )
    db_session.commit()

    generator = OpportunityGenerator(db_session)
    opportunities = generator.generate_opportunities(survey)
    opp = opportunities[0]

    original_score = opp.rice_score

    # Update effort (should increase RICE score since effort decreases)
    opp.effort = opp.effort / 2
    new_score = generator.recalculate_rice_score(opp)

    assert new_score > original_score
    assert opp.rice_score == new_score
