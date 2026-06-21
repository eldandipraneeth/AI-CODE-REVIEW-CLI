"""User routes — profile and settings."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserProfile, UserSettingsUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserProfile)
def get_profile(user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserProfile(
        id=user.id,
        email=user.email,
        username=user.username,
        dark_mode=user.dark_mode,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.put("/me", response_model=UserProfile)
def update_settings(
    settings_update: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's settings."""
    if settings_update.dark_mode is not None:
        user.dark_mode = settings_update.dark_mode
    if settings_update.username is not None:
        existing = db.query(User).filter(
            User.username == settings_update.username, User.id != user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        user.username = settings_update.username

    db.commit()
    db.refresh(user)

    return UserProfile(
        id=user.id,
        email=user.email,
        username=user.username,
        dark_mode=user.dark_mode,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )
