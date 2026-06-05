"""AI-powered code review CLI with structured output and GitHub Actions integration."""

__version__ = "0.1.0"

from ai_codereview.schemas import (
    Category,
    CodeReviewResult,
    ReviewIssue,
    Severity,
)

__all__ = [
    "Category",
    "CodeReviewResult",
    "ReviewIssue",
    "Severity",
]
