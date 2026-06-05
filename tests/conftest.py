"""Shared pytest fixtures for the ai-codereview test suite."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from ai_codereview.schemas import (
    Category,
    CodeReviewResult,
    ReviewIssue,
    Severity,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def mock_review_result():
    """Return a sample CodeReviewResult with representative issues.

    Provides a fully-populated review result covering multiple severity
    levels and categories so that downstream tests (formatter, CLI, etc.)
    can exercise all rendering paths.
    """
    return CodeReviewResult(
        issues=[
            ReviewIssue(
                file="src/app.py",
                line_number=42,
                severity=Severity.HIGH,
                category=Category.SECURITY,
                explanation="SQL query is built via string concatenation, allowing injection attacks.",
                suggested_fix="Use parameterised queries: cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
            ),
            ReviewIssue(
                file="src/utils.py",
                line_number=15,
                severity=Severity.MEDIUM,
                category=Category.ERROR_HANDLING,
                explanation="Network call result is used without checking the HTTP status code first.",
                suggested_fix="Add response.raise_for_status() before accessing the JSON body.",
            ),
            ReviewIssue(
                file="src/worker.py",
                line_number=88,
                severity=Severity.LOW,
                category=Category.PERFORMANCE,
                explanation="Quadratic list membership check inside a loop over a large dataset.",
                suggested_fix="Convert the result list to a set for O(1) lookups.",
            ),
        ],
        summary="The code has a critical SQL injection vulnerability, a missing HTTP error check, and a performance concern.",
        quality_score=4.5,
    )


@pytest.fixture
def sample_diff_text():
    """Return a sample unified diff string covering two files.

    The diff intentionally includes both an addition-only hunk and a
    modification hunk so that tests can verify multi-file parsing.
    """
    return (
        "diff --git a/src/app.py b/src/app.py\n"
        "index abc1234..def5678 100644\n"
        "--- a/src/app.py\n"
        "+++ b/src/app.py\n"
        "@@ -10,6 +10,8 @@ def main():\n"
        "     config = load_config()\n"
        "     db = connect(config)\n"
        "+    logger.info('Starting application')\n"
        "+    logger.debug('Config: %s', config)\n"
        "     app.run()\n"
        " \n"
        " def helper():\n"
        "diff --git a/src/utils.py b/src/utils.py\n"
        "index 1111111..2222222 100644\n"
        "--- a/src/utils.py\n"
        "+++ b/src/utils.py\n"
        "@@ -5,7 +5,7 @@ import os\n"
        " \n"
        " def get_env(name):\n"
        "-    return os.environ[name]\n"
        "+    return os.environ.get(name, '')\n"
        " \n"
        " def parse_int(value):\n"
    )


@pytest.fixture
def mock_openai_client(mock_review_result):
    """Return a mocked OpenAI client whose chat completion returns valid structured output.

    The mock is wired to return a serialised ``CodeReviewResult`` that
    matches ``mock_review_result``, which lets us test the reviewer
    end-to-end without hitting the real API.
    """
    result_json = mock_review_result.model_dump_json()

    # Build the nested mock to mirror the OpenAI response structure:
    #   client.beta.chat.completions.parse(...)  -> response
    #   response.choices[0].message.parsed       -> CodeReviewResult
    #   response.choices[0].message.content      -> JSON string

    mock_message = MagicMock()
    mock_message.parsed = mock_review_result
    mock_message.content = result_json
    mock_message.refusal = None

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.beta.chat.completions.parse.return_value = mock_response

    return mock_client


@pytest.fixture
def sample_python_diff():
    """Return a unified diff with Python function boundaries for chunker tests."""
    return (
        "diff --git a/module.py b/module.py\n"
        "index aaa..bbb 100644\n"
        "--- a/module.py\n"
        "+++ b/module.py\n"
        "@@ -1,20 +1,22 @@\n"
        " import os\n"
        " import sys\n"
        " \n"
        " def foo():\n"
        "-    return 1\n"
        "+    return 2\n"
        " \n"
        " def bar():\n"
        "-    x = 10\n"
        "+    x = 20\n"
        "     return x\n"
        " \n"
        " def baz():\n"
        "+    # new comment\n"
        "     pass\n"
    )


@pytest.fixture
def empty_diff():
    """Return an empty string to simulate a no-change diff."""
    return ""


@pytest.fixture
def large_diff():
    """Return a large single-file diff that should trigger chunk splitting."""
    header = (
        "diff --git a/big.py b/big.py\n"
        "index 000..111 100644\n"
        "--- a/big.py\n"
        "+++ b/big.py\n"
        "@@ -1,500 +1,600 @@\n"
    )
    lines = []
    for i in range(300):
        lines.append(f"+    line_{i} = {i}\n")
    return header + "".join(lines)


@pytest.fixture
def fixtures_dir():
    """Return the Path to the tests/fixtures directory."""
    return FIXTURES_DIR


@pytest.fixture
def expected_reviews():
    """Load and return the expected_reviews.json mapping."""
    path = FIXTURES_DIR / "expected_reviews.json"
    with open(path) as f:
        return json.load(f)
