# 🔍 AI Code Reviewer Suite

**An intelligent, full-stack AI-powered code review platform.**  
Catch bugs, security flaws, and style issues before they hit production — whether you prefer a beautiful **Web Dashboard**, a fast **Terminal CLI**, or automated **GitHub Actions**.

[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue?style=flat-square&logo=python&logoColor=white)]()
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

---

## ✨ What is it?

**AI Code Review** is a complete tool suite that uses large language models (like Google Gemini, OpenAI, or Groq) to review your code. It reads your code or Git diffs, understands context across function boundaries, and returns structured, actionable feedback with severity levels, precise locations, and suggested fixes.

You can use it in three ways:
1. **🌐 Web Dashboard:** A beautiful React frontend to paste code snippets, upload files, or review GitHub PRs visually.
2. **💻 CLI Tool:** A terminal tool to review local unstaged/staged git changes instantly.
3. **⚡ GitHub Actions:** A CI/CD integration to automatically review Pull Requests and post inline comments.

---

## 🚀 Features

- 🧠 **Provider Agnostic:** Uses Google Gemini 2.5 Flash (default & free), OpenAI, or any compatible API.
- 🎨 **Beautiful Web UI:** Track review history, view analytics, and interact with reviews in a modern dashboard.
- 🎯 **Line-Precise Feedback:** Issues pinpoint the exact file and line number.
- 🔴🟡🟢 **Severity Levels:** High, Medium, Low — filter by what matters.
- 💬 **Automated PR Comments:** Automatically posts inline review comments on GitHub PRs.
- ✂️ **Smart Code Chunking:** Preserves function and class boundaries so the AI never loses context.

---

## 🌐 Setting up the Web Dashboard

The web application consists of a FastAPI backend and a Vite+React frontend.

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: source venv/bin/activate (Mac/Linux) or venv\Scripts\activate (Windows)
pip install -r requirements.txt

# Start the backend server (runs on http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install

# Start the frontend dev server (runs on http://localhost:5173)
npm run dev
```

### 3. Usage
Open **http://localhost:5173** in your browser. Create a free account (data is stored locally in SQLite), and navigate to the **Settings** page to input your Google Gemini API Key. You can now use the Code Editor, File Upload, or GitHub PR review tools directly from the browser!

---

## 💻 Using the CLI Tool

If you prefer to stay in the terminal, you can install the CLI globally.

### Installation
```bash
# In the root directory of the project
pip install -e .

# Set your API key
export AI_API_KEY="your-gemini-key-here"
```

### Review Local Changes
Make some code changes, stage them in Git, and run the reviewer:
```bash
git add .
codereview diff --staged
```

### Review a GitHub PR (Terminal)
Set your GitHub token and review any open PR:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
codereview pr 42 --repo owner/repo --post-comments
```

---

## 🤖 GitHub Actions Integration

Add AI-powered code review to every pull request in your repository automatically.

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
        uses: eldandipraneeth/AI-CODE-REVIEW-CLI@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ai_api_key: ${{ secrets.AI_API_KEY }}
          model: 'gemini-2.5-flash'
          severity_threshold: 'low'
          post_comments: 'true'
```

### Step 2: Add Secrets
Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:
- `AI_API_KEY`: Your Google Gemini API key.

*(Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions).*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
