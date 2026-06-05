"""GitHub API integration for PR diff fetching and review posting.

Uses PyGithub for authenticated access to pull request data and
supports posting inline review comments back to the PR.
"""

from __future__ import annotations

import logging
from typing import Optional

from github import Auth, Github, GithubException
from github.PullRequest import PullRequest
from github.PullRequestComment import PullRequestComment

from ai_codereview.schemas import CodeReviewResult, ReviewIssue, Severity

logger = logging.getLogger(__name__)

# Marker to identify bot comments for upsert behavior
_BOT_COMMENT_MARKER = "<!-- ai-codereview-bot -->"


class GitHubClientError(Exception):
    """Raised when GitHub API operations fail."""


class GitHubClient:
    """GitHub API client for PR review operations.

    Fetches PR diffs, changed files, and posts review comments.

    Args:
        token: GitHub personal access token or GITHUB_TOKEN from Actions.
        repo_slug: Repository in 'owner/repo' format.
    """

    def __init__(self, token: str, repo_slug: str):
        self._github = Github(auth=Auth.Token(token))
        self._repo_slug = repo_slug
        try:
            self._repo = self._github.get_repo(repo_slug)
        except GithubException as e:
            raise GitHubClientError(
                f"Failed to access repository '{repo_slug}': {e}"
            ) from e

    def get_pull_request(self, pr_number: int) -> PullRequest:
        """Get a pull request by number.

        Args:
            pr_number: The PR number.

        Returns:
            PullRequest object.

        Raises:
            GitHubClientError: If the PR cannot be fetched.
        """
        try:
            return self._repo.get_pull(pr_number)
        except GithubException as e:
            raise GitHubClientError(
                f"Failed to fetch PR #{pr_number}: {e}"
            ) from e

    def get_pr_diff(self, pr_number: int) -> str:
        """Fetch the unified diff for a pull request.

        Uses the GitHub API to get the raw diff content, which includes
        all file changes with unified diff format and hunk headers.

        Args:
            pr_number: The PR number.

        Returns:
            Raw unified diff string.
        """
        import requests

        pr = self.get_pull_request(pr_number)
        diff_url = pr.diff_url

        headers = {
            "Authorization": f"token {self._github.auth.token if hasattr(self._github.auth, 'token') else ''}",
            "Accept": "application/vnd.github.v3.diff",
        }

        response = requests.get(diff_url, headers=headers, timeout=30)
        response.raise_for_status()

        return response.text

    def get_pr_files(self, pr_number: int) -> list[dict]:
        """Get the list of changed files in a PR with their patches.

        Args:
            pr_number: The PR number.

        Returns:
            List of dicts with keys: filename, status, additions,
            deletions, patch.
        """
        pr = self.get_pull_request(pr_number)
        files = pr.get_files()

        result = []
        for f in files:
            result.append({
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
                "patch": f.patch or "",
            })

        return result

    def post_review_summary(
        self,
        pr_number: int,
        result: CodeReviewResult,
        elapsed: float,
    ) -> None:
        """Post a summary comment on the PR.

        Uses upsert behavior: updates an existing bot comment if found,
        otherwise creates a new one.

        Args:
            pr_number: The PR number.
            result: The code review result.
            elapsed: Time taken for the review in seconds.
        """
        body = _format_summary_comment(result, elapsed)
        pr = self.get_pull_request(pr_number)

        # Try to find and update existing bot comment
        existing = self._find_bot_comment(pr)
        if existing:
            try:
                existing.edit(body)
                logger.info("Updated existing review comment on PR #%d", pr_number)
                return
            except GithubException as e:
                logger.warning("Failed to update comment, creating new: %s", e)

        # Create new comment
        try:
            pr.as_issue().create_comment(body)
            logger.info("Posted review summary on PR #%d", pr_number)
        except GithubException as e:
            raise GitHubClientError(
                f"Failed to post comment on PR #{pr_number}: {e}"
            ) from e

    def post_inline_comments(
        self,
        pr_number: int,
        issues: list[ReviewIssue],
    ) -> int:
        """Post inline review comments on specific lines of the PR.

        Uses the batch review API to post all comments in a single request.

        Args:
            pr_number: The PR number.
            issues: List of ReviewIssue objects with file/line info.

        Returns:
            Number of comments successfully posted.
        """
        pr = self.get_pull_request(pr_number)
        latest_commit = pr.get_commits().reversed[0]

        comments = []
        for issue in issues:
            body = _format_inline_comment(issue)
            comments.append({
                "path": issue.file,
                "line": issue.line_number,
                "side": "RIGHT",
                "body": body,
            })

        if not comments:
            return 0

        try:
            pr.create_review(
                commit=latest_commit,
                body=f"{_BOT_COMMENT_MARKER}\n🤖 AI Code Review found {len(comments)} issue(s)",
                event="COMMENT",
                comments=comments,
            )
            logger.info(
                "Posted %d inline comments on PR #%d",
                len(comments),
                pr_number,
            )
            return len(comments)
        except GithubException as e:
            # Some comments may fail if lines aren't part of the diff
            logger.warning(
                "Partial failure posting inline comments: %s. "
                "Some lines may not be part of the diff.",
                e,
            )
            # Fall back to individual comments
            posted = 0
            for comment_data in comments:
                try:
                    pr.create_review_comment(
                        body=comment_data["body"],
                        commit=latest_commit,
                        path=comment_data["path"],
                        line=comment_data["line"],
                        side=comment_data["side"],
                    )
                    posted += 1
                except GithubException:
                    logger.debug(
                        "Skipped comment on %s:%d (not in diff)",
                        comment_data["path"],
                        comment_data["line"],
                    )
            return posted

    def _find_bot_comment(
        self, pr: PullRequest
    ) -> Optional[PullRequestComment]:
        """Find an existing bot comment on the PR for upsert."""
        try:
            for comment in pr.as_issue().get_comments():
                if _BOT_COMMENT_MARKER in (comment.body or ""):
                    return comment
        except GithubException:
            pass
        return None

    def close(self) -> None:
        """Close the GitHub API connection."""
        self._github.close()


