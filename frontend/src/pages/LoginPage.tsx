import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Code2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.access_token, response.data.user);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to login. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-screen">
      {/* ── Left: Form panel ─────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-20 bg-background">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="h-8 w-8 rounded-md bg-primary-600 flex items-center justify-center shadow-sm transition-all group-hover:bg-primary-700">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground">AI Code Review</span>
          </Link>

          {/* Headings */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue to your dashboard
          </p>

          {/* Error alert */}
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                  Password
                </label>
              </div>

              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              size="default"
            >
              Sign In
            </Button>
          </form>

          {/* Footer link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right: Branded panel ───────────────── */}
      <div className="hidden md:flex flex-1 flex-col justify-between px-12 py-14 bg-gray-100 dark:bg-[hsl(20_6%_8%)] border-l border-gray-200 dark:border-[hsl(20_8%_16%)]">
        {/* Top: product name */}
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">AI Code Review</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug max-w-xs">
            Intelligent reviews for every commit
          </h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-[hsl(30_8%_55%)] max-w-xs leading-relaxed">
            Catch bugs, vulnerabilities, and code smells before they reach
            production — powered by Gemini 2.5 Flash.
          </p>

          {/* Bullet points */}
          <ul className="mt-8 space-y-3.5">
            {[
              'Instant AI-powered code analysis',
              'GitHub PR review in seconds',
              'Supports 7 programming languages',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-gray-600 dark:text-[hsl(30_10%_78%)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle: mini review card mockup */}
        <div className="my-10 rounded-xl border border-gray-200 dark:border-[hsl(20_8%_20%)] bg-white dark:bg-[hsl(20_6%_9%)] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Review Summary</span>
            </div>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              Score: 87
            </span>
          </div>

          <div className="space-y-2.5">
            <MiniStat color="text-red-400"    label="Critical" count={0} />
            <MiniStat color="text-orange-400" label="High"     count={1} />
            <MiniStat color="text-yellow-400" label="Medium"   count={3} />
            <MiniStat color="text-blue-400"   label="Info"     count={5} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[hsl(20_8%_18%)] flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-[hsl(30_8%_45%)]">Reviewed in</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-[hsl(30_10%_78%)]">2.1s</span>
          </div>
        </div>

        {/* Bottom: subtle tagline */}
        <p className="text-xs text-gray-400 dark:text-[hsl(30_8%_38%)]">
          &copy; {new Date().getFullYear()} AI Code Review
        </p>
      </div>
    </div>
  );
}

function MiniStat({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className="text-xs text-[hsl(218_14%_52%)]">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${color}`}>{count}</span>
    </div>
  );
}
