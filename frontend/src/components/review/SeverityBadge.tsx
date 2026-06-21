import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Severity } from '../../types/review';
import { cn } from '../../utils/cn';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  if (severity === 'high') {
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", className)}>
        <AlertOctagon className="w-3.5 h-3.5" /> High
      </span>
    );
  }
  
  if (severity === 'medium') {
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", className)}>
        <AlertTriangle className="w-3.5 h-3.5" /> Medium
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", className)}>
      <Info className="w-3.5 h-3.5" /> Low
    </span>
  );
}