# ---------------------------------------------------------------------------
# Comment formatting
# ---------------------------------------------------------------------------

_SEVERITY_EMOJI = {
    Severity.HIGH: "🔴",
    Severity.MEDIUM: "🟡",
    Severity.LOW: "🟢",
}


def _format_summary_comment(result: CodeReviewResult, elapsed: float) -> str:
    """Format a CodeReviewResult as a GitHub PR comment in Markdown."""
    lines = [
        _BOT_COMMENT_MARKER,
        "## 🤖 AI Code Review",
        "",
    ]

    if not result.issues:
        lines.extend([
            "✅ **No issues found!** The code changes look clean.",
            "",
            f"Quality Score: **{result.quality_score}/10** · Reviewed in {elapsed:.1f}s",
        ])
        return "\n".join(lines)

    # Issue counts
    high = sum(1 for i in result.issues if i.severity == Severity.HIGH)
    medium = sum(1 for i in result.issues if i.severity == Severity.MEDIUM)
    low = sum(1 for i in result.issues if i.severity == Severity.LOW)

    lines.append(
        f"Found **{len(result.issues)}** issue(s): "
        f"🔴 {high} high · 🟡 {medium} medium · 🟢 {low} low"
    )
    lines.append("")

    # Issue table
    lines.extend([
        "| Severity | File | Line | Category | Issue |",
        "|----------|------|------|----------|-------|",
    ])

    for issue in result.issues:
        emoji = _SEVERITY_EMOJI.get(issue.severity, "⚪")
        lines.append(
            f"| {emoji} {issue.severity.value.upper()} "
            f"| `{issue.file}` "
            f"| L{issue.line_number} "
            f"| {issue.category.value} "
            f"| {issue.explanation} |"
        )

    lines.extend([
        "",
        "<details>",
        "<summary>📝 Suggested Fixes</summary>",
        "",
    ])

    for issue in result.issues:
        emoji = _SEVERITY_EMOJI.get(issue.severity, "⚪")
        lines.extend([
            f"### {emoji} `{issue.file}:{issue.line_number}` — {issue.category.value}",
            "",
            issue.explanation,
            "",
            "**Suggested fix:**",
            f"```\n{issue.suggested_fix}\n```",
            "",
        ])

    lines.extend([
        "</details>",
        "",
        "---",
        f"Quality Score: **{result.quality_score}/10** · "
        f"Reviewed in {elapsed:.1f}s · "
        f"Model: `ai-codereview`",
    ])

    return "\n".join(lines)


def _format_inline_comment(issue: ReviewIssue) -> str:
    """Format a single ReviewIssue as an inline PR comment."""
    emoji = _SEVERITY_EMOJI.get(issue.severity, "⚪")
    return (
        f"{emoji} **{issue.severity.value.upper()}** — {issue.category.value}\n\n"
        f"{issue.explanation}\n\n"
        f"**Suggested fix:**\n```\n{issue.suggested_fix}\n```"
    )
