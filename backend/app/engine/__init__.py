"""Reused code review engine from the CLI application.

These modules are copied from src/ai_codereview/ with import paths
updated from 'ai_codereview.*' to 'app.engine.*'.
"""

from app.engine.schemas import (
    Category,
    CodeReviewResult,
    FileReviewResult,
    ReviewIssue,
    Severity,
)
from app.engine.reviewer import AIReviewer, ReviewError
from app.engine.chunker import chunk_diff, parse_unified_diff, DiffChunk
from app.engine.github_client import GitHubClient, GitHubClientError

__all__ = [
    "AIReviewer", "ReviewError",
    "Category", "CodeReviewResult", "FileReviewResult", "ReviewIssue", "Severity",
    "chunk_diff", "parse_unified_diff", "DiffChunk",
    "GitHubClient", "GitHubClientError",
]
