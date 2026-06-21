import React, { useState } from 'react';
import { CodeReviewResult } from '../types/review';
import { ReviewSettingsPanel } from '../components/review/ReviewSettingsPanel';
import { CodeEditorTab } from '../components/review/CodeEditorTab';
import { FileUploadTab } from '../components/review/FileUploadTab';
import { ReviewSummary } from '../components/review/ReviewSummary';
import { IssueCard } from '../components/review/IssueCard';
import {
  Code2,
  Upload,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export function CodeReviewPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'upload'>('editor');
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleResult = (newResult: CodeReviewResult) => {
    setResult(newResult);
    setError(null);
  };

  const handleError = (errMsg: string) => {
    setError(errMsg);
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
          Back to Editor
        </Button>

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

  // ── Editor / Upload view ────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Code Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze code with AI — paste a snippet or upload a file.
        </p>
      </div>

      {/* Collapsible AI Settings */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSettingsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>AI Settings</span>
          </span>
          {isSettingsOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isSettingsOpen && (
          <div className="border-t px-0 py-0">
            <ReviewSettingsPanel />
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Editor card */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {/* Pill tab bar */}
        <div className="px-4 pt-3 pb-2 border-b bg-muted/20">
          <div className="inline-flex items-center gap-1 rounded-lg bg-muted/40 p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={cn(
                'flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                activeTab === 'editor'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code2 className="w-4 h-4" />
              Code Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={cn(
                'flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                activeTab === 'upload'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Upload className="w-4 h-4" />
              File Upload
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'editor' ? (
            <CodeEditorTab onReviewResult={handleResult} onError={handleError} />
          ) : (
            <FileUploadTab onReviewResult={handleResult} onError={handleError} />
          )}
        </div>
      </div>
    </div>
  );
}
