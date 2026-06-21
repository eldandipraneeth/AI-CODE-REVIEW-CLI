"""User profile and settings schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    """User profile response."""
    id: int
    email: str
    username: str
    dark_mode: bool
    created_at: str


class UserSettingsUpdate(BaseModel):
    """Request to update user settings."""
    dark_mode: Optional[bool] = Field(default=None, description="Enable dark mode")
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
