"""Pydantic schemas for structured AI code review output.

These models enforce the LLM's response format via structured output.
Zero regex hacking — the model MUST return valid JSON matching these schemas.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Severity(str, Enum):
    """Issue severity level."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Category(str, Enum):
    """Issue category for classification."""

    SECURITY = "security"
    PERFORMANCE = "performance"
    BUG = "bug"
    ERROR_HANDLING = "error_handling"
    STYLE = "style"
    TEST_COVERAGE = "test_coverage"
    MAINTAINABILITY = "maintainability"


class ReviewIssue(BaseModel):
    """A single code review issue found by the AI reviewer."""

    model_config = ConfigDict(extra="forbid")

    file: str = Field(description="Relative file path where the issue was found")
    line_number: int = Field(ge=1, description="Line number in the file")
    severity: Severity = Field(description="Issue severity: high, medium, or low")
    category: Category = Field(
        description="Issue category: security, performance, bug, error_handling, style, test_coverage, or maintainability"
    )
    explanation: str = Field(
        min_length=10,
        description="Clear, concise explanation of the issue and why it matters",
    )
    suggested_fix: str = Field(
        min_length=5,
        description="Concrete code suggestion or fix for the issue",
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Confidence score from 0.0 to 1.0",
    )


class CodeReviewResult(BaseModel):
    """Complete result from an AI code review session.

    This is the top-level schema passed to the AI provider's structured output
    via `response_format=CodeReviewResult`.
    """

    model_config = ConfigDict(extra="forbid")

    issues: list[ReviewIssue] = Field(
        default_factory=list,
        description="List of code review issues found",
    )
    summary: str = Field(
        description="Brief overall assessment of the code changes",
    )
    quality_score: float = Field(
        ge=0,
        le=10,
        description="Overall code quality score from 0 (terrible) to 10 (excellent)",
    )


class FileReviewResult(BaseModel):
    """Review result for a single file chunk — used internally before aggregation."""

    model_config = ConfigDict(extra="forbid")

    issues: list[ReviewIssue] = Field(
        default_factory=list,
        description="Issues found in this code chunk",
    )
    chunk_summary: str = Field(
        description="Brief summary of this chunk's quality",
    )
    chunk_quality_score: float = Field(
        ge=0,
        le=10,
        description="Quality score for this specific chunk",
    )
