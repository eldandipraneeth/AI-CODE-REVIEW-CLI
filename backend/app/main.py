"""FastAPI application entry point.

Sets up CORS, includes routers, and creates database tables on startup.
"""

import logging

from asgi_correlation_id import CorrelationIdMiddleware, correlation_id
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import Base, engine
from app.routers import auth, reviews, users
from app.limiter import limiter

class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = correlation_id.get() or "-"
        return True

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - [%(correlation_id)s] - %(name)s - %(levelname)s - %(message)s",
)
for handler in logging.getLogger().handlers:
    handler.addFilter(CorrelationIdFilter())


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "AI-powered code review API. Supports pasted code, file uploads, "
            "and GitHub Pull Request reviews using Google Gemini, OpenAI, or Groq."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Correlation ID Middleware (must be added before CORS so it wraps everything)
    app.add_middleware(CorrelationIdMiddleware)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router)
    app.include_router(reviews.router)
    app.include_router(users.router)

    # Health check
    @app.get("/api/health", tags=["Health"])
    def health_check():
        return {"status": "healthy", "app": settings.APP_NAME}

    # Create tables on startup (legacy, Alembic is preferred)
    @app.on_event("startup")
    def on_startup():
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            logging.error(f"Error creating tables: {e}")

    return app


app = create_app()
