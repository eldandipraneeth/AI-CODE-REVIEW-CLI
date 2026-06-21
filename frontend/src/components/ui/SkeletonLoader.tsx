import React from 'react';
import { cn } from '../../utils/cn';

// ─── Skeleton primitive ───────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted dark:bg-muted/60',
        className
      )}
    />
  );
}

// ─── DashboardSkeleton ────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Metric cards row — 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border rounded-xl shadow-sm p-5 space-y-3"
          >
            {/* Icon + label row */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <Skeleton className="h-3 w-24" />
            </div>
            {/* Big number */}
            <Skeleton className="h-9 w-16" />
            {/* Sub-label */}
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Recent activity card — full width */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="p-5 border-b flex justify-between items-center bg-muted/10">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Activity rows */}
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 flex items-center justify-between gap-4"
            >
              {/* Left: colored bar + text block */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton className="h-10 w-1 rounded-full shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              {/* Right: severity bubbles + button */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats strip */}
      <div className="bg-card border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-40" />
          <div className="w-px h-5 bg-border shrink-0" />
          <Skeleton className="h-4 w-32" />
          <div className="w-px h-5 bg-border shrink-0" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
}
