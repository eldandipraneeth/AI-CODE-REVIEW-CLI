import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  GitBranch,
  Scissors,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function LandingPage() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-24 lg:py-36 bg-gray-50 dark:bg-[hsl(20_6%_6%)] overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(250 84% 60% / 0.18), transparent 70%)',
          }}
        />

        {/* Badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-primary-800/60 bg-primary-950/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-300">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
          AI-Powered&nbsp;•&nbsp;Gemini 2.5 Flash
        </div>

        {/* Headline */}
        <h1 className="relative max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-7xl leading-[1.08]">
          Code Review That{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-violet-400 to-indigo-400">
            Actually Thinks
          </span>
        </h1>

        {/* Subheadline */}
        <p className="relative mt-6 max-w-2xl text-lg text-gray-500 dark:text-[hsl(218_14%_62%)] leading-relaxed">
          Catch bugs, vulnerabilities, and code smells before they reach
          production — powered by Gemini 2.5 Flash across 7 languages.
        </p>

        {/* CTAs */}
        <div className="relative mt-10 flex flex-col sm:flex-row gap-3">
          <Link to="/register">
            <Button size="lg" className="gap-2 px-7 text-base font-semibold">
              Start Reviewing Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              size="lg"
              className="px-7 text-base font-semibold border-gray-300 dark:border-[hsl(222_14%_28%)] text-gray-700 dark:text-[hsl(210_20%_82%)] hover:bg-gray-100 dark:hover:bg-[hsl(222_18%_13%)] hover:text-gray-900 dark:hover:text-white"
            >
              Sign In
            </Button>
          </Link>
        </div>

        {/* Hero Terminal Mockup */}
        <div className="relative mt-16 w-full max-w-3xl rounded-xl border border-gray-200 dark:border-[hsl(20_8%_20%)] bg-white dark:bg-[hsl(20_6%_9%)] shadow-2xl overflow-hidden text-left">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-[hsl(20_8%_16%)] bg-gray-50 dark:bg-[hsl(20_6%_12%)]">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-gray-400 dark:text-[hsl(218_14%_42%)] font-mono">
              ai-code-review &mdash; review output
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-5 font-mono text-sm leading-relaxed space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-[hsl(142_64%_44%)]">
              <span className="text-gray-400 dark:text-[hsl(218_14%_42%)]">$</span>
              <span className="text-gray-800 dark:text-[hsl(210_20%_88%)]">review</span>
              <span className="text-gray-500 dark:text-[hsl(218_14%_58%)]">src/auth/middleware.py</span>
            </div>

            <div className="text-gray-400 dark:text-[hsl(218_14%_50%)] text-xs">
              ─── Analysing 312 lines across 1 chunk ───
            </div>

            {/* Issue rows */}
            <div className="space-y-2 pt-1">
              <ReviewLine
                severity="critical"
                badge="CRITICAL"
                file="middleware.py:47"
                msg="SQL query built with string concatenation — SQL injection risk"
              />
              <ReviewLine
                severity="high"
                badge="HIGH"
                file="middleware.py:89"
                msg="JWT secret falls back to hardcoded value in production"
              />
              <ReviewLine
                severity="medium"
                badge="MEDIUM"
                file="middleware.py:134"
                msg="Missing rate limiting on /auth/login endpoint"
              />
              <ReviewLine
                severity="low"
                badge="LOW"
                file="middleware.py:201"
                msg="Unused import 'hashlib' increases bundle overhead"
              />
              <ReviewLine
                severity="info"
                badge="INFO"
                file="middleware.py:278"
                msg="Consider using bcrypt cost factor ≥ 12 for new installations"
              />
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-gray-100 dark:border-[hsl(20_8%_18%)] text-xs">
              <span className="text-gray-400 dark:text-[hsl(218_14%_50%)]">Score</span>
              <span className="text-gray-900 dark:text-white font-bold text-base">62 / 100</span>
              <span className="text-gray-400 dark:text-[hsl(218_14%_50%)]">Issues:</span>
              <span className="text-red-400">1 critical</span>
              <span className="text-orange-400">1 high</span>
              <span className="text-yellow-400">1 medium</span>
              <span className="text-blue-400">2 info</span>
            </div>

            <div className="text-gray-400 dark:text-[hsl(218_14%_40%)] text-xs">
              ✓ Review completed in 2.3s
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section className="bg-gray-100 dark:bg-[hsl(20_6%_11%)] border-t border-gray-200 dark:border-[hsl(20_8%_16%)]">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-[hsl(20_8%_18%)]">
            <StatItem value="2.5s" label="avg review time" />
            <StatItem value="7" label="languages supported" />
            <StatItem value="3" label="review types" />
            <StatItem value="Zero" label="config required" />
          </dl>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-background border-t py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <p className="text-label mb-3">Features</p>
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need in one review
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
              From quick snippet analysis to full GitHub PR coverage — the same
              Gemini intelligence powers every review.
            </p>
          </div>

          {/* Asymmetric layout: 1 hero card left + 2 stacked cards right */}
          <div className="grid md:grid-cols-5 gap-6">
            {/* Hero feature card — spans 3 cols, dark bg, large */}
            <div className="md:col-span-3 group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-100 via-white to-gray-50 dark:from-amber-950/40 dark:via-[hsl(20_6%_11%)] dark:to-[hsl(20_6%_9%)] p-8 flex flex-col justify-between min-h-[260px] shadow-lg hover:border-amber-500/40 transition-all">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20 mb-6">
                  <Zap className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Instant AI Analysis</h3>
                <p className="text-gray-600 dark:text-[hsl(218_14%_62%)] leading-relaxed">
                  Paste any code snippet and receive a structured, line-level review in under 3 seconds. Bug detection, security vulnerabilities, and style feedback — all in one pass. No setup. No waiting.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Powered by Gemini 2.5 Flash</span>
              </div>
            </div>

            {/* 2 smaller cards stacked — spans 2 cols */}
            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="group rounded-2xl border bg-card p-6 flex flex-col gap-4 hover:shadow-md hover:border-blue-500/30 transition-all">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50">
                  <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">GitHub PR Integration</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Review any public pull request automatically. Every changed file analysed, every issue reported inline.
                  </p>
                </div>
              </div>

              <div className="group rounded-2xl border bg-card p-6 flex flex-col gap-4 hover:shadow-md hover:border-emerald-500/30 transition-all">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                  <Scissors className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">Smart Chunking Engine</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Large files split along function boundaries via AST parsing — preserving full context within token limits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="bg-[hsl(var(--surface))] border-t py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center mb-16">
            <p className="text-label mb-3">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight">
              From code to insights in three steps
            </h2>
          </div>

          {/* Steps with inline arrow connectors — no absolute positioning */}
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 items-start">
            <Step
              num="01"
              title="Paste code or connect GitHub"
              body="Upload a file, paste a snippet, or drop in a GitHub PR URL. The CLI handles the rest."
            />
            {/* Arrow connector 1 */}
            <div className="hidden md:flex items-start justify-center pt-3">
              <ArrowRight className="h-5 w-5 text-gray-300 dark:text-[hsl(20_8%_28%)] shrink-0" />
            </div>
            <Step
              num="02"
              title="AI reviews every line"
              body="Gemini 2.5 Flash analyses logic, security, style, and performance — with line-level precision."
            />
            {/* Arrow connector 2 */}
            <div className="hidden md:flex items-start justify-center pt-3">
              <ArrowRight className="h-5 w-5 text-gray-300 dark:text-[hsl(20_8%_28%)] shrink-0" />
            </div>
            <Step
              num="03"
              title="Fix issues with confidence"
              body="Each finding includes a severity score and actionable explanation so you know exactly what to change."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-gray-100 dark:bg-[hsl(20_6%_7%)] border-t border-gray-200 dark:border-[hsl(20_8%_14%)] pt-16 pb-8">
        <div className="mx-auto max-w-6xl px-4">
          {/* Top row: brand + nav columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-gray-200 dark:border-[hsl(20_8%_14%)]">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-md bg-primary-600 flex items-center justify-center">
                  <Code2 className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm text-gray-900 dark:text-white">AI Code Review</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed max-w-[200px]">
                AI-powered code analysis that catches bugs, security issues, and bad patterns before they reach production.
              </p>
              {/* Tech stack tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-800 text-gray-500 dark:text-gray-400">Gemini 2.5 Flash</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-800 text-gray-500 dark:text-gray-400">FastAPI</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-800 text-gray-500 dark:text-gray-400">React</span>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">Product</p>
              <ul className="space-y-3">
                <li><Link to="/register" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/dashboard/review" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Code Review</Link></li>
              </ul>
            </div>

            {/* Features links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">Features</p>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-500 dark:text-gray-400">GitHub PR Review</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">File Upload Analysis</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">AST-aware Chunking</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">Review Analytics</span></li>
              </ul>
            </div>

            {/* Languages */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">Languages</p>
              <ul className="space-y-3">
                {['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++'].map(lang => (
                  <li key={lang}><span className="text-sm text-gray-500 dark:text-gray-400">{lang}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom row: copyright + built by */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-xs text-gray-400 dark:text-[hsl(30_8%_36%)]">
              &copy; {new Date().getFullYear()} AI Code Review. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 dark:text-[hsl(30_8%_36%)]">
              Designed &amp; Developed by{' '}
              <span className="text-gray-600 dark:text-[hsl(30_10%_58%)] font-semibold">Eldandi Praneeth</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function ReviewLine({
  severity,
  badge,
  file,
  msg,
}: {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  badge: string;
  file: string;
  msg: string;
}) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/70 dark:text-red-400 dark:border-red-800/50',
    high:     'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-950/70 dark:text-orange-400 dark:border-orange-800/50',
    medium:   'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-950/70 dark:text-yellow-500 dark:border-yellow-800/50',
    low:      'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-400 dark:border-blue-800/50',
    info:     'bg-gray-100 text-gray-600 border border-gray-300 dark:bg-[hsl(20_6%_16%)] dark:text-[hsl(30_8%_55%)] dark:border-[hsl(20_8%_22%)]',
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[severity]}`}
      >
        {badge}
      </span>
      <span className="text-gray-400 dark:text-[hsl(30_8%_50%)] shrink-0">{file}</span>
      <span className="text-gray-700 dark:text-[hsl(30_10%_76%)]">{msg}</span>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center py-4 px-6 gap-1">
      <dt className="text-2xl font-bold text-gray-900 dark:text-white">{value}</dt>
      <dd className="text-xs text-gray-500 dark:text-[hsl(218_14%_52%)] uppercase tracking-widest">{label}</dd>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800/60">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg mb-5 ${iconBg}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-md mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-200 dark:border-primary-800/60 bg-primary-50 dark:bg-primary-950/40">
        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{num}</span>
      </div>
      <h3 className="font-semibold text-md">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
