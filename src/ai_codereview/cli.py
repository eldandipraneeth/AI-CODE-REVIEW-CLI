"""CLI interface for ai-codereview.

Typer-based CLI with Rich output for beautiful, developer-friendly
terminal experience. Supports PR review, local diff review, and config.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from typing import Optional

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

from ai_codereview.chunker import chunk_diff
from ai_codereview.formatter import format_json, format_review
from ai_codereview.reviewer import AIReviewer, ReviewError
from ai_codereview.schemas import CodeReviewResult, Severity

# Load .env file if present
load_dotenv()

app = typer.Typer(
    name="codereview",
    help="🤖 AI-powered code review with structured output",
    rich_markup_mode="rich",
    no_args_is_help=True,
    add_completion=False,
)

console = Console()
err_console = Console(stderr=True)


# ── PR Review Command ────────────────────────────────────────────────────

@app.command()
def pr(
    number: int = typer.Argument(..., help="Pull request number to review"),
    repo: str = typer.Option(
        None,
        "--repo",
        "-r",
        help="Repository in owner/repo format (auto-detected in GitHub Actions)",
        envvar="GITHUB_REPOSITORY",
    ),
    model: str = typer.Option(
        "gemini-2.5-flash",
        "--model",
        "-m",
        help="AI model to use",
        envvar="CODEREVIEW_MODEL",
    ),
    post_comments: bool = typer.Option(
        False,
        "--post-comments",
        "-p",
        help="Post review comments back to the PR",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        "-j",
        help="Output results as JSON (for CI pipelines)",
    ),
    max_issues: int = typer.Option(
        20,
        "--max-issues",
        help="Maximum number of issues to report",
    ),
    severity_threshold: str = typer.Option(
        "low",
        "--severity",
        "-s",
        help="Minimum severity to report: high, medium, or low",
    ),
) -> None:
    """Review a GitHub pull request with AI analysis.

    Fetches the PR diff, chunks it intelligently, and sends each chunk
    to the AI provider for structured review. Results are displayed with
    severity icons and colors.

    \b
    Examples:
        codereview pr 142 --repo owner/repo
        codereview pr 42 --repo owner/repo --json
        codereview pr 99 --repo owner/repo --post-comments
    """
    # Validate inputs
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        err_console.print(
            "[bold red]Error:[/] AI_API_KEY environment variable is not set.",
        )
        err_console.print(
            "  Set it with: [cyan]export AI_API_KEY=your-api-key[/]",
        )
        raise typer.Exit(1)

    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        err_console.print(
            "[bold red]Error:[/] GITHUB_TOKEN environment variable is not set.",
        )
        err_console.print(
            "  Set it with: [cyan]export GITHUB_TOKEN=ghp_...[/]",
        )
        raise typer.Exit(1)

    if not repo:
        err_console.print(
            "[bold red]Error:[/] Repository not specified. "
            "Use [cyan]--repo owner/repo[/] or set GITHUB_REPOSITORY env var.",
        )
        raise typer.Exit(1)

    start_time = time.time()

    try:
        # Step 1: Fetch PR diff
        from ai_codereview.github_client import GitHubClient

        with Progress(
            SpinnerColumn(style="bright_blue"),
            TextColumn("[bold bright_white]{task.description}"),
            console=console,
            transient=True,
        ) as progress:
            progress.add_task("Fetching PR diff...", total=None)
            gh = GitHubClient(token=github_token, repo_slug=repo)
            diff_text = gh.get_pr_diff(number)

        if not diff_text.strip():
            console.print("\n  [dim]No changes found in PR #{}[/]".format(number))
            raise typer.Exit(0)

        # Step 2: Chunk the diff
        chunks = chunk_diff(diff_text)

        if not chunks:
            console.print("\n  [dim]No reviewable changes in PR #{}[/]".format(number))
            raise typer.Exit(0)

        # Step 3: AI Review
        reviewer = AIReviewer(model=model, api_key=api_key, base_url=os.environ.get("AI_BASE_URL"))

        with Progress(
            SpinnerColumn(style="bright_blue"),
            TextColumn("[bold bright_white]{task.description}"),
            BarColumn(bar_width=30, style="bright_blue", complete_style="bright_green"),
            TextColumn("[dim]{task.completed}/{task.total} chunks"),
            console=console,
            transient=True,
        ) as progress:
            task = progress.add_task("Reviewing code...", total=len(chunks))

            def on_progress(current: int, total: int) -> None:
                progress.update(task, completed=current)

            result = reviewer.review_chunks(chunks, on_progress=on_progress)

        # Step 4: Filter by severity threshold
        result = _filter_by_severity(result, severity_threshold, max_issues)

        elapsed = time.time() - start_time

        # Step 5: Output results
        if json_output:
            console.print(format_json(result, elapsed))
        else:
            format_review(result, elapsed, console)

        # Step 6: Post comments if requested
        if post_comments and result.issues:
            with Progress(
                SpinnerColumn(style="bright_blue"),
                TextColumn("[bold bright_white]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Posting review comments...", total=None)
                gh.post_review_summary(number, result, elapsed)
                posted = gh.post_inline_comments(number, result.issues)

            console.print(
                f"\n  [dim]Posted {posted} inline comment(s) on PR #{number}[/]"
            )

        # Exit with non-zero if high severity issues found
        if any(i.severity == Severity.HIGH for i in result.issues):
            raise typer.Exit(1)

    except ReviewError as e:
        err_console.print(f"\n[bold red]Review Error:[/] {e}")
        raise typer.Exit(2)
    except Exception as e:
        err_console.print(f"\n[bold red]Error:[/] {e}")
        raise typer.Exit(2)


# ── Local Diff Review Command ────────────────────────────────────────────

@app.command()
def diff(
    staged: bool = typer.Option(
        True,
        "--staged/--unstaged",
        help="Review staged changes (default) or unstaged",
    ),
    model: str = typer.Option(
        "gemini-2.5-flash",
        "--model",
        "-m",
        help="AI model to use",
        envvar="CODEREVIEW_MODEL",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        "-j",
        help="Output results as JSON",
    ),
    max_issues: int = typer.Option(
        20,
        "--max-issues",
        help="Maximum number of issues to report",
    ),
) -> None:
    """Review local git diff (staged or unstaged changes).

    Runs the same AI review on your local changes before pushing.
    Perfect for pre-commit hooks or quick local checks.

    \b
    Examples:
        codereview diff
        codereview diff --unstaged
        codereview diff --model gpt-4o-mini --json
    """
    api_key = os.environ.get("AI_API_KEY")
    if not api_key:
        err_console.print(
            "[bold red]Error:[/] AI_API_KEY environment variable is not set.",
        )
        raise typer.Exit(1)

    start_time = time.time()

    # Get git diff
    diff_cmd = ["git", "diff"]
    if staged:
        diff_cmd.append("--staged")

    try:
        result = subprocess.run(
            diff_cmd,
            capture_output=True,
            text=True,
            check=True,
        )
        diff_text = result.stdout
    except subprocess.CalledProcessError as e:
        err_console.print(f"[bold red]Git Error:[/] {e.stderr}")
        raise typer.Exit(2)
    except FileNotFoundError:
        err_console.print("[bold red]Error:[/] git is not installed or not in PATH.")
        raise typer.Exit(2)

    if not diff_text.strip():
        label = "staged" if staged else "unstaged"
        console.print(f"\n  [dim]No {label} changes found.[/]")
        raise typer.Exit(0)

    # Chunk and review
    chunks = chunk_diff(diff_text)

    if not chunks:
        console.print("\n  [dim]No reviewable changes found.[/]")
        raise typer.Exit(0)

    reviewer = AIReviewer(model=model, api_key=api_key, base_url=os.environ.get("AI_BASE_URL"))

    with Progress(
        SpinnerColumn(style="bright_blue"),
        TextColumn("[bold bright_white]{task.description}"),
        BarColumn(bar_width=30, style="bright_blue", complete_style="bright_green"),
        TextColumn("[dim]{task.completed}/{task.total} chunks"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Reviewing code...", total=len(chunks))

        def on_progress(current: int, total: int) -> None:
            progress.update(task, completed=current)

        review_result = reviewer.review_chunks(chunks, on_progress=on_progress)

    review_result = _filter_by_severity(review_result, "low", max_issues)
    elapsed = time.time() - start_time

    if json_output:
        console.print(format_json(review_result, elapsed))
    else:
        format_review(review_result, elapsed, console)

    if any(i.severity == Severity.HIGH for i in review_result.issues):
        raise typer.Exit(1)


# ── Config Command ────────────────────────────────────────────────────────

@app.command()
def config() -> None:
    """Show current configuration and environment status.

    Displays which environment variables are set and their values
    (API keys are masked for security).
    """
    from rich.table import Table

    table = Table(
        title="🤖 ai-codereview Configuration",
        show_header=True,
        header_style="bold bright_blue",
        border_style="bright_blue",
        padding=(0, 1),
    )
    table.add_column("Setting", style="cyan", width=22)
    table.add_column("Value", style="bright_white")
    table.add_column("Source", style="dim")

    # AI API Key
    api_key = os.environ.get("AI_API_KEY", "")
    if api_key:
        masked = f"...{api_key[-4:]}" if len(api_key) > 6 else "****"
        table.add_row("AI_API_KEY", f"[green]{masked}[/]", "env")
    else:
        table.add_row("AI_API_KEY", "[red]not set[/]", "—")

    # GitHub Token
    gh_token = os.environ.get("GITHUB_TOKEN", "")
    if gh_token:
        masked = f"ghp_...{gh_token[-4:]}" if len(gh_token) > 6 else "****"
        table.add_row("GITHUB_TOKEN", f"[green]{masked}[/]", "env")
    else:
        table.add_row("GITHUB_TOKEN", "[red]not set[/]", "—")

    # Model
    model = os.environ.get("CODEREVIEW_MODEL", "gemini-2.5-flash")
    table.add_row("Model", model, "env/default")

    # GitHub Repository
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if repo:
        table.add_row("Repository", repo, "env")
    else:
        table.add_row("Repository", "[dim]not set (use --repo)[/]", "—")

    # API Endpoint
    base_url = os.environ.get("AI_BASE_URL", "")
    if base_url:
        table.add_row("API Endpoint", f"[yellow]{base_url}[/]", "env")
    else:
        table.add_row("API Endpoint", "[dim]default[/]", "default")

    console.print()
    console.print(table)
    console.print()


# ── Helpers ───────────────────────────────────────────────────────────────

def _filter_by_severity(
    result: CodeReviewResult,
    threshold: str,
    max_issues: int,
) -> CodeReviewResult:
    """Filter review issues by severity threshold and max count."""
    severity_order = {"high": 0, "medium": 1, "low": 2}
    threshold_val = severity_order.get(threshold.lower(), 2)

    filtered = [
        issue
        for issue in result.issues
        if severity_order.get(issue.severity.value, 2) <= threshold_val
    ]

    # Limit to max issues
    filtered = filtered[:max_issues]

    return CodeReviewResult(
        issues=filtered,
        summary=result.summary,
        quality_score=result.quality_score,
    )


# ── Version callback ─────────────────────────────────────────────────────

def _version_callback(value: bool) -> None:
    if value:
        from ai_codereview import __version__

        console.print(f"ai-codereview v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(
        False,
        "--version",
        "-V",
        callback=_version_callback,
        is_eager=True,
        help="Show version and exit",
    ),
) -> None:
    """🤖 AI-powered code review with structured output.

    Analyzes code changes using AI with Pydantic-enforced structured
    output. Supports GitHub PR review and local git diff analysis.
    """
    pass
