"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings loaded from environment variables or .env file."""

    # Application
    APP_NAME: str = "AI Code Review"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite:///./codereview.db"

    # JWT Authentication
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AI Configuration
    GEMINI_API_KEY: str

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
