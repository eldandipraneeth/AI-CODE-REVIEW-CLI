"""Output formatters for Rich terminal, JSON, and Markdown.

Produces the beautiful CLI output shown in the project spec:
  ■ HIGH — security/auth.py:47
  ● MEDIUM — api/users.py:89
  ✓ LOW — utils/parser.py:12
"""

from __future__ import annotations

import json
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.rule import Rule

from ai_codereview.schemas import CodeReviewResult, ReviewIssue, Severity

# ── Severity styling ──────────────────────────────────────────────────────

_SEVERITY_CONFIG = {
    Severity.HIGH: {
        "icon": "■",
        "color": "bright_red",
        "label": "HIGH",
        "style": "bold bright_red",
    },
    Severity.MEDIUM: {
        "icon": "●",
        "color": "bright_yellow",
        "label": "MEDIUM",
        "style": "bold bright_yellow",
    },
    Severity.LOW: {
        "icon": "✓",
        "color": "bright_green",
        "label": "LOW",
        "style": "bold bright_green",
    },
}

_CATEGORY_COLORS = {
    "security": "red",
    "performance": "cyan",
    "bug": "bright_red",
    "error_handling": "yellow",
    "style": "blue",
    "test_coverage": "magenta",
    "maintainability": "bright_blue",
}


# ── Rich terminal output ─────────────────────────────────────────────────

def format_review(
    result: CodeReviewResult,
    elapsed: float,
    console: Optional[Console] = None,
) -> None:
    """Print a beautifully formatted code review to the terminal using Rich.

    Matches the spec output:
        $ codereview --pr 142
        ■ HIGH — security/auth.py:47
          SQL query via string concat → use params.
        ● MEDIUM — api/users.py:89
          Missing error handling on API call.
        ✓ LOW — utils/parser.py:12
          Cache this regex compilation.
        3 issues · 1 high · 1 medium · 1 low · 0.8s

    Args:
        result: The CodeReviewResult to display.
        elapsed: Time taken for the review in seconds.
        console: Optional Rich Console instance (creates one if not provided).
    """
    if console is None:
        import sys
        import io
        # Force UTF-8 output to avoid cp1252 crashes on Windows
        if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        console = Console()

    console.print()

    # Header
    header = Text()
    header.append("  ai-codereview", style="bold bright_white")
    header.append("  ·  ", style="dim")
    header.append(f"quality {result.quality_score}/10", style="bold cyan")
    console.print(Panel(header, border_style="bright_blue", padding=(0, 1)))
    console.print()

    if not result.issues:
        console.print("  [bold green]>>>[/] ", end="")
        console.print("No issues found!", style="bold bright_green")
        console.print(f"  {result.summary}", style="dim")
        console.print()
        _print_footer(console, result, elapsed)
        return

    # Issues
    for issue in result.issues:
        _print_issue(console, issue)

    console.print()

    # Summary footer
    _print_footer(console, result, elapsed)

    # Suggested fixes (collapsible detail)
    console.print()
    console.print(Rule("Suggested Fixes", style="dim"))
    console.print()

    for issue in result.issues:
        _print_fix(console, issue)


def _print_issue(console: Console, issue: ReviewIssue) -> None:
    """Print a single issue in the compact format."""
    config = _SEVERITY_CONFIG[issue.severity]
    cat_color = _CATEGORY_COLORS.get(issue.category.value, "white")

    # Severity icon and label
    line = Text()
    line.append(f"  {config['icon']} ", style=config["style"])
    line.append(f"{config['label']}", style=config["style"])
    line.append(" — ", style="dim")
    line.append(f"{issue.category.value}", style=f"bold {cat_color}")
    line.append(f"/{issue.file}", style="bright_white")
    line.append(f":{issue.line_number}", style="dim cyan")

    console.print(line)

    # Explanation (indented)
    console.print(f"    {issue.explanation}", style="dim white")
    console.print()


