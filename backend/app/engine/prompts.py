"""LLM prompt engineering for AI code review.

System prompts and chunk formatting for precise, actionable code reviews.
"""

SYSTEM_PROMPT = """\
You are an expert senior software engineer performing a thorough code review.
Your job is to analyze code diffs and identify real, actionable issues.

## Review Guidelines

1. **Focus on what matters**: Prioritize security vulnerabilities, bugs, and \
error handling over style nitpicks.
2. **Be specific**: Reference exact line numbers and provide concrete fix suggestions.
3. **Be accurate**: Only report genuine issues. False positives erode trust.
4. **Be concise**: Each explanation should be 1-3 sentences maximum.
5. **Provide fixes**: Every issue MUST include a concrete suggested_fix with actual code.

## Severity Criteria

- **HIGH**: Security vulnerabilities (SQL injection, XSS, auth bypass), data loss bugs, \
race conditions, crashes in production paths.
- **MEDIUM**: Missing error handling, resource leaks, logic errors that may cause \
incorrect behavior, missing input validation.
- **LOW**: Performance improvements (caching, unnecessary allocations), code clarity, \
test coverage gaps, minor maintainability issues.

IMPORTANT: The `severity` field MUST strictly be one of these exact strings: "high", "medium", or "low". Do not use categories like "bug" or "security" as the severity.

## Category Definitions

- **security**: SQL injection, XSS, CSRF, auth bypass, secrets exposure, insecure deserialization.
- **performance**: Unnecessary allocations, N+1 queries, missing caching, regex recompilation.
- **bug**: Logic errors, off-by-one, null reference, incorrect return values.
- **error_handling**: Missing try/except, unhandled API failures, swallowed exceptions.
- **style**: Naming conventions, dead code, code duplication (only if severe).
- **test_coverage**: Missing tests for critical paths, untested edge cases.
- **maintainability**: Overly complex functions, tight coupling, magic numbers.

## Important Rules

- Only review the CHANGED lines (lines starting with + in the diff).
- Consider the surrounding context to understand intent.
- Do NOT flag removed lines (starting with -) — they are being deleted.
- If the code looks clean with no issues, return an empty issues list and a high quality score.
- Set confidence based on how certain you are about each issue (0.0 to 1.0).
"""

CHUNK_PROMPT_TEMPLATE = """\
Review the following code diff. The file is `{file_path}` ({language}).

{context_section}

## Diff (lines {start_line}-{end_line})

```{language}
{diff_content}
```

Analyze ONLY the additions (lines starting with +) for issues. \
Consider the context to understand the intent of the changes. \
Return your findings as structured JSON matching the required schema.
"""


def build_chunk_prompt(
    file_path: str,
    diff_content: str,
    start_line: int,
    end_line: int,
    language: str = "",
    context: str = "",
) -> str:
    """Build the user prompt for reviewing a single diff chunk.

    Args:
        file_path: Relative path of the file being reviewed.
        diff_content: The actual diff text to review.
        start_line: Starting line number in the original file.
        end_line: Ending line number in the original file.
        language: Programming language of the file.
        context: Surrounding code context (imports, class definition, etc.).

    Returns:
        Formatted prompt string for the LLM.
    """
    context_section = ""
    if context:
        context_section = f"## Surrounding Context\n\n```{language}\n{context}\n```\n"

    return CHUNK_PROMPT_TEMPLATE.format(
        file_path=file_path,
        language=language or _detect_language(file_path),
        context_section=context_section,
        start_line=start_line,
        end_line=end_line,
        diff_content=diff_content,
    )


def _detect_language(file_path: str) -> str:
    """Detect programming language from file extension."""
    ext_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".jsx": "javascript",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".rb": "ruby",
        ".php": "php",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".hpp": "cpp",
        ".cs": "csharp",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".sh": "bash",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".json": "json",
        ".sql": "sql",
        ".r": "r",
        ".R": "r",
    }
    for ext, lang in ext_map.items():
        if file_path.endswith(ext):
            return lang
    return ""
