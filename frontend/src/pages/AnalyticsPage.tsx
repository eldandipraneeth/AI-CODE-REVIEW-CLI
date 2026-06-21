import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../services/api';
import { AnalyticsResponse } from '../types/analytics';
import { Skeleton } from '../components/ui/SkeletonLoader';
import { Button } from '../components/ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Calendar, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Minimal recharts custom-tooltip prop shape
interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomLineTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="font-semibold text-foreground">
        {val} {val === 1 ? 'review' : 'reviews'}
      </p>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1 font-medium capitalize">{label}</p>
      <p className="font-semibold text-foreground">{payload[0].value} issues</p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border rounded-xl shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-card border rounded-xl shadow-sm p-6">
        <Skeleton className="h-5 w-56 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-card border rounded-xl shadow-sm p-6">
            <Skeleton className="h-5 w-40 mb-6" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  sub: string;
}

function MetricCard({ icon, iconBg, label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <p className="text-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

// ─── Severity Colors ─────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  high: 'hsl(0, 84%, 60%)',    // red-500
  medium: 'hsl(43, 96%, 56%)', // amber-400
  low: 'hsl(213, 94%, 68%)',   // blue-400
};

// Custom tooltip for Pie
function CustomPieTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1 font-medium capitalize">{data.severity}</p>
      <p className="font-semibold text-foreground">{data.count} issues</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await reviewApi.getAnalytics();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <AnalyticsSkeleton />;

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-card border border-destructive/30 rounded-xl p-6 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = data.total_reviews === 0;

  // Format dates for the line chart
  const formattedTrends = data.trends.map((t) => ({
    ...t,
    dateLabel: format(parseISO(t.date), 'MMM d'),
  }));

  // Sort distributions by count descending
  const sortedSeverity = [...data.severity_distribution].sort((a, b) => b.count - a.count);
  const sortedCategory = [...data.category_distribution].sort((a, b) => b.count - a.count);
  const totalSeverityCount = sortedSeverity.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Gain insights into your codebase quality and review activity over time.
        </p>
      </div>

      {hasNoData ? (
        /* Empty State */
        <div className="bg-card border border-dashed rounded-xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No analytics data yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Start running AI code reviews to unlock powerful insights and trends.
          </p>
          <Link to="/dashboard/review">
            <Button size="sm">Run your first review</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              icon={<Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              iconBg="bg-indigo-100 dark:bg-indigo-900/40"
              label="Total Reviews"
              value={data.total_reviews}
              sub="All time"
            />
            <MetricCard
              icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-100 dark:bg-blue-900/40"
              label="This Month"
              value={data.reviews_this_month}
              sub="Current calendar month"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-100 dark:bg-emerald-900/40"
              label="This Week"
              value={data.reviews_this_week}
              sub="Mon – today"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Trend — full width */}
            <div className="bg-card border rounded-xl shadow-sm p-6 lg:col-span-2">
              <h3 className="font-semibold text-sm mb-1">Review Activity</h3>
              <p className="text-xs text-muted-foreground mb-6">Last 30 days</p>

              {formattedTrends.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formattedTrends}
                      margin={{ top: 8, right: 16, bottom: 20, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.6}
                      />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Reviews"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                  Not enough data to display trends yet.
                </div>
              )}
            </div>

            {/* Severity Distribution — Donut Chart */}
            <div className="bg-card border rounded-xl shadow-sm p-6 flex flex-col">
              <h3 className="font-semibold text-sm mb-1">Issues by Severity</h3>
              <p className="text-xs text-muted-foreground mb-6">Distribution of found issues</p>

              {sortedSeverity.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sortedSeverity}
                          dataKey="count"
                          nameKey="severity"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {sortedSeverity.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={SEVERITY_COLORS[entry.severity.toLowerCase()] || 'hsl(var(--muted))'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend underneath */}
                  <div className="flex gap-4 mt-4 text-xs font-medium">
                    {sortedSeverity.map((entry) => (
                      <div key={entry.severity} className="flex items-center gap-1.5">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: SEVERITY_COLORS[entry.severity.toLowerCase()] || 'gray' }} 
                        />
                        <span className="capitalize">{entry.severity}: {entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  No severity data yet.
                </div>
              )}
            </div>

            {/* Category Distribution — recharts horizontal bar chart */}
            <div className="bg-card border rounded-xl shadow-sm p-6 flex flex-col">
              <h3 className="font-semibold text-sm mb-1">Issues by Category</h3>
              <p className="text-xs text-muted-foreground mb-6">Top issue categories</p>

              {sortedCategory.length > 0 ? (
                <div className="flex-1 min-h-0" style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedCategory}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="hsl(var(--border))"
                        opacity={0.6}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                        tickFormatter={(val: string) =>
                          val.charAt(0).toUpperCase() + val.slice(1)
                        }
                      />
                      <Tooltip
                        content={<CustomBarTooltip />}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      />
                      <Bar
                        dataKey="count"
                        name="Issues"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                        opacity={0.85}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  No category data yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