def _print_fix(console: Console, issue: ReviewIssue) -> None:
    """Print a suggested fix with syntax highlighting."""
    config = _SEVERITY_CONFIG[issue.severity]
    cat_color = _CATEGORY_COLORS.get(issue.category.value, "white")

    header = Text()
    header.append(f"{config['icon']} ", style=config["style"])
    header.append(f"{issue.file}:{issue.line_number}", style="bright_white")
    header.append(f" ({issue.category.value})", style=f"dim {cat_color}")

    console.print(header)
    console.print(f"  {issue.suggested_fix}", style="green")
    console.print()


def _print_footer(
    console: Console,
    result: CodeReviewResult,
    elapsed: float,
) -> None:
    """Print the summary footer with issue counts and timing."""
    total = len(result.issues)
    high = sum(1 for i in result.issues if i.severity == Severity.HIGH)
    medium = sum(1 for i in result.issues if i.severity == Severity.MEDIUM)
    low = sum(1 for i in result.issues if i.severity == Severity.LOW)

    footer = Text()
    footer.append(f"  {total} issue{'s' if total != 1 else ''}", style="bold white")
    footer.append(" · ", style="dim")
    footer.append(f"{high} high", style="bright_red" if high else "dim")
    footer.append(" · ", style="dim")
    footer.append(f"{medium} medium", style="bright_yellow" if medium else "dim")
    footer.append(" · ", style="dim")
    footer.append(f"{low} low", style="bright_green" if low else "dim")
    footer.append(" · ", style="dim")
    footer.append(f"{elapsed:.1f}s", style="dim cyan")

    console.print(footer)


# ── JSON output ───────────────────────────────────────────────────────────

def format_json(result: CodeReviewResult, elapsed: float) -> str:
    """Format the review result as a JSON string.

    Includes timing metadata for CI pipeline consumption.

    Args:
        result: The CodeReviewResult to serialize.
        elapsed: Time taken for the review in seconds.

    Returns:
        Pretty-printed JSON string.
    """
    data = result.model_dump(mode="json")
    data["metadata"] = {
        "elapsed_seconds": round(elapsed, 2),
        "issue_count": len(result.issues),
        "high_count": sum(1 for i in result.issues if i.severity == Severity.HIGH),
        "medium_count": sum(1 for i in result.issues if i.severity == Severity.MEDIUM),
        "low_count": sum(1 for i in result.issues if i.severity == Severity.LOW),
    }
    return json.dumps(data, indent=2)


# ── Markdown output ──────────────────────────────────────────────────────

_SEVERITY_EMOJI = {
    Severity.HIGH: "🔴",
    Severity.MEDIUM: "🟡",
    Severity.LOW: "🟢",
}


def format_markdown(result: CodeReviewResult) -> str:
    """Format the review result as Markdown.

    Suitable for posting as GitHub PR comments.

    Args:
        result: The CodeReviewResult to format.

    Returns:
        Markdown string.
    """
    lines = ["## 🤖 AI Code Review", ""]

    if not result.issues:
        lines.append("✅ **No issues found!** The code looks clean.")
        lines.append("")
        lines.append(f"Quality Score: **{result.quality_score}/10**")
        return "\n".join(lines)

    # Counts
    high = sum(1 for i in result.issues if i.severity == Severity.HIGH)
    medium = sum(1 for i in result.issues if i.severity == Severity.MEDIUM)
    low = sum(1 for i in result.issues if i.severity == Severity.LOW)

    lines.append(
        f"Found **{len(result.issues)}** issue(s): "
        f"🔴 {high} high · 🟡 {medium} medium · 🟢 {low} low"
    )
    lines.append("")

    # Issue list
    for issue in result.issues:
        emoji = _SEVERITY_EMOJI.get(issue.severity, "⚪")
        lines.append(
            f"- {emoji} **{issue.severity.value.upper()}** — "
            f"`{issue.file}:{issue.line_number}` "
            f"({issue.category.value}): {issue.explanation}"
        )

    lines.extend(["", f"Quality Score: **{result.quality_score}/10**"])

    return "\n".join(lines)
