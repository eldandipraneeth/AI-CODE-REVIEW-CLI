"""Review request/response schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CodeReviewRequest(BaseModel):
    """Request to review pasted code."""
    code: str = Field(..., min_length=1, description="Code to review")
    language: str = Field(default="python", description="Programming language")
    filename: str = Field(default="main.py", description="Virtual filename for context")
    ai_base_url: Optional[str] = Field(default=None, description="Custom AI API base URL")
    model: str = Field(default="gemini-2.5-flash", description="AI model to use")


class FileReviewRequest(BaseModel):
    """Metadata for file upload review (file sent as multipart)."""
    ai_base_url: Optional[str] = Field(default=None, description="Custom AI API base URL")
    model: str = Field(default="gemini-2.5-flash", description="AI model to use")


class GitHubPRReviewRequest(BaseModel):
    """Request to review a GitHub Pull Request."""
    repo: str = Field(..., description="Repository in 'owner/repo' format")
    pr_number: int = Field(..., gt=0, description="Pull request number")
    github_token: Optional[str] = Field(default=None, description="GitHub personal access token")
    ai_base_url: Optional[str] = Field(default=None, description="Custom AI API base URL")
    model: str = Field(default="gemini-2.5-flash", description="AI model to use")
    post_comments: bool = Field(default=False, description="Post review comments to PR")


class ReviewIssueResponse(BaseModel):
    """A single review issue in the API response."""
    file: str
    line_number: int
    severity: str
    category: str
    explanation: str
    suggested_fix: str


class ReviewResponse(BaseModel):
    """API response for a completed review."""
    id: int
    review_type: str
    source_name: str
    quality_score: float
    summary: str
    total_issues: int
    high_count: int
    medium_count: int
    low_count: int
    model_used: str
    duration_seconds: float
    issues: list[ReviewIssueResponse]


class ReviewListItem(BaseModel):
    """Summary item for review history list."""
    id: int
    review_type: str
    source_name: str
    quality_score: float
    total_issues: int
    high_count: int
    medium_count: int
    low_count: int
    model_used: str
    duration_seconds: float
    created_at: str


class ReviewListResponse(BaseModel):
    """Paginated review history response."""
    reviews: list[ReviewListItem]
    total: int
    page: int
    limit: int
