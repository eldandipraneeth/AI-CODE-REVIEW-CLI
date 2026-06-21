import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCode,
  GitPullRequest,
  History,
  Settings,
  Activity,
  X,
  Code2,
  Plus,
} from 'lucide-react';
import { cn } from '../utils/cn';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard',            end: true },
  { icon: FileCode,        label: 'Review Code', to: '/dashboard/review' },
  { icon: GitPullRequest,  label: 'GitHub PR',   to: '/dashboard/github' },
  { icon: Activity,        label: 'Analytics',   to: '/dashboard/analytics' },
  { icon: History,         label: 'History',     to: '/dashboard/history' },
  { icon: Settings,        label: 'Settings',    to: '/dashboard/settings' },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

/** Shared nav link list used in both desktop sidebar and mobile drawer */
function SidebarNav({ onNavigate }: SidebarNavProps) {
  const navigate = useNavigate();

  const handleNewReview = () => {
    onNavigate?.();
    navigate('/dashboard/review');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand logo — shown in mobile drawer only (desktop has Navbar) */}
      <div className="flex items-center gap-2 px-4 py-4 mb-2 md:hidden border-b">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-bold text-base tracking-tight">AI Code Review</span>
      </div>

      {/* New Review CTA */}
      <div className="px-3 mb-2 mt-2">
        <button
          onClick={handleNewReview}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Review
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? [
                      'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary',
                      // left-border accent — absolute positioned inside the rounded link
                      'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-primary',
                    ].join(' ')
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}

/** Desktop sidebar — always visible on md+ screens */
export function Sidebar() {
  return (
    <aside className="w-56 border-r bg-card hidden md:flex flex-col shrink-0">
      <SidebarNav />
    </aside>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Mobile slide-out drawer — visible only on small screens */
export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 md:hidden mobile-overlay',
          isOpen && 'open'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-lg md:hidden mobile-drawer flex flex-col',
          isOpen && 'open'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Close button */}
        <div className="flex justify-end p-3 border-b">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav onNavigate={onClose} />
      </div>
    </>
  );
}
