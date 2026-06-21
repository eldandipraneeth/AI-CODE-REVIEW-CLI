"""Review service — orchestrates the AI review engine.

Wraps the existing CLI review engine (AIReviewer + chunker) for use
in the FastAPI backend. Converts various input types (code, files,
GitHub PRs) into diffs, runs the review, and persists results.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.engine.chunker import chunk_diff
from app.engine.reviewer import AIReviewer, ReviewError
from app.engine.schemas import CodeReviewResult, Severity
from app.models.review import Review, ReviewIssueDB

logger = logging.getLogger(__name__)


def _code_to_diff(code: str, filename: str, language: str) -> str:
    """Convert raw code into a unified diff format for the chunker.

    Creates a fake 'new file' diff as if the entire file was just added.
    """
    lines = code.strip().split("\n")
    diff_lines = [
        f"diff --git a/{filename} b/{filename}",
        "new file mode 100644",
        "--- /dev/null",
        f"+++ b/{filename}",
        f"@@ -0,0 +1,{len(lines)} @@",
    ]
    for line in lines:
        diff_lines.append(f"+{line}")
    return "\n".join(diff_lines)


def _save_review(
    db: Session,
    user_id: int,
    review_type: str,
    source_name: str,
    result: CodeReviewResult,
    model: str,
    duration: float,
) -> Review:
    """Persist a CodeReviewResult to the database."""
    high = sum(1 for i in result.issues if i.severity == Severity.HIGH)
    medium = sum(1 for i in result.issues if i.severity == Severity.MEDIUM)
    low = sum(1 for i in result.issues if i.severity == Severity.LOW)

    review = Review(
        user_id=user_id,
        review_type=review_type,
        source_name=source_name,
        quality_score=result.quality_score,
        summary=result.summary,
        total_issues=len(result.issues),
        high_count=high,
        medium_count=medium,
        low_count=low,
        model_used=model,
        duration_seconds=round(duration, 2),
    )
    db.add(review)
    db.flush()  # Get the review.id

    for issue in result.issues:
        db_issue = ReviewIssueDB(
            review_id=review.id,
            file=issue.file,
            line_number=issue.line_number,
            severity=issue.severity.value,
            category=issue.category.value,
            explanation=issue.explanation,
            suggested_fix=issue.suggested_fix,
        )
        db.add(db_issue)

    db.commit()
    db.refresh(review)
    return review


async def review_code(
    db: Session,
    user_id: int,
    code: str,
    language: str,
    filename: str,
    api_key: str,
    model: str = "gemini-2.5-flash",
    base_url: Optional[str] = None,
) -> Review:
    """Review pasted code asynchronously."""
    diff_text = _code_to_diff(code, filename, language)
    chunks = chunk_diff(diff_text)

    reviewer = AIReviewer(model=model, api_key=api_key, base_url=base_url)
    start = time.time()
    # Offload the blocking HTTP request to a thread
    result = await asyncio.to_thread(reviewer.review_chunks, chunks)
    duration = time.time() - start

    return _save_review(db, user_id, "code", filename, result, model, duration)


async def review_file(
    db: Session,
    user_id: int,
    file_content: str,
    filename: str,
    api_key: str,
    model: str = "gemini-2.5-flash",
    base_url: Optional[str] = None,
) -> Review:
    """Review an uploaded file asynchronously."""
    # Detect language from filename extension
    ext_map = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".go": "go", ".rs": "rust", ".java": "java", ".rb": "ruby",
        ".php": "php", ".c": "c", ".cpp": "cpp", ".cs": "csharp",
    }
    lang = ""
    for ext, l in ext_map.items():
        if filename.endswith(ext):
            lang = l
            break

    diff_text = _code_to_diff(file_content, filename, lang)
    chunks = chunk_diff(diff_text)

    reviewer = AIReviewer(model=model, api_key=api_key, base_url=base_url)
    start = time.time()
    # Offload the blocking HTTP request to a thread
    result = await asyncio.to_thread(reviewer.review_chunks, chunks)
    duration = time.time() - start

    return _save_review(db, user_id, "file", filename, result, model, duration)


async def review_github_pr(
    db: Session,
    user_id: int,
    repo: str,
    pr_number: int,
    github_token: str,
    api_key: str,
    model: str = "gemini-2.5-flash",
    base_url: Optional[str] = None,
    post_comments: bool = False,
) -> Review:
    """Review a GitHub Pull Request asynchronously."""
    from app.engine.github_client import GitHubClient

    gh = GitHubClient(token=github_token, repo_slug=repo)
    try:
        # get_pr_diff makes synchronous HTTP requests
        diff_text = await asyncio.to_thread(gh.get_pr_diff, pr_number)
        chunks = chunk_diff(diff_text)

        reviewer = AIReviewer(model=model, api_key=api_key, base_url=base_url)
        start = time.time()
        # AI calls make synchronous HTTP requests
        result = await asyncio.to_thread(reviewer.review_chunks, chunks)
        duration = time.time() - start

        # Optionally post comments back to PR
        if post_comments and result.issues:
            await asyncio.to_thread(gh.post_review_summary, pr_number, result, duration)
            await asyncio.to_thread(gh.post_inline_comments, pr_number, result.issues)

        source_name = f"{repo}#PR{pr_number}"
        return _save_review(db, user_id, "github_pr", source_name, result, model, duration)
    finally:
        gh.close()


def get_review_by_id(db: Session, review_id: int, user_id: int) -> Review | None:
    """Get a single review by ID (owned by the user)."""
    return (
        db.query(Review)
        .filter(Review.id == review_id, Review.user_id == user_id)
        .first()
    )


def get_reviews(
    db: Session,
    user_id: int,
    page: int = 1,
    limit: int = 10,
    review_type: Optional[str] = None,
    search: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> tuple[list[Review], int]:
    """Get paginated review history for a user."""
    query = db.query(Review).filter(Review.user_id == user_id)
    if review_type:
        query = query.filter(Review.review_type == review_type)
    if search:
        query = query.filter(Review.source_name.ilike(f"%{search}%"))
    if date_from:
        query = query.filter(Review.created_at >= date_from)
    if date_to:
        query = query.filter(Review.created_at <= date_to)

    if severity or category:
        query = query.join(Review.issues)
        if severity:
            query = query.filter(ReviewIssueDB.severity == severity)
        if category:
            query = query.filter(ReviewIssueDB.category == category)
        query = query.distinct()

    total = query.count()
    reviews = (
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return reviews, total


def get_user_analytics(db: Session, user_id: int) -> dict:
    """Get aggregated analytics for a user's reviews."""
    total = db.query(Review).filter(Review.user_id == user_id).count()
    
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    week_count = db.query(Review).filter(Review.user_id == user_id, Review.created_at >= week_ago).count()
    month_count = db.query(Review).filter(Review.user_id == user_id, Review.created_at >= month_ago).count()
    
    # Trends (group by date string formatted to YYYY-MM-DD)
    # Using sqlite date() function works directly via func.date
    trends = db.query(
        func.date(Review.created_at).label('date'),
        func.count(Review.id).label('count')
    ).filter(Review.user_id == user_id, Review.created_at >= month_ago).group_by(func.date(Review.created_at)).all()
    
    categories = db.query(
        ReviewIssueDB.category,
        func.count(ReviewIssueDB.id).label('count')
    ).join(Review).filter(Review.user_id == user_id).group_by(ReviewIssueDB.category).all()
    
    severities = db.query(
        ReviewIssueDB.severity,
        func.count(ReviewIssueDB.id).label('count')
    ).join(Review).filter(Review.user_id == user_id).group_by(ReviewIssueDB.severity).all()
    
    return {
        "total_reviews": total,
        "reviews_this_week": week_count,
        "reviews_this_month": month_count,
        "trends": [{"date": str(t.date), "count": t.count} for t in trends if t.date],
        "category_distribution": [{"category": c.category, "count": c.count} for c in categories if c.category],
        "severity_distribution": [{"severity": s.severity, "count": s.count} for s in severities if s.severity],
    }
