"""Review routes — code review, file review, GitHub PR review, and history."""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.schemas.review import (
    CodeReviewRequest,
    GitHubPRReviewRequest,
    ReviewIssueResponse,
    ReviewListItem,
    ReviewListResponse,
    ReviewResponse,
)
from app.services import review_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Reviews"])


def _review_to_response(review) -> ReviewResponse:
    """Convert a Review ORM object to a ReviewResponse schema."""
    return ReviewResponse(
        id=review.id,
        review_type=review.review_type,
        source_name=review.source_name,
        quality_score=review.quality_score,
        summary=review.summary,
        total_issues=review.total_issues,
        high_count=review.high_count,
        medium_count=review.medium_count,
        low_count=review.low_count,
        model_used=review.model_used,
        duration_seconds=review.duration_seconds,
        issues=[
            ReviewIssueResponse(
                file=issue.file,
                line_number=issue.line_number,
                severity=issue.severity,
                category=issue.category,
                explanation=issue.explanation,
                suggested_fix=issue.suggested_fix,
            )
            for issue in review.issues
        ],
    )


@router.post("/review/code", response_model=ReviewResponse)
@limiter.limit("5/minute")
async def review_code(
    request_data: CodeReviewRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Review pasted code using AI."""
    try:
        review = await review_service.review_code(
            db=db,
            user_id=user.id,
            code=request_data.code,
            language=request_data.language,
            filename=request_data.filename,
            api_key=settings.GEMINI_API_KEY,
            model=request_data.model,
            base_url=request_data.ai_base_url,
        )
        return _review_to_response(review)
    except Exception as e:
        logger.exception("Code review failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/review/file", response_model=ReviewResponse)
@limiter.limit("5/minute")
async def review_file(
    request: Request,
    file: UploadFile = File(...),
    model: str = Form(default="gemini-2.5-flash"),
    ai_base_url: str = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Review an uploaded file using AI."""
    try:
        content = await file.read()
        file_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a valid text/source code file",
        )

    try:
        review = await review_service.review_file(
            db=db,
            user_id=user.id,
            file_content=file_content,
            filename=file.filename or "uploaded_file",
            api_key=settings.GEMINI_API_KEY,
            model=model,
            base_url=ai_base_url if ai_base_url else None,
        )
        return _review_to_response(review)
    except Exception as e:
        logger.exception("File review failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/review/github-pr", response_model=ReviewResponse)
@limiter.limit("5/minute")
async def review_github_pr(
    request_data: GitHubPRReviewRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Review a GitHub Pull Request using AI."""
    try:
        review = await review_service.review_github_pr(
            db=db,
            user_id=user.id,
            repo=request_data.repo,
            pr_number=request_data.pr_number,
            github_token=request_data.github_token,
            api_key=settings.GEMINI_API_KEY,
            model=request_data.model,
            base_url=request_data.ai_base_url,
            post_comments=request_data.post_comments,
        )
        return _review_to_response(review)
    except Exception as e:
        logger.exception("GitHub PR review failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/reviews", response_model=ReviewListResponse)
def list_reviews(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    review_type: str = Query(default=None),
    search: str = Query(default=None),
    severity: str = Query(default=None),
    category: str = Query(default=None),
    date_from: str = Query(default=None),
    date_to: str = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated review history for the current user."""
    reviews, total = review_service.get_reviews(
        db=db, 
        user_id=user.id, 
        page=page, 
        limit=limit, 
        review_type=review_type,
        search=search,
        severity=severity,
        category=category,
        date_from=date_from,
        date_to=date_to
    )
    return ReviewListResponse(
        reviews=[
            ReviewListItem(
                id=r.id,
                review_type=r.review_type,
                source_name=r.source_name,
                quality_score=r.quality_score,
                total_issues=r.total_issues,
                high_count=r.high_count,
                medium_count=r.medium_count,
                low_count=r.low_count,
                model_used=r.model_used,
                duration_seconds=r.duration_seconds,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in reviews
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/reviews/{review_id}", response_model=ReviewResponse)
def get_review(
    review_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single review by ID."""
    review = review_service.get_review_by_id(db, review_id, user.id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return _review_to_response(review)


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated analytics for the current user."""
    return review_service.get_user_analytics(db, user.id)
