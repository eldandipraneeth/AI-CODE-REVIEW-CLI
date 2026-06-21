"""AI review engine — OpenAI-compatible structured output integration.

Sends diff chunks to any OpenAI-compatible API with Pydantic schema enforcement
and aggregates results. Handles retries, rate limits, and result deduplication.

Supported providers:
  - OpenAI (gpt-4o, gpt-4o-mini)
  - Google Gemini (gemini-2.5-flash) — FREE
  - Groq (llama-3.1-70b) — FREE tier
  - Any OpenAI-compatible endpoint
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Optional

from openai import APIError, OpenAI, RateLimitError

from app.engine.chunker import DiffChunk
from app.engine.prompts import SYSTEM_PROMPT, build_chunk_prompt
from app.engine.schemas import (
    Category,
    CodeReviewResult,
    FileReviewResult,
    ReviewIssue,
    Severity,
)

logger = logging.getLogger(__name__)

# Retry configuration
_MAX_RETRIES = 3
_BASE_DELAY = 1.0  # seconds
_BACKOFF_FACTOR = 2.0


class ReviewError(Exception):
    """Raised when the AI review process fails."""


class AIReviewer:
    """AI-powered code reviewer using OpenAI-compatible APIs.

    Uses structured output with Pydantic models to enforce JSON output.
    Supports OpenAI, Google Gemini (free), Groq (free), and any
    OpenAI-compatible endpoint.

    Args:
        model: Model to use (default: gemini-2.5-flash).
        api_key: API key. If None, reads from AI_API_KEY env var.
        base_url: Custom API base URL. If None, reads from AI_BASE_URL env var.
        temperature: Sampling temperature (lower = more deterministic).
        max_retries: Maximum retry attempts per API call.
    """

    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.1,
        max_retries: int = _MAX_RETRIES,
    ):
        self.model = model
        self.temperature = temperature
        self.max_retries = max_retries

        # Resolve base_url from parameter or env
        resolved_base_url = base_url or os.environ.get("AI_BASE_URL")

        # Auto-detect base_url if not provided based on model
        if not resolved_base_url:
            if "gemini" in self.model.lower():
                resolved_base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
            elif "llama" in self.model.lower() or "mixtral" in self.model.lower() or "gemma" in self.model.lower():
                resolved_base_url = "https://api.groq.com/openai/v1"

        # Resolve api_key from parameter or env
        resolved_api_key = api_key or os.environ.get("AI_API_KEY")
        
        client_kwargs = {}
        if resolved_api_key:
            client_kwargs["api_key"] = resolved_api_key
        if resolved_base_url:
            client_kwargs["base_url"] = resolved_base_url

        self._client = OpenAI(**client_kwargs)

        # Detect provider — use structured output for native OpenAI, JSON mode for others
        self._use_beta_parse = _is_openai_native(resolved_base_url, self.model)

    def review_chunk(self, chunk: DiffChunk) -> FileReviewResult:
        """Review a single diff chunk using AI structured output.

        Args:
            chunk: A DiffChunk containing the code to review.

        Returns:
            FileReviewResult with issues found in this chunk.

        Raises:
            ReviewError: If the API call fails after all retries.
        """
        user_prompt = build_chunk_prompt(
            file_path=chunk.file_path,
            diff_content=chunk.content,
            start_line=chunk.start_line,
            end_line=chunk.end_line,
            language=chunk.language,
            context=chunk.context,
        )

        last_error: Exception | None = None

        # --- MOCK MODE (FALLBACK LINTER) ---
        # If the API key is 'test_key', run basic static analysis instead of random issues
        if self._client.api_key == "test_key" or self._client.api_key == "dummy":
            import time
            time.sleep(1) # Simulate network delay
            
            mock_issues = []
            score = 10.0
            
            # Simple python static analysis
            if chunk.language and chunk.language.lower() == "python":
                import ast
                try:
                    tree = ast.parse(chunk.content)
                    
                    # Check for print statements (Performance / Best Practice)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Call) and getattr(node.func, 'id', '') == 'print':
                            mock_issues.append(
                                ReviewIssue(
                                    file=chunk.file_path,
                                    line_number=chunk.start_line + getattr(node, 'lineno', 1) - 1,
                                    severity=Severity.LOW,
                                    category=Category.MAINTAINABILITY,
                                    explanation="Found print() statement. In production code, it is recommended to use the standard logging module instead of print.",
                                    suggested_fix="Replace print() with logger.info() or logger.debug().",
                                )
                            )
                            score = min(score, 8.5)
                            
                        # Check for bare except (Security / Bug)
                        if isinstance(node, ast.ExceptHandler) and node.type is None:
                            mock_issues.append(
                                ReviewIssue(
                                    file=chunk.file_path,
                                    line_number=chunk.start_line + getattr(node, 'lineno', 1) - 1,
                                    severity=Severity.HIGH,
                                    category=Category.ERROR_HANDLING,
                                    explanation="Bare except clause detected. This will catch all exceptions including KeyboardInterrupt and SystemExit, which can hide bugs.",
                                    suggested_fix="Specify the exact exception to catch, e.g., 'except Exception as e:'.",
                                )
                            )
                            score = min(score, 6.0)

                except SyntaxError as e:
                    # Catch actual syntax errors
                    mock_issues.append(
                        ReviewIssue(
                            file=chunk.file_path,
                            line_number=chunk.start_line + getattr(e, 'lineno', 1) - 1,
                            severity=Severity.HIGH,
                            category=Category.BUG,
                            explanation=f"Syntax Error: {e.msg}. This code will throw an error and fail to execute.",
                            suggested_fix="Fix the syntax error according to Python grammar rules.",
                        )
                    )
                    score = min(score, 2.0)
            
            # General checks for any language
            if not mock_issues and "TODO" in chunk.content.upper():
                 mock_issues.append(
                     ReviewIssue(
                         file=chunk.file_path,
                         line_number=chunk.start_line,
                         severity=Severity.LOW,
                         category=Category.MAINTAINABILITY,
                         explanation="Found unresolved TODO comment in the code.",
                         suggested_fix="Resolve the TODO or track it in an issue tracker.",
                     )
                 )
                 score = min(score, 9.0)

            if not mock_issues:
                summary = "The code looks clean and well-structured."
            elif score <= 4.0:
                summary = "The code contains critical errors that must be fixed."
            else:
                summary = f"Found {len(mock_issues)} areas for improvement."
                
            return FileReviewResult(
                issues=mock_issues,
                chunk_summary=summary,
                chunk_quality_score=score,
            )
        # -----------------------------------

        for attempt in range(self.max_retries):
            try:
                if self._use_beta_parse:
                    # OpenAI native structured output
                    result = self._call_beta_parse(user_prompt)
                else:
                    # Fallback for Gemini, Groq, and other providers
                    result = self._call_json_mode(user_prompt)

                return result

            except RateLimitError as e:
                last_error = e
                delay = _BASE_DELAY * (_BACKOFF_FACTOR ** attempt)
                logger.warning(
                    "Rate limited (attempt %d/%d), retrying in %.1fs...",
                    attempt + 1,
                    self.max_retries,
                    delay,
                )
                time.sleep(delay)

            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    delay = _BASE_DELAY * (_BACKOFF_FACTOR ** attempt)
                    logger.warning(
                        "API or Validation error (attempt %d/%d): %s, retrying in %.1fs...",
                        attempt + 1,
                        self.max_retries,
                        e,
                        delay,
                    )
                    time.sleep(delay)

        raise ReviewError(
            f"Failed to review {chunk.file_path} after {self.max_retries} attempts: {last_error}"
        )

    def _call_beta_parse(self, user_prompt: str) -> FileReviewResult:
        """Use OpenAI's native beta.chat.completions.parse() for structured output."""
        completion = self._client.beta.chat.completions.parse(
            model=self.model,
            temperature=self.temperature,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=FileReviewResult,
        )

        message = completion.choices[0].message

        if message.refusal:
            logger.warning("Model refused review: %s", message.refusal)
            return FileReviewResult(
                issues=[],
                chunk_summary=f"Review refused: {message.refusal}",
                chunk_quality_score=5.0,
            )

        if message.parsed is None:
            raise ReviewError("No parsed response from API")

        return message.parsed

    def _call_json_mode(self, user_prompt: str) -> FileReviewResult:
        """Fallback for Gemini, Groq, and other OpenAI-compatible providers.

        Uses standard chat.completions.create() with JSON schema in the prompt,
        then manually parses the response into a FileReviewResult.
        """
        # Build the JSON schema instruction for the prompt
        schema_json = json.dumps(FileReviewResult.model_json_schema(), indent=2)
        schema_instruction = (
            f"\n\nYou MUST respond with valid JSON matching this exact schema:\n"
            f"```json\n{schema_json}\n```\n"
            f"Respond ONLY with the JSON object, no markdown fences or extra text."
        )

        completion = self._client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + schema_instruction},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )

        raw_content = completion.choices[0].message.content
        if not raw_content:
            raise ReviewError("Empty response from API")

        # Strip markdown fences if present
        content = raw_content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        try:
            parsed = json.loads(content)
            return FileReviewResult.model_validate(parsed)
        except (json.JSONDecodeError, Exception) as e:
            logger.error("Failed to parse JSON response: %s", e)
            logger.debug("Raw response: %s", raw_content[:500])
            raise ReviewError(f"Invalid JSON from API: {e}")

    def review_chunks(
        self,
        chunks: list[DiffChunk],
        on_progress: Optional[callable] = None,
    ) -> CodeReviewResult:
        """Review multiple diff chunks and aggregate results.

        Args:
            chunks: List of DiffChunks to review.
            on_progress: Optional callback(current, total) for progress tracking.

        Returns:
            Aggregated CodeReviewResult with deduplicated issues.
        """
        if not chunks:
            return CodeReviewResult(
                issues=[],
                summary="No changes to review.",
                quality_score=10.0,
            )

        all_issues: list[ReviewIssue] = []
        summaries: list[str] = []
        scores: list[float] = []

        for i, chunk in enumerate(chunks):
            try:
                result = self.review_chunk(chunk)
                all_issues.extend(result.issues)
                summaries.append(result.chunk_summary)
                scores.append(result.chunk_quality_score)
            except ReviewError as e:
                logger.error("Failed to review chunk: %s", e)
                summaries.append(f"Review failed for {chunk.file_path}")

            if on_progress:
                on_progress(i + 1, len(chunks))

        # Deduplicate issues
        unique_issues = _deduplicate_issues(all_issues)

        if not scores and chunks:
            raise ReviewError("All chunks failed to review. Please check your AI API key and model settings.")

        # Sort by severity (HIGH first, then MEDIUM, then LOW)
        severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
        unique_issues.sort(key=lambda x: severity_order.get(x.severity, 3))

        # Compute aggregate quality score
        avg_score = sum(scores) / len(scores) if scores else 5.0

        # Build summary
        high_count = sum(1 for i in unique_issues if i.severity == Severity.HIGH)
        medium_count = sum(1 for i in unique_issues if i.severity == Severity.MEDIUM)
        low_count = sum(1 for i in unique_issues if i.severity == Severity.LOW)

        summary = _build_summary(unique_issues, summaries, high_count, medium_count, low_count)

        return CodeReviewResult(
            issues=unique_issues,
            summary=summary,
            quality_score=round(avg_score, 1),
        )


