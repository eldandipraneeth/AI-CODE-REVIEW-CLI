import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileDrawer } from '../components/Sidebar';
import { useMobileNav } from '../contexts/MobileNavContext';

export function DashboardLayout() {
  const { isOpen, close } = useMobileNav();

  return (
    <>
      {/* Mobile slide-out drawer — overlays the entire page */}
      <MobileDrawer isOpen={isOpen} onClose={close} />

      {/* Main dashboard body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
