import React, { useState } from 'react';
import { ReviewIssue } from '../../types/review';
import { SeverityBadge } from './SeverityBadge';
import { CategoryBadge } from './CategoryBadge';
import { ChevronDown, Copy, CheckCircle2, FileCode } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface IssueCardProps {
  issue: ReviewIssue;
  index: number;
}

// Severity-colored left border
function severityBorderClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':   return 'border-l-red-500';
    case 'medium': return 'border-l-amber-400';
    case 'low':    return 'border-l-blue-400';
    default:       return 'border-l-muted-foreground';
  }
}

export function IssueCard({ issue, index }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied]         = useState(false);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Issue in ${issue.file}:${issue.line_number}
Severity: ${issue.severity}
Category: ${issue.category}

Explanation:
${issue.explanation}

Suggested Fix:
${issue.suggested_fix}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'border border-l-4 rounded-lg bg-card overflow-hidden shadow-sm',
        'transition-shadow hover:shadow-md',
        severityBorderClass(issue.severity)
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
      >
        {/* Left: severity + location + preview */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="shrink-0 mt-0.5">
            <SeverityBadge severity={issue.severity} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-primary-700 dark:text-primary-400 break-all">
              <FileCode className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              {issue.file}
              <span className="text-muted-foreground font-normal">:{issue.line_number}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <CategoryBadge category={issue.category} />
              <span className="text-sm text-muted-foreground line-clamp-1">
                {issue.explanation.split('\n')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Right: copy + chevron */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
            title="Copy issue"
          >
            {copied
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* ── Expandable Body ────────────────────────────────────────── */}
      {/*
        Pure CSS max-height animation — no framer-motion needed.
        We use a div with overflow-hidden and transition on max-height.
      */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-0 border-t bg-muted/10">
          {/* Copy button (shown in expanded state, inside body) */}
          <div className="flex justify-between items-center mt-4 mb-2">
            <h4 className="text-label">Explanation</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 gap-2 text-xs"
            >
              {copied
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy issue'}
            </Button>
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-wrap mb-6 text-foreground/90">
            {issue.explanation}
          </div>

          <h4 className="text-label mb-2">Suggested Fix</h4>
          <div className="relative">
            <pre className="code-block">
              <code>{issue.suggested_fix}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
