"""Tests for the AIReviewer class: API interaction, aggregation, and error handling."""

from unittest.mock import MagicMock, patch

import pytest

from ai_codereview.chunker import DiffChunk
from ai_codereview.reviewer import AIReviewer, ReviewError
from ai_codereview.schemas import (
    Category,
    CodeReviewResult,
    FileReviewResult,
    ReviewIssue,
    Severity,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_chunk(file_path="test.py", content="+x = 1", start_line=1, end_line=1):
    """Create a minimal DiffChunk for testing."""
    return DiffChunk(
        file_path=file_path,
        start_line=start_line,
        end_line=end_line,
        content=content,
        context="",
        language="python",
    )


def _make_file_review_result(
    file_path="test.py",
    line_number=10,
    severity=Severity.HIGH,
    category=Category.SECURITY,
):
    """Build a FileReviewResult for mock API responses."""
    return FileReviewResult(
        issues=[
            ReviewIssue(
                file=file_path,
                line_number=line_number,
                severity=severity,
                category=category,
                explanation="SQL injection via string concatenation is dangerous.",
                suggested_fix="Use parameterised queries with placeholders.",
            ),
        ],
        chunk_summary="Found a critical issue.",
        chunk_quality_score=3.0,
    )


def _make_mock_response(result):
    """Build a mock OpenAI API response that returns the given FileReviewResult."""
    mock_message = MagicMock()
    mock_message.parsed = result
    mock_message.content = result.model_dump_json()
    mock_message.refusal = None

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    return mock_response


def _make_reviewer_with_mock(mock_client):
    """Create an AIReviewer with a mocked OpenAI client."""
    reviewer = AIReviewer.__new__(AIReviewer)
    reviewer._client = mock_client
    reviewer.model = "gemini-2.5-flash"
    reviewer.temperature = 0.1
    reviewer.max_retries = 1
    reviewer._use_beta_parse = True
    return reviewer


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestAIReviewer:
    """Test suite for AIReviewer.review_chunks."""

    def test_review_single_chunk_returns_valid_result(self):
        """Reviewing one chunk should return a CodeReviewResult."""
        result_a = _make_file_review_result()
        client = MagicMock()
        client.beta.chat.completions.parse.return_value = _make_mock_response(result_a)

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk()]
        result = reviewer.review_chunks(chunks)

        assert isinstance(result, CodeReviewResult)
        assert len(result.issues) > 0
        assert 0 <= result.quality_score <= 10

    def test_review_multiple_chunks_aggregates(self):
        """When multiple chunks are reviewed, results should be aggregated."""
        result_a = _make_file_review_result(file_path="a.py", line_number=1)
        result_b = _make_file_review_result(
            file_path="b.py",
            line_number=5,
            severity=Severity.LOW,
            category=Category.STYLE,
        )
        # Override explanation/fix for result_b to meet min_length
        result_b.issues[0].explanation = "Variable name is not descriptive enough for readability."
        result_b.issues[0].suggested_fix = "Rename 'x' to 'user_count' for clarity."

        client = MagicMock()
        client.beta.chat.completions.parse.side_effect = [
            _make_mock_response(result_a),
            _make_mock_response(result_b),
        ]

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk(file_path="a.py"), _make_chunk(file_path="b.py")]
        result = reviewer.review_chunks(chunks)

        assert isinstance(result, CodeReviewResult)
        file_set = {issue.file for issue in result.issues}
        assert "a.py" in file_set
        assert "b.py" in file_set

    def test_empty_chunks_returns_empty_result(self):
        """Passing no chunks should return a result with no issues."""
        client = MagicMock()
        reviewer = _make_reviewer_with_mock(client)

        result = reviewer.review_chunks([])

        assert isinstance(result, CodeReviewResult)
        assert result.issues == []
        assert result.quality_score == 10.0

    def test_api_error_is_handled_gracefully(self):
        """When the OpenAI API raises, the reviewer should handle it gracefully."""
        client = MagicMock()
        client.beta.chat.completions.parse.side_effect = Exception("API rate limit exceeded")

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk()]

        # Should not crash — either returns a fallback result or raises ReviewError
        try:
            result = reviewer.review_chunks(chunks)
            assert isinstance(result, CodeReviewResult)
        except (ReviewError, Exception) as exc:
            assert "API rate limit" in str(exc) or "Failed" in str(exc)

    def test_api_refusal_is_handled(self):
        """If the model refuses the request, the reviewer should handle it."""
        mock_message = MagicMock()
        mock_message.parsed = None
        mock_message.content = None
        mock_message.refusal = "I cannot review this code."

        mock_choice = MagicMock()
        mock_choice.message = mock_message

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        client = MagicMock()
        client.beta.chat.completions.parse.return_value = mock_response

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk()]

        # Should handle refusal gracefully
        result = reviewer.review_chunks(chunks)
        assert isinstance(result, CodeReviewResult)
        # Refusal should result in empty issues for that chunk
        assert len(result.issues) == 0

    def test_reviewer_calls_api_with_correct_model(self):
        """The reviewer should pass the configured model name to the API."""
        result_a = _make_file_review_result()
        client = MagicMock()
        client.beta.chat.completions.parse.return_value = _make_mock_response(result_a)

        reviewer = _make_reviewer_with_mock(client)
        reviewer.model = "gemini-2.5-flash"

        chunks = [_make_chunk()]
        reviewer.review_chunks(chunks)

        call_kwargs = client.beta.chat.completions.parse.call_args
        assert call_kwargs is not None
        assert call_kwargs.kwargs.get("model") == "gemini-2.5-flash"

    def test_result_quality_score_in_range(self):
        """The returned quality_score must be between 0 and 10."""
        result_a = _make_file_review_result()
        client = MagicMock()
        client.beta.chat.completions.parse.return_value = _make_mock_response(result_a)

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk()]
        result = reviewer.review_chunks(chunks)

        assert 0 <= result.quality_score <= 10

    def test_deduplication_removes_same_file_line_category(self):
        """Issues with same file+line+category should be deduplicated."""
        same_issue = _make_file_review_result(file_path="dup.py", line_number=10)

        client = MagicMock()
        client.beta.chat.completions.parse.side_effect = [
            _make_mock_response(same_issue),
            _make_mock_response(same_issue),
        ]

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk(file_path="dup.py"), _make_chunk(file_path="dup.py")]
        result = reviewer.review_chunks(chunks)

        # Should be deduplicated to 1 issue
        dup_issues = [i for i in result.issues if i.file == "dup.py" and i.line_number == 10]
        assert len(dup_issues) == 1

    def test_progress_callback_called(self):
        """The on_progress callback should be called for each chunk."""
        result_a = _make_file_review_result()
        client = MagicMock()
        client.beta.chat.completions.parse.return_value = _make_mock_response(result_a)

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk(), _make_chunk(), _make_chunk()]

        progress_calls = []
        def on_progress(current, total):
            progress_calls.append((current, total))

        reviewer.review_chunks(chunks, on_progress=on_progress)

        assert len(progress_calls) == 3
        assert progress_calls[-1] == (3, 3)

    def test_issues_sorted_by_severity(self):
        """Issues should be sorted HIGH → MEDIUM → LOW."""
        low_result = FileReviewResult(
            issues=[
                ReviewIssue(
                    file="c.py", line_number=1, severity=Severity.LOW,
                    category=Category.STYLE,
                    explanation="Minor style issue that could improve readability.",
                    suggested_fix="Apply consistent formatting.",
                )
            ],
            chunk_summary="Low issue",
            chunk_quality_score=8.0,
        )
        high_result = FileReviewResult(
            issues=[
                ReviewIssue(
                    file="a.py", line_number=1, severity=Severity.HIGH,
                    category=Category.SECURITY,
                    explanation="Critical security vulnerability found in this code.",
                    suggested_fix="Fix the security issue immediately.",
                )
            ],
            chunk_summary="High issue",
            chunk_quality_score=2.0,
        )

        client = MagicMock()
        client.beta.chat.completions.parse.side_effect = [
            _make_mock_response(low_result),
            _make_mock_response(high_result),
        ]

        reviewer = _make_reviewer_with_mock(client)
        chunks = [_make_chunk(file_path="c.py"), _make_chunk(file_path="a.py")]
        result = reviewer.review_chunks(chunks)

        assert result.issues[0].severity == Severity.HIGH
        assert result.issues[-1].severity == Severity.LOW
