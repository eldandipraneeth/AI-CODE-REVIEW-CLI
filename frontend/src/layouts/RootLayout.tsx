import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { MobileNavProvider, useMobileNav } from '../contexts/MobileNavContext';

function RootLayoutInner() {
  const { open } = useMobileNav();
  const location = useLocation();

  // Show hamburger only on dashboard routes (where a sidebar exists)
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onMenuClick={isDashboard ? open : undefined} />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

export function RootLayout() {
  return (
    <MobileNavProvider>
      <RootLayoutInner />
    </MobileNavProvider>
  );
}
