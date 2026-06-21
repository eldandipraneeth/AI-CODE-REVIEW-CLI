"""Review and ReviewIssue ORM models."""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    """A saved code review session."""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_type = Column(String, nullable=False)  # "file", "code", "github_pr"
    source_name = Column(String, nullable=False)  # filename, PR URL, or "pasted code"
    quality_score = Column(Float)
    summary = Column(Text)
    total_issues = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    model_used = Column(String)
    duration_seconds = Column(Float)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="reviews")
    issues = relationship("ReviewIssueDB", back_populates="review", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Review(id={self.id}, type='{self.review_type}', score={self.quality_score})>"


class ReviewIssueDB(Base):
    """A single issue found during a code review."""

    __tablename__ = "review_issues"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    file = Column(String)
    line_number = Column(Integer)
    severity = Column(String)  # "high", "medium", "low"
    category = Column(String)  # "security", "bug", "performance", etc.
    explanation = Column(Text)
    suggested_fix = Column(Text)

    # Relationships
    review = relationship("Review", back_populates="issues")

    def __repr__(self) -> str:
        return f"<ReviewIssueDB(id={self.id}, severity='{self.severity}', category='{self.category}')>"
