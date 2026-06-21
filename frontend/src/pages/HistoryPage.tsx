import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { reviewApi } from '../services/api';
import { ReviewListResponse, ReviewListItem } from '../types/analytics';
import { Skeleton } from '../components/ui/SkeletonLoader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  GitPullRequest,
  FileCode,
  FileText,
  FileSearch,
  AlertCircle,
  X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; iconBg: string; accentColor: string }> = {
  github_pr: {
    label: 'GitHub PR',
    color: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    accentColor: 'bg-emerald-500',
  },
  file: {
    label: 'File Upload',
    color: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    accentColor: 'bg-blue-500',
  },
  code: {
    label: 'Pasted Code',
    color: 'text-indigo-700 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    accentColor: 'bg-indigo-500',
  },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META['code'];
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'github_pr': return <GitPullRequest className="w-4 h-4" />;
    case 'file': return <FileText className="w-4 h-4" />;
    default: return <FileCode className="w-4 h-4" />;
  }
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 8
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800'
      : score >= 5
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-amber-200 dark:ring-amber-800'
      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 ring-red-200 dark:ring-red-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${cls}`}>
      {score.toFixed(1)}/10
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex">
      <div className="w-1 shrink-0 bg-muted/50 animate-pulse" />
      <div className="flex-1 p-4 flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-7 w-16 rounded-full" />
        <div className="flex gap-1.5">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="h-8 w-14 rounded-md" />
      </div>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ r }: { r: ReviewListItem }) {
  const meta = getTypeMeta(r.review_type);
  const formattedDate = new Date(r.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      to={`/dashboard/reviews/${r.id}`}
      className="group bg-card border rounded-xl shadow-sm overflow-hidden flex hover:shadow-md transition-shadow duration-200"
    >
      {/* Left accent */}
      <div className={`w-1 shrink-0 ${meta.accentColor}`} />

      {/* Content */}
      <div className="flex-1 p-4 flex items-center gap-4 min-w-0 group-hover:bg-muted/20 transition-colors duration-150">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.color}`}>
          {getTypeIcon(r.review_type)}
        </div>

        {/* Left: source name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{r.source_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.iconBg} ${meta.color}`}>
              {getTypeIcon(r.review_type)}
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>

        {/* Score */}
        <div className="shrink-0">
          <ScoreBadge score={r.quality_score} />
        </div>

        {/* Severity bubbles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            title={`${r.high_count} High`}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs font-bold"
          >
            {r.high_count}
          </span>
          <span
            title={`${r.medium_count} Medium`}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold"
          >
            {r.medium_count}
          </span>
          <span
            title={`${r.low_count} Low`}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 text-xs font-bold"
          >
            {r.low_count}
          </span>
        </div>

        {/* View button */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-xs px-3"
          onClick={(e) => e.preventDefault()} // prevents double-navigation (Link handles it)
        >
          View
        </Button>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states (sync with URL)
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const severity = searchParams.get('severity') || '';
  const category = searchParams.get('category') || '';
  const reviewType = searchParams.get('review_type') || '';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.getHistory({
        page,
        limit: 10,
        search: search || undefined,
        severity: severity || undefined,
        category: category || undefined,
        review_type: reviewType || undefined,
      });
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load review history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, severity, category, reviewType]); // Exclude search to avoid fetching on every keystroke

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search, page: '1' });
    fetchHistory();
  };

  const updateFilters = (newParams: Record<string, string>) => {
    const current = Object.fromEntries([...searchParams]);
    const merged = { ...current, ...newParams };

    // Clean empty
    Object.keys(merged).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });

    setSearchParams(merged);
  };

  const hasActiveFilters = !!(search || severity || reviewType);

  const typeChipLabel: Record<string, string> = {
    code: 'Pasted Code',
    file: 'File Upload',
    github_pr: 'GitHub PR',
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;
  const startItem = data ? (page - 1) * data.limit + 1 : 0;
  const endItem = data ? Math.min(page * data.limit, data.total) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Review History</h1>
          <p className="text-muted-foreground text-sm">Browse, search, and filter your AI code reviews</p>
        </div>
        {data && !loading && (
          <span className="shrink-0 text-sm font-medium text-muted-foreground bg-muted/40 border rounded-full px-3 py-1">
            {data.total} {data.total === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-card border shadow-sm p-4 rounded-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search repository, filename, or PR…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-full"
            />
          </div>

          {/* Selects + button row */}
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              value={reviewType}
              onChange={(e) => updateFilters({ review_type: e.target.value, page: '1' })}
            >
              <option value="">All Types</option>
              <option value="code">Pasted Code</option>
              <option value="file">File Upload</option>
              <option value="github_pr">GitHub PR</option>
            </select>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              value={severity}
              onChange={(e) => updateFilters({ severity: e.target.value, page: '1' })}
            >
              <option value="">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <Button type="submit" variant="outline" size="sm" className="px-5 shrink-0">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </form>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {reviewType && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-1 rounded-full">
                Type: {typeChipLabel[reviewType] ?? reviewType}
                <button
                  type="button"
                  onClick={() => updateFilters({ review_type: '', page: '1' })}
                  className="hover:opacity-70 transition-opacity"
                  aria-label="Remove type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {severity && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                severity === 'high'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : severity === 'medium'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              }`}>
                Severity: {severity.charAt(0).toUpperCase() + severity.slice(1)}
                <button
                  type="button"
                  onClick={() => updateFilters({ severity: '', page: '1' })}
                  className="hover:opacity-70 transition-opacity"
                  aria-label="Remove severity filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                Search: "{search}"
                <button
                  type="button"
                  onClick={() => { setSearch(''); updateFilters({ search: '', page: '1' }); }}
                  className="hover:opacity-70 transition-opacity"
                  aria-label="Remove search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-destructive/30 rounded-xl p-6 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">Failed to load reviews</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistory} className="shrink-0">
            Retry
          </Button>
        </div>
      ) : data?.reviews.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <FileSearch className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {hasActiveFilters ? 'No reviews match your filters' : 'No reviews found'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            {hasActiveFilters
              ? 'Try broadening your search or removing some filters.'
              : 'Run your first AI code review to see results here.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchParams({});
              }}
              className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear all filters
            </button>
          ) : (
            <Link to="/dashboard/review">
              <Button size="sm">Start a Review</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Card list */}
          <div className="space-y-3">
            {data?.reviews.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">{startItem}–{endItem}</span>{' '}
                of{' '}
                <span className="font-medium text-foreground">{data.total}</span>{' '}
                reviews
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(page - 1) })}
                  disabled={page <= 1}
                  className="gap-1 px-3"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>

                <span className="text-sm text-muted-foreground px-2 font-medium">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(page + 1) })}
                  disabled={page * data.limit >= data.total}
                  className="gap-1 px-3"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
