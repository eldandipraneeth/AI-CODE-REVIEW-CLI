import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { reviewApi } from '../services/api';
import { AnalyticsResponse, ReviewListResponse } from '../types/analytics';
import { Button } from '../components/ui/Button';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Activity,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Plus,
  FileSearch,
  ArrowRight,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatReviewType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Left-border color per review type
function typeAccentClass(type: string): string {
  if (type === 'github_pr') return 'bg-emerald-500';
  if (type === 'file_upload') return 'bg-blue-500';
  return 'bg-indigo-500'; // code / default
}

// Review type pill color
function typePillClass(type: string): string {
  if (type === 'github_pr')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (type === 'file_upload')
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
  return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [history, setHistory] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const analyticsData = await reviewApi.getAnalytics();
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Failed to load analytics data', err);
      }
      
      try {
        const historyData = await reviewApi.getHistory({ page: 1, limit: 5 });
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to load history data', err);
      }
      
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalIssues =
    analytics?.severity_distribution?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const topCategory =
    analytics?.category_distribution?.slice().sort((a, b) => b.count - a.count)[0]
      ?.category ?? null;

  const highThisWeek =
    analytics?.severity_distribution?.find(
      (s) => s.severity.toLowerCase() === 'high'
    )?.count ?? 0;

  const showQuickStats =
    analytics !== null &&
    (analytics.reviews_this_week > 0 ||
      analytics.reviews_this_month > 0 ||
      topCategory !== null);

  const hasReviews = (history?.reviews?.length ?? 0) > 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {getGreeting()}, {user?.username}
          </h1>
          <p className="text-muted-foreground text-sm">
            Your code review activity at a glance
          </p>
        </div>
        <Link to="/dashboard/review">
          <Button className="gap-2 shadow-sm shrink-0">
            <Plus className="w-4 h-4" />
            New Review
          </Button>
        </Link>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

        {/* Total Reviews */}
        <div className="bg-card border rounded-xl shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </span>
            <span className="text-label">Total Reviews</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {analytics?.total_reviews ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">All time</p>
        </div>

        {/* This Week */}
        <div className="bg-card border rounded-xl shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
            <span className="text-label">This Week</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {analytics?.reviews_this_week ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>

        {/* This Month */}
        <div className="bg-card border rounded-xl shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="text-label">This Month</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {analytics?.reviews_this_month ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </div>

        {/* Issues Found */}
        <div className="bg-card border rounded-xl shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </span>
            <span className="text-label">Issues Found</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">{totalIssues}</p>
          <p className="text-xs text-muted-foreground">Across all reviews</p>
        </div>
      </div>

      {/* ── Recent Activity (full width) ── */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b flex justify-between items-center bg-muted/10">
          <h2 className="font-semibold text-base">Recent Reviews</h2>
          <Link
            to="/dashboard/history"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Rows or empty state */}
        {hasReviews ? (
          <div className="divide-y">
            {history!.reviews.map((review) => (
              <div
                key={review.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                {/* Type accent bar */}
                <span
                  className={`w-1 h-10 rounded-full shrink-0 ${typeAccentClass(review.review_type)}`}
                />

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm leading-snug">
                    {review.source_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typePillClass(review.review_type)}`}
                    >
                      {formatReviewType(review.review_type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>

                {/* Severity + action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex gap-1">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs font-bold">
                      {review.high_count}
                    </span>
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold">
                      {review.medium_count}
                    </span>
                  </div>
                  <Link to={`/dashboard/reviews/${review.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <FileSearch className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-base mb-1">No reviews yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Run your first code review to see results here
            </p>
            <Link to="/dashboard/review">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Start a Review
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Stats Strip ── */}
      {showQuickStats && (
        <div className="bg-card border rounded-xl shadow-sm px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">High severity this week</span>
              <span className="font-semibold text-sm mt-0.5">
                {highThisWeek} issue{highThisWeek !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="hidden sm:block w-px h-8 bg-border" />

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Reviews this month</span>
              <span className="font-semibold text-sm mt-0.5">
                {analytics?.reviews_this_month ?? 0}
              </span>
            </div>

            {topCategory && (
              <>
                <div className="hidden sm:block w-px h-8 bg-border" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Top category</span>
                  <span className="font-semibold text-sm mt-0.5 capitalize">
                    {topCategory}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
