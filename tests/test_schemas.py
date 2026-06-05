"""Tests for the Pydantic schemas: Severity, Category, ReviewIssue, and CodeReviewResult."""

import json

import pytest
from pydantic import ValidationError

from ai_codereview.schemas import (
    Category,
    CodeReviewResult,
    ReviewIssue,
    Severity,
)


# ---------------------------------------------------------------------------
# Enum tests
# ---------------------------------------------------------------------------

class TestSeverityEnum:
    """Verify that the Severity enum covers exactly the expected members."""

    def test_members(self):
        assert set(Severity) == {Severity.HIGH, Severity.MEDIUM, Severity.LOW}

    @pytest.mark.parametrize("value", ["high", "medium", "low"])
    def test_value_strings(self, value):
        """Each enum member should be usable as a plain string."""
        assert Severity(value) == value

    def test_invalid_value_raises(self):
        with pytest.raises(ValueError):
            Severity("critical")


class TestCategoryEnum:
    """Verify that the Category enum covers all expected categories."""

    EXPECTED = {
        "security",
        "performance",
        "bug",
        "error_handling",
        "style",
        "test_coverage",
        "maintainability",
    }

    def test_members(self):
        assert {c.value for c in Category} == self.EXPECTED

    @pytest.mark.parametrize("value", list(EXPECTED))
    def test_value_strings(self, value):
        assert Category(value) == value

    def test_invalid_value_raises(self):
        with pytest.raises(ValueError):
            Category("readability")


# ---------------------------------------------------------------------------
# ReviewIssue tests
# ---------------------------------------------------------------------------

def _valid_issue_data(**overrides):
    """Return a dict of valid ReviewIssue fields, with optional overrides."""
    base = {
        "file": "src/app.py",
        "line_number": 42,
        "severity": "high",
        "category": "security",
        "explanation": "SQL injection via string concatenation is a critical vulnerability.",
        "suggested_fix": "Use parameterised queries instead.",
    }
    base.update(overrides)
    return base


class TestReviewIssue:
    """Validate ReviewIssue construction, field constraints, and rejection paths."""

    def test_accepts_valid_data(self):
        """A ReviewIssue can be created from fully valid data."""
        issue = ReviewIssue(**_valid_issue_data())
        assert issue.file == "src/app.py"
        assert issue.line_number == 42
        assert issue.severity == Severity.HIGH
        assert issue.category == Category.SECURITY

    def test_rejects_invalid_severity(self):
        """An unknown severity string must cause a ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ReviewIssue(**_valid_issue_data(severity="critical"))
        assert "severity" in str(exc_info.value).lower()

    def test_rejects_invalid_category(self):
        with pytest.raises(ValidationError) as exc_info:
            ReviewIssue(**_valid_issue_data(category="readability"))
        assert "category" in str(exc_info.value).lower()

    def test_rejects_line_number_zero(self):
        """line_number has ge=1 so 0 should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ReviewIssue(**_valid_issue_data(line_number=0))
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("line_number",) for e in errors)

    def test_rejects_negative_line_number(self):
        with pytest.raises(ValidationError):
            ReviewIssue(**_valid_issue_data(line_number=-5))

    def test_rejects_missing_file(self):
        data = _valid_issue_data()
        del data["file"]
        with pytest.raises(ValidationError):
            ReviewIssue(**data)

    def test_rejects_missing_explanation(self):
        data = _valid_issue_data()
        del data["explanation"]
        with pytest.raises(ValidationError):
            ReviewIssue(**data)

    def test_rejects_short_explanation(self):
        """explanation has min_length=10, so short strings must fail."""
        with pytest.raises(ValidationError):
            ReviewIssue(**_valid_issue_data(explanation="short"))

    def test_rejects_short_suggested_fix(self):
        """suggested_fix has min_length=5."""
        with pytest.raises(ValidationError):
            ReviewIssue(**_valid_issue_data(suggested_fix="x"))

    def test_rejects_extra_fields(self):
        """ConfigDict(extra='forbid') should reject unknown fields."""
        with pytest.raises(ValidationError) as exc_info:
            ReviewIssue(**_valid_issue_data(unknown_field="surprise"))
        assert "extra" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "severity",
        [Severity.HIGH, Severity.MEDIUM, Severity.LOW],
    )
    def test_all_severity_levels(self, severity):
        issue = ReviewIssue(**_valid_issue_data(severity=severity))
        assert issue.severity == severity

    @pytest.mark.parametrize("category", list(Category))
    def test_all_categories(self, category):
        issue = ReviewIssue(**_valid_issue_data(category=category))
        assert issue.category == category


# ---------------------------------------------------------------------------
# CodeReviewResult tests
# ---------------------------------------------------------------------------

class TestCodeReviewResult:
    """Validate CodeReviewResult construction, bounds, and serialization."""

    def test_minimal_valid_result(self):
        """A result with no issues and boundary values should be valid."""
        result = CodeReviewResult(
            issues=[],
            summary="No issues found in this changeset.",
            quality_score=10.0,
        )
        assert result.issues == []
        assert result.quality_score == 10.0

    def test_quality_score_lower_bound(self):
        result = CodeReviewResult(issues=[], summary="Score at zero.", quality_score=0.0)
        assert result.quality_score == 0.0

    def test_quality_score_upper_bound(self):
        result = CodeReviewResult(issues=[], summary="Perfect score.", quality_score=10.0)
        assert result.quality_score == 10.0

    def test_rejects_quality_score_above_10(self):
        with pytest.raises(ValidationError) as exc_info:
            CodeReviewResult(issues=[], summary="Too high.", quality_score=10.1)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("quality_score",) for e in errors)

    def test_rejects_quality_score_below_0(self):
        with pytest.raises(ValidationError):
            CodeReviewResult(issues=[], summary="Negative.", quality_score=-0.1)

    def test_rejects_extra_fields(self):
        with pytest.raises(ValidationError):
            CodeReviewResult(
                issues=[],
                summary="Extra field test.",
                quality_score=5.0,
                reviewer="bot",
            )

    def test_serialization_round_trip(self, mock_review_result):
        """Serialising to JSON and deserialising should produce an equal object."""
        json_str = mock_review_result.model_dump_json()
        restored = CodeReviewResult.model_validate_json(json_str)
        assert restored == mock_review_result

    def test_dict_round_trip(self, mock_review_result):
        """model_dump / model_validate round-trip via dict."""
        data = mock_review_result.model_dump()
        assert isinstance(data, dict)
        restored = CodeReviewResult.model_validate(data)
        assert restored == mock_review_result

    def test_json_is_valid_json(self, mock_review_result):
        """model_dump_json should return parseable JSON."""
        raw = mock_review_result.model_dump_json()
        parsed = json.loads(raw)
        assert "issues" in parsed
        assert "summary" in parsed
        assert "quality_score" in parsed

    def test_issues_default_to_empty_list(self):
        result = CodeReviewResult(summary="Default issues.", quality_score=7.0)
        assert result.issues == []

    def test_result_with_multiple_issues(self):
        """Ensure a result with several issues preserves order and count."""
        issues = [
            ReviewIssue(**_valid_issue_data(line_number=i, file=f"file_{i}.py"))
            for i in range(1, 6)
        ]
        result = CodeReviewResult(
            issues=issues,
            summary="Multiple issues found.",
            quality_score=3.0,
        )
        assert len(result.issues) == 5
        assert result.issues[0].file == "file_1.py"
        assert result.issues[4].file == "file_5.py"
