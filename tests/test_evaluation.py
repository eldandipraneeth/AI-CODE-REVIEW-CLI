"""Integration / evaluation tests that send fixture code through the real AI reviewer.

Every test in this module is marked ``@pytest.mark.integration`` and will be
**skipped** unless the ``AI_API_KEY`` environment variable is set.  This
lets the unit-test suite run quickly in CI without API credentials while still
providing an automated way to validate review quality.
"""

import json
import os
from pathlib import Path

import pytest

from ai_codereview.chunker import DiffChunk, chunk_diff, parse_unified_diff
from ai_codereview.reviewer import AIReviewer
from ai_codereview.schemas import Category, CodeReviewResult, Severity

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Skip the entire module when no API key is available
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not os.environ.get("AI_API_KEY"),
        reason="AI_API_KEY not set — skipping integration tests",
    ),
]

SEVERITY_ORDER = {
    Severity.LOW: 0,
    Severity.MEDIUM: 1,
    Severity.HIGH: 2,
}


def _fixture_to_diff(fixture_path: Path) -> str:
    """Convert a fixture file into a synthetic unified diff (all lines added)."""
    content = fixture_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    diff_lines = [
        f"diff --git a/{fixture_path.name} b/{fixture_path.name}",
        "new file mode 100644",
        f"--- /dev/null",
        f"+++ b/{fixture_path.name}",
        f"@@ -0,0 +1,{len(lines)} @@",
    ]
    for line in lines:
        diff_lines.append(f"+{line}")
    return "\n".join(diff_lines) + "\n"


def _review_fixture(fixture_name: str) -> CodeReviewResult:
    """Run a full AI review on a fixture file and return the result."""
    fixture_path = FIXTURES_DIR / fixture_name
    diff_text = _fixture_to_diff(fixture_path)
    chunks = chunk_diff(diff_text, max_tokens=4000)

    reviewer = AIReviewer(
        model=os.environ.get("CODEREVIEW_MODEL", "gemini-2.5-flash"),
        api_key=os.environ["AI_API_KEY"],
    )
    return reviewer.review_chunks(chunks)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSQLInjectionFixture:
    """The sql_injection.py fixture should trigger SECURITY issues."""

    def test_detects_security_category(self):
        """At least one issue should be in the SECURITY category."""
        result = _review_fixture("sql_injection.py")
        categories = {issue.category for issue in result.issues}
        assert Category.SECURITY in categories, (
            f"Expected SECURITY category; got {categories}"
        )

    def test_minimum_severity_is_high(self):
        """The most severe issue should be at least HIGH."""
        result = _review_fixture("sql_injection.py")
        security_issues = [i for i in result.issues if i.category == Category.SECURITY]
        assert security_issues, "No security issues detected"
        max_severity = max(security_issues, key=lambda i: SEVERITY_ORDER[i.severity])
        assert SEVERITY_ORDER[max_severity.severity] >= SEVERITY_ORDER[Severity.HIGH]

    def test_result_is_valid(self):
        """The full result object must be a well-formed CodeReviewResult."""
        result = _review_fixture("sql_injection.py")
        assert isinstance(result, CodeReviewResult)
        assert 0 <= result.quality_score <= 10


class TestMissingErrorHandlingFixture:
    """The missing_error_handling.py fixture should trigger ERROR_HANDLING issues."""

    def test_detects_error_handling_category(self):
        result = _review_fixture("missing_error_handling.py")
        categories = {issue.category for issue in result.issues}
        assert Category.ERROR_HANDLING in categories, (
            f"Expected ERROR_HANDLING category; got {categories}"
        )

    def test_minimum_severity_is_medium(self):
        result = _review_fixture("missing_error_handling.py")
        error_issues = [i for i in result.issues if i.category == Category.ERROR_HANDLING]
        assert error_issues, "No error-handling issues detected"
        max_severity = max(error_issues, key=lambda i: SEVERITY_ORDER[i.severity])
        assert SEVERITY_ORDER[max_severity.severity] >= SEVERITY_ORDER[Severity.MEDIUM]

    def test_result_is_valid(self):
        result = _review_fixture("missing_error_handling.py")
        assert isinstance(result, CodeReviewResult)
        assert 0 <= result.quality_score <= 10


class TestPerformanceIssuesFixture:
    """The performance_issues.py fixture should trigger PERFORMANCE issues."""

    def test_detects_performance_category(self):
        result = _review_fixture("performance_issues.py")
        categories = {issue.category for issue in result.issues}
        assert Category.PERFORMANCE in categories, (
            f"Expected PERFORMANCE category; got {categories}"
        )

    def test_minimum_severity_is_low(self):
        result = _review_fixture("performance_issues.py")
        perf_issues = [i for i in result.issues if i.category == Category.PERFORMANCE]
        assert perf_issues, "No performance issues detected"
        max_severity = max(perf_issues, key=lambda i: SEVERITY_ORDER[i.severity])
        assert SEVERITY_ORDER[max_severity.severity] >= SEVERITY_ORDER[Severity.LOW]

    def test_result_is_valid(self):
        result = _review_fixture("performance_issues.py")
        assert isinstance(result, CodeReviewResult)
        assert 0 <= result.quality_score <= 10


class TestExpectedReviewsFixture:
    """Cross-check all fixture files against the expected_reviews.json manifest."""

    def test_all_fixture_expectations_met(self, expected_reviews):
        """For each fixture in expected_reviews.json, verify the AI returns
        at least one issue matching the expected category and severity."""
        for fixture_name, expectations in expected_reviews.items():
            result = _review_fixture(fixture_name)
            categories = {issue.category.value for issue in result.issues}

            for expected_cat in expectations["expected_categories"]:
                assert expected_cat in categories, (
                    f"{fixture_name}: expected category '{expected_cat}' not found in {categories}"
                )

            min_sev = expectations["expected_min_severity"]
            min_sev_order = SEVERITY_ORDER[Severity(min_sev)]
            relevant = [
                i for i in result.issues
                if i.category.value in expectations["expected_categories"]
            ]
            if relevant:
                max_found = max(relevant, key=lambda i: SEVERITY_ORDER[i.severity])
                assert SEVERITY_ORDER[max_found.severity] >= min_sev_order, (
                    f"{fixture_name}: expected severity >= {min_sev}, "
                    f"got {max_found.severity.value}"
                )
