#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AI Code Review — GitHub Actions Entrypoint
# Runs the codereview CLI against a pull request and captures
# the result for downstream steps.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── Resolve inputs ──────────────────────────────────────────
MODEL="${INPUT_MODEL:-gpt-4o}"
SEVERITY="${INPUT_SEVERITY_THRESHOLD:-low}"
POST_COMMENTS="${INPUT_POST_COMMENTS:-true}"

echo "┌──────────────────────────────────────────────┐"
echo "│  🤖  AI Code Review                          │"
echo "├──────────────────────────────────────────────┤"
echo "│  PR:        #${PR_NUMBER}                    "
echo "│  Repo:      ${GITHUB_REPOSITORY}             "
echo "│  Model:     ${MODEL}                         "
echo "│  Severity:  ${SEVERITY}                      "
echo "│  Comments:  ${POST_COMMENTS}                 "
echo "└──────────────────────────────────────────────┘"
echo ""

# ── Validate required environment variables ─────────────────
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "::error::GITHUB_TOKEN is not set. Please pass it as an input."
  echo "review_status=failure" >> "$GITHUB_OUTPUT"
  exit 1
fi

if [ -z "${AI_API_KEY:-}" ]; then
  echo "::error::AI_API_KEY is not set. Please pass it as an input."
  echo "review_status=failure" >> "$GITHUB_OUTPUT"
  exit 1
fi

if [ -z "${PR_NUMBER:-}" ]; then
  echo "::warning::No pull request number detected. Skipping review."
  echo "review_status=skipped" >> "$GITHUB_OUTPUT"
  echo "issues_found=0" >> "$GITHUB_OUTPUT"
  exit 0
fi

# ── Build the command ───────────────────────────────────────
CMD="codereview pr ${PR_NUMBER} --repo ${GITHUB_REPOSITORY} --model ${MODEL} --severity-threshold ${SEVERITY}"

if [ "${POST_COMMENTS}" = "true" ]; then
  CMD="${CMD} --post-comments"
fi

CMD="${CMD} --json"

echo "▶ Running: ${CMD}"
echo ""

# ── Execute review ──────────────────────────────────────────
OUTPUT_FILE=$(mktemp)
EXIT_CODE=0

${CMD} > "${OUTPUT_FILE}" 2>&1 || EXIT_CODE=$?

# Print output for workflow logs
cat "${OUTPUT_FILE}"

# ── Parse results ───────────────────────────────────────────
if [ ${EXIT_CODE} -eq 0 ]; then
  echo ""
  echo "✅ Review completed successfully."
  ISSUES=$(python3 -c "
import json, sys
try:
    data = json.load(open('${OUTPUT_FILE}'))
    print(data.get('total_issues', 0))
except Exception:
    print(0)
" 2>/dev/null || echo "0")
  echo "review_status=success" >> "$GITHUB_OUTPUT"
  echo "issues_found=${ISSUES}" >> "$GITHUB_OUTPUT"
elif [ ${EXIT_CODE} -eq 2 ]; then
  echo ""
  echo "⚠️  Review completed with warnings."
  echo "review_status=success" >> "$GITHUB_OUTPUT"
  echo "issues_found=0" >> "$GITHUB_OUTPUT"
else
  echo ""
  echo "❌ Review failed with exit code ${EXIT_CODE}."
  echo "review_status=failure" >> "$GITHUB_OUTPUT"
  echo "issues_found=0" >> "$GITHUB_OUTPUT"
  exit ${EXIT_CODE}
fi

# ── Cleanup ─────────────────────────────────────────────────
rm -f "${OUTPUT_FILE}"

echo ""
echo "🏁 Done."
