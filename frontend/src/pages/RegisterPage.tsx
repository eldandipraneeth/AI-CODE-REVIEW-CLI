import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Sparkles,
} from 'lucide-react';

export function RegisterPage() {
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', { email, username, password });
      login(response.data.access_token, response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to register. Please try again.'
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
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start reviewing code for free — no credit card required
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

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                Username
              </label>
              <Input
                type="text"
                placeholder="developer123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
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
              <p className="text-xs text-muted-foreground mt-1">
                Min. 6 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              size="default"
            >
              Create Account
            </Button>
          </form>

          {/* Footer link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right: Branded panel ───────────────── */}
      <div className="hidden md:flex flex-1 flex-col justify-between px-12 py-14 bg-gray-100 dark:bg-[hsl(20_6%_8%)] border-l border-gray-200 dark:border-[hsl(20_8%_16%)]">
        {/* Top: headline + bullets */}
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">AI Code Review</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug max-w-xs">
            Join developers who ship better code
          </h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-[hsl(30_8%_55%)] max-w-xs leading-relaxed">
            Get AI-powered feedback on every line you write — before bugs reach
            your users.
          </p>

          {/* Bullet points */}
          <ul className="mt-8 space-y-3.5">
            {[
              'Review unlimited code snippets',
              'Connect any GitHub repository',
              'Full review history & analytics',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-gray-600 dark:text-[hsl(30_10%_78%)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle: stats display */}
        <div className="my-10 rounded-xl border border-gray-200 dark:border-[hsl(20_8%_20%)] bg-white dark:bg-[hsl(20_6%_9%)] p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Platform Stats</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <StatRow
              label="Languages supported"
              value="7"
              valueClass="text-amber-600 dark:text-amber-400"
            />
            <StatRow
              label="Review modes"
              value="3"
              valueClass="text-violet-600 dark:text-violet-400"
            />
            <StatRow
              label="Powered by"
              value="Gemini 2.5 Flash"
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[hsl(20_8%_18%)]">
            <p className="text-xs text-gray-400 dark:text-[hsl(30_8%_45%)]">
              Get structured, actionable reviews in seconds — not minutes.
            </p>
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

function StatRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[hsl(20_6%_12%)] border border-gray-200 dark:border-[hsl(20_8%_20%)] px-4 py-2.5">
      <span className="text-xs text-gray-500 dark:text-[hsl(30_8%_52%)]">{label}</span>
      <span className={`text-xs font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}
