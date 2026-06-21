import React, { useState } from 'react';
import { ReviewSettingsPanel } from '../components/review/ReviewSettingsPanel';
import { ReviewSummary } from '../components/review/ReviewSummary';
import { IssueCard } from '../components/review/IssueCard';
import { CodeReviewResult } from '../types/review';
import { api } from '../services/api';
import { useReviewSettings } from '../hooks/useReviewSettings';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  GitPullRequest,
  Play,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Info,
} from 'lucide-react';
import { cn } from '../utils/cn';

export function GithubPRPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [postComments, setPostComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTokenOpen, setIsTokenOpen] = useState(false);

  const { settings, updateSettings } = useReviewSettings();

  // ── Helpers (preserved exactly) ─────────────────────────────────────────────
  const parseRepoUrl = (url: string) => {
    // If it's just owner/repo
    if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(url)) {
      return url;
    }
    // If it's a full github url
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'github.com') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      }
    } catch {
      // Ignored
    }
    return url;
  };

  const parsePrNumber = (url: string, currentPr: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'github.com') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 4 && parts[2] === 'pull') {
          return parts[3];
        }
      }
    } catch {
      // Ignored
    }
    return currentPr;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRepoUrl(val);

    // Auto-extract PR number if it's a full URL
    const extractedPr = parsePrNumber(val, prNumber);
    if (extractedPr !== prNumber) {
      setPrNumber(extractedPr);
    }
  };

  const handleAnalyze = async () => {
    setError(null);

    const cleanRepo = parseRepoUrl(repoUrl);
    if (!cleanRepo || (cleanRepo === repoUrl && !repoUrl.includes('/'))) {
      setError(
        'Invalid Repository format. Use owner/repo (e.g. facebook/react) or a full GitHub URL.'
      );
      return;
    }

    const cleanPr = parseInt(prNumber, 10);
    if (isNaN(cleanPr) || cleanPr <= 0) {
      setError('Invalid PR Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/review/github-pr', {
        repo: cleanRepo,
        pr_number: cleanPr,
        github_token: settings.github_token?.trim() || undefined,
        model: settings.model,
        post_comments: postComments,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to review Pull Request. Please check your inputs and tokens.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetReview = () => {
    setResult(null);
    setError(null);
  };

  // ── Results view ────────────────────────────────────────────────────────────
  if (result) {
    const hasIssues = result.issues && result.issues.length > 0;

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
        {/* Back */}
        <Button
          variant="ghost"
          onClick={resetReview}
          className="gap-2 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </Button>

        {/* Context strip */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 font-medium text-foreground">
            <GitPullRequest className="w-3.5 h-3.5" />
            PR #{prNumber}
          </span>
          <span className="text-xs">from</span>
          <span className="font-mono text-xs bg-muted/40 border rounded-md px-2 py-1">
            {parseRepoUrl(repoUrl)}
          </span>
        </div>

        {/* Summary card */}
        <ReviewSummary result={result} />

        {/* Issues or zero-issues success */}
        {hasIssues ? (
          <div className="space-y-3">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Findings
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {result.issues.length}
              </span>
            </h3>
            <div className="flex flex-col gap-3">
              {result.issues.map((issue, idx) => (
                <IssueCard
                  key={`${issue.file}-${issue.line_number}-${idx}`}
                  issue={issue}
                  index={idx}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                No issues found!
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Your code passed the AI review with no issues detected.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Setup view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shrink-0">
          <GitPullRequest className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GitHub PR Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically analyze any pull request. Catch issues before they merge.
          </p>
        </div>
      </div>

      {/* Collapsible AI Settings */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSettingsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <span>AI Settings</span>
          {isSettingsOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isSettingsOpen && (
          <div className="border-t">
            <ReviewSettingsPanel />
          </div>
        )}
      </div>

      {/* Input Form Card */}
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6">

        {/* ── Repository & PR ── */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-muted-foreground" />
              Repository
            </label>
            <Input
              placeholder="owner/repo or full GitHub PR URL"
              value={repoUrl}
              onChange={handleUrlChange}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Paste the full PR URL to auto-fill both fields
            </p>
          </div>

          <div className="w-full sm:w-48 space-y-1.5">
            <label className="text-sm font-medium">Pull Request Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                #
              </span>
              <Input
                type="number"
                placeholder="123"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* ── GitHub Token (collapsible) ── */}
        <div className="rounded-lg border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsTokenOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" />
              GitHub Token
              <span className="text-xs font-normal">(for private repos)</span>
            </span>
            {isTokenOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isTokenOpen && (
            <div className="border-t px-4 py-4 space-y-2 bg-muted/10">
              <Input
                type="password"
                placeholder="ghp_..."
                value={settings.github_token}
                onChange={(e) => updateSettings({ github_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Required for private repositories. Never stored.
              </p>
            </div>
          )}
        </div>

        {/* ── Post Comments toggle ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Post findings to GitHub PR</p>
              <p className="text-xs text-muted-foreground">
                The AI will automatically add review comments on the Pull Request.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={postComments}
              onClick={() => setPostComments((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                postComments
                  ? 'bg-indigo-500'
                  : 'bg-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  postComments ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {postComments && (
            <div className="flex items-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Requires a GitHub PAT with <span className="font-semibold">write</span> permissions.
              </p>
            </div>
          )}
        </div>

        {/* ── Analyze button ── */}
        <div className="pt-2 border-t flex flex-col sm:flex-row sm:justify-end">
          <Button
            onClick={handleAnalyze}
            isLoading={isSubmitting}
            size="lg"
            className="w-full sm:w-auto gap-2"
          >
            {!isSubmitting && <Play className="w-4 h-4" />}
            Analyze Pull Request
          </Button>
        </div>
      </div>

      {/* Error alert (below form, not replacing it) */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
