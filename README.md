# 🔍 ai-codereview

**AI-powered code review, right from your terminal.**
Catch bugs, security flaws, and style issues before they hit production.

[![Python 3.9+](https://img.shields.io/pypi/pyversions/ai-codereview?style=flat-square&logo=python&logoColor=white)](https://pypi.org/project/ai-codereview/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-ready-2088FF?style=flat-square&logo=githubactions&logoColor=white)](#-github-actions-integration)

---

## ✨ What is ai-codereview?

**ai-codereview** is a smart CLI tool that uses large language models (like Google Gemini, OpenAI, or Groq) to review your code locally or in CI pipelines. It reads Git diffs, understands context across function boundaries, and returns structured, actionable feedback with severity levels, precise locations, and suggested fixes.

> Think of it as a senior engineer on your team who never sleeps, never gets annoyed, and reviews every single PR in seconds.

---

## 🎬 See It In Action

```
$ codereview diff --staged

  ai-codereview  ·  quality 1.0/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🔴 HIGH — security/demo_bad_code.py:17
    SQL injection — username directly concatenated into SQL string.

  🔴 HIGH — security/demo_bad_code.py:47
    ReDoS risk from untrusted regex patterns.

  🟡 MEDIUM — error_handling/demo_bad_code.py:30
    No error handling on HTTP request.

  🟢 LOW — performance/demo_bad_code.py:58
    N+1 query problem — fetch all posts in single query.

  14 issues · 9 high · 5 medium · 0 low · 21.2s

── Suggested Fixes ───────────────────────────────

🔴 demo_bad_code.py:17 (security)
  cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
```

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🧠 **Provider Agnostic** | Uses Google Gemini (default), OpenAI, Groq, or any compatible API |
| 🎯 **Line-Precise Feedback** | Issues pinpoint the exact file and line number |
| 🔴🟡🟢 **Severity Levels** | High, Medium, Low — filter by what matters |
| 💬 **PR Comments** | Automatically posts inline review comments on GitHub PRs |
| 📋 **Structured Output** | JSON output for CI pipelines and tooling integration |
| ✂️ **Smart Chunking** | AST-aware code splitting preserves function/class boundaries |
| ⚡ **GitHub Actions** | Drop-in composite action for zero-config CI integration |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-org/codereview-cli.git
cd codereview-cli

# Install the CLI tool
pip install -e .
```
**Requirements:** Python 3.9+ and Git.

---

## ⚡ Quick Start

### 1. Set your API key
Get a **free** Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
```bash
export AI_API_KEY="your-gemini-key-here"
```
*(Alternatively, you can create a `.env` file in the project root).*

### 2. Review Local Changes
Make some code changes, stage them in Git, and run the reviewer:
```bash
git add .
codereview diff --staged
```

### 3. Review a GitHub PR
Set your GitHub token and review any open PR:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
codereview pr 42 --repo owner/repo --post-comments
```

---

## 📖 CLI Usage

### `codereview diff` — Review local Git changes
Review staged or unstaged changes before you commit.

```bash
codereview diff [options]
```

| Option | Description | Default |
|---|---|---|
| `--staged` / `--unstaged` | Review staged or unstaged git changes | `--staged` |
| `--model` | AI model to use | `gemini-2.5-flash` |
| `--max-issues` | Maximum number of issues to report | `20` |
| `--json` | Output results as raw JSON | `false` |

### `codereview pr` — Review a GitHub Pull Request
Fetch PR diffs remotely and optionally post inline comments on GitHub.

```bash
codereview pr <number> --repo <owner/repo> [options]
```

| Option | Description | Default |
|---|---|---|
| `<number>` | Pull request number | *(required)* |
| `--repo` | GitHub repository (`owner/repo`) | *(required)* |
| `--model` | AI model to use | `gemini-2.5-flash` |
| `--severity` | Minimum severity to report (`low`, `medium`, `high`) | `low` |
| `--post-comments` | Post inline comments on the GitHub PR | `false` |
| `--json` | Output results as JSON | `false` |

### `codereview config` — View active configuration
Display your currently loaded environment variables, API endpoints, and models.

```bash
codereview config
```

---

## 🤖 GitHub Actions Integration

Add AI-powered code review to every pull request in **under 2 minutes**.

### Step 1: Add the workflow

Create `.github/workflows/review.yml` in your repository:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

jobs:
  review:
    name: 🤖 AI Code Review
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run AI Code Review
        uses: your-org/codereview-cli@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ai_api_key: ${{ secrets.AI_API_KEY }}
          model: 'gemini-2.5-flash'
          severity_threshold: 'low'
          post_comments: 'true'
```

### Step 2: Add Secrets

Go to **Settings → Secrets and variables → Actions** and add:
- `AI_API_KEY`: Your Google Gemini (or OpenAI) API key.

> `GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

## ⚙️ Configuration (Environment Variables)

| Variable | Description |
|---|---|
| `AI_API_KEY` | Your API key (Gemini, Groq, or OpenAI). |
| `AI_BASE_URL` | Custom API endpoint (e.g., `https://generativelanguage.googleapis.com/v1beta/openai/`). |
| `CODEREVIEW_MODEL` | The model string (default: `gemini-2.5-flash`). |
| `GITHUB_TOKEN` | GitHub Personal Access Token (for PR commands). |

---

## 🏗️ Architecture

1. **Input:** Git diffs are parsed and passed to the smart chunking engine.
2. **Chunking:** The AST-aware `chunker.py` splits large diffs into logical blocks, preserving function and class boundaries so the LLM doesn't lose context.
3. **Review:** Chunks are sent to the AI API concurrently. The framework uses strict Pydantic schemas (in `schemas.py`) to guarantee the AI responds with perfectly formatted JSON.
4. **Aggregation:** Results are merged, deduplicated, and sorted by severity.
5. **Output:** The Rich formatter displays a beautiful summary in the terminal, or the GitHub client posts inline comments on the PR.

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Clone the repository
git clone https://github.com/your-org/codereview-cli.git
cd codereview-cli

# Install with development dependencies
pip install -e ".[dev]"

# Run the test suite
pytest

# Format the code
ruff check . --fix
```

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
