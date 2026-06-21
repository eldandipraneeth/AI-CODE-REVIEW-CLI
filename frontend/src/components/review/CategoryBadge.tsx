import React from 'react';
import { Shield, Zap, Bug, Activity, PenTool, ClipboardCheck, Wrench } from 'lucide-react';
import { Category } from '../../types/review';
import { cn } from '../../utils/cn';

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

const CATEGORY_CONFIG: Record<Category, { icon: React.ElementType, label: string, colorClass: string }> = {
  security: { icon: Shield, label: 'Security', colorClass: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  performance: { icon: Zap, label: 'Performance', colorClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  bug: { icon: Bug, label: 'Bug', colorClass: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  error_handling: { icon: Activity, label: 'Error Handling', colorClass: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  style: { icon: PenTool, label: 'Style', colorClass: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  test_coverage: { icon: ClipboardCheck, label: 'Testing', colorClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  maintainability: { icon: Wrench, label: 'Maintainability', colorClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || { icon: Bug, label: category, colorClass: 'text-gray-600 bg-gray-100 border-gray-200' };
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", config.colorClass, className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
