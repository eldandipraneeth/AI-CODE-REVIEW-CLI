"""Tests for output formatters: JSON, Markdown, and Rich console output."""

import json
from io import StringIO

import pytest
from rich.console import Console

from ai_codereview.formatter import format_json, format_markdown, format_review
from ai_codereview.schemas import CodeReviewResult, ReviewIssue, Severity, Category


# ---------------------------------------------------------------------------
# format_json
# ---------------------------------------------------------------------------

class TestFormatJson:
    """Verify that format_json produces valid, schema-conformant JSON."""

    def test_returns_valid_json(self, mock_review_result):
        """The returned string must be parseable JSON."""
        output = format_json(mock_review_result, elapsed=1.23)
        parsed = json.loads(output)
        assert isinstance(parsed, dict)

    def test_contains_issues_key(self, mock_review_result):
        """The JSON must include an 'issues' array."""
        parsed = json.loads(format_json(mock_review_result, elapsed=1.23))
        assert "issues" in parsed

    def test_contains_summary(self, mock_review_result):
        parsed = json.loads(format_json(mock_review_result, elapsed=1.23))
        assert "summary" in parsed

    def test_contains_quality_score(self, mock_review_result):
        parsed = json.loads(format_json(mock_review_result, elapsed=1.23))
        assert "quality_score" in parsed

    def test_issue_fields_present(self, mock_review_result):
        """Each issue in the JSON should carry all expected fields."""
        parsed = json.loads(format_json(mock_review_result, elapsed=1.23))
        for issue in parsed.get("issues", []):
            for key in ("file", "line_number", "severity", "category", "explanation", "suggested_fix"):
                assert key in issue, f"Missing key: {key}"

    def test_empty_issues(self):
        """A result with zero issues should still yield valid JSON."""
        result = CodeReviewResult(issues=[], summary="Clean code.", quality_score=9.5)
        output = format_json(result, elapsed=0.5)
        parsed = json.loads(output)
        assert parsed["issues"] == []

    def test_metadata_included(self, mock_review_result):
        """The JSON should include metadata with counts and elapsed time."""
        parsed = json.loads(format_json(mock_review_result, elapsed=2.5))
        assert "metadata" in parsed
        meta = parsed["metadata"]
        assert "elapsed_seconds" in meta
        assert "issue_count" in meta
        assert isinstance(meta["elapsed_seconds"], (int, float))

    def test_issue_count_matches(self, mock_review_result):
        """Metadata issue_count should match the number of issues."""
        parsed = json.loads(format_json(mock_review_result, elapsed=1.0))
        assert parsed["metadata"]["issue_count"] == len(parsed["issues"])


# ---------------------------------------------------------------------------
# format_markdown
# ---------------------------------------------------------------------------

class TestFormatMarkdown:
    """Verify Markdown output structure and content."""

    def test_returns_string(self, mock_review_result):
        md = format_markdown(mock_review_result)
        assert isinstance(md, str)

    def test_contains_severity_markers(self, mock_review_result):
        """The Markdown should mention severity levels for the issues present."""
        md = format_markdown(mock_review_result).lower()
        assert "high" in md
        assert "medium" in md
        assert "low" in md

    def test_contains_file_references(self, mock_review_result):
        """Each file mentioned in an issue should appear in the Markdown."""
        md = format_markdown(mock_review_result)
        for issue in mock_review_result.issues:
            assert issue.file in md

    def test_contains_quality_score(self, mock_review_result):
        md = format_markdown(mock_review_result)
        assert str(mock_review_result.quality_score) in md

    def test_empty_issues_still_renders(self):
        result = CodeReviewResult(issues=[], summary="All good.", quality_score=10.0)
        md = format_markdown(result)
        assert isinstance(md, str)
        assert len(md) > 0

    def test_markdown_headings_present(self, mock_review_result):
        """There should be at least one Markdown heading."""
        md = format_markdown(mock_review_result)
        assert "#" in md

    def test_emoji_indicators_present(self, mock_review_result):
        """Severity emojis should appear in the output."""
        md = format_markdown(mock_review_result)
        assert "🔴" in md  # HIGH
        assert "🟡" in md  # MEDIUM
        assert "🟢" in md  # LOW


# ---------------------------------------------------------------------------
# format_review (Rich console)
# ---------------------------------------------------------------------------

class TestFormatReview:
    """Verify the Rich-based console formatter by capturing its output."""

    def _capture_review(self, result, elapsed=1.5):
        """Helper: run format_review and capture its output as plain text."""
        buf = StringIO()
        console = Console(file=buf, force_terminal=True, width=120)
        format_review(result, elapsed, console=console)
        return buf.getvalue()

    def test_does_not_raise(self, mock_review_result):
        """format_review should run without errors."""
        try:
            self._capture_review(mock_review_result)
        except Exception as exc:
            pytest.fail(f"format_review raised: {exc}")

    def test_output_contains_file_names(self, mock_review_result):
        """Captured output should mention the file names from the issues."""
        output = self._capture_review(mock_review_result)
        for issue in mock_review_result.issues:
            assert issue.file in output

    def test_output_contains_severity_labels(self, mock_review_result):
        """Severity labels HIGH/MEDIUM/LOW should appear."""
        output = self._capture_review(mock_review_result)
        assert "HIGH" in output
        assert "MEDIUM" in output
        assert "LOW" in output

    def test_output_contains_issue_count(self, mock_review_result):
        """The footer should show the issue count."""
        output = self._capture_review(mock_review_result)
        assert "3 issues" in output

    def test_output_contains_timing(self, mock_review_result):
        """The footer should show the elapsed time."""
        output = self._capture_review(mock_review_result, elapsed=2.3)
        assert "2.3s" in output

    def test_empty_result_prints_no_issues(self):
        """Even with no issues the formatter should produce output."""
        result = CodeReviewResult(issues=[], summary="No issues.", quality_score=10.0)
        output = self._capture_review(result, elapsed=0.1)
        assert len(output) > 0
        assert "No issues found" in output

    def test_output_contains_quality_score(self, mock_review_result):
        """The header panel should include the quality score."""
        output = self._capture_review(mock_review_result)
        assert str(mock_review_result.quality_score) in output