def _is_openai_native(base_url: str | None, model: str) -> bool:
    """Determine if the provider supports OpenAI's native structured output.

    Returns True for direct OpenAI API usage (no custom base_url, or
    base_url pointing to api.openai.com). Returns False for Gemini,
    Groq, and other third-party providers.
    """
    if not base_url:
        # No custom URL — default OpenAI endpoint
        return True

    normalized = base_url.lower().rstrip("/")

    # Explicit OpenAI endpoints
    if "api.openai.com" in normalized:
        return True

    # Known non-OpenAI providers
    return False


def _deduplicate_issues(issues: list[ReviewIssue]) -> list[ReviewIssue]:
    """Remove duplicate issues based on file + line_number + category."""
    seen: set[str] = set()
    unique: list[ReviewIssue] = []

    for issue in issues:
        key = f"{issue.file}:{issue.line_number}:{issue.category.value}"
        if key not in seen:
            seen.add(key)
            unique.append(issue)

    return unique


def _build_summary(
    issues: list[ReviewIssue],
    chunk_summaries: list[str],
    high_count: int,
    medium_count: int,
    low_count: int,
) -> str:
    """Build a human-readable summary of the review."""
    total = len(issues)

    if total == 0:
        return "No issues found. The code changes look clean and well-structured."

    parts = [f"Found {total} issue{'s' if total != 1 else ''}"]

    severity_parts = []
    if high_count:
        severity_parts.append(f"{high_count} high-severity")
    if medium_count:
        severity_parts.append(f"{medium_count} medium-severity")
    if low_count:
        severity_parts.append(f"{low_count} low-severity")

    if severity_parts:
        parts.append(f" ({', '.join(severity_parts)})")

    parts.append(".")

    # Add category breakdown
    categories = set(i.category.value for i in issues)
    if categories:
        parts.append(f" Categories: {', '.join(sorted(categories))}.")

    return "".join(parts)
