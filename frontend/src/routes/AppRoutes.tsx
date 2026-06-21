import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Spinner } from '../components/ui/Spinner';

// Lazy-loaded Pages
const LandingPage = lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const CodeReviewPage = lazy(() => import('../pages/CodeReviewPage').then(module => ({ default: module.CodeReviewPage })));
const GithubPRPage = lazy(() => import('../pages/GithubPRPage').then(module => ({ default: module.GithubPRPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const HistoryPage = lazy(() => import('../pages/HistoryPage').then(module => ({ default: module.HistoryPage })));
const ReviewDetailsPage = lazy(() => import('../pages/ReviewDetailsPage').then(module => ({ default: module.ReviewDetailsPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Spinner className="h-10 w-10" /></div>}>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="review" element={<CodeReviewPage />} />
              <Route path="github" element={<GithubPRPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="reviews/:id" element={<ReviewDetailsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
