/**
 * Main App component with routing
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';

// Client pages
import { DashboardPage } from '@/pages/client/DashboardPage';
import { WorkoutsPage } from '@/pages/client/WorkoutsPage';
import { NutritionPage } from '@/pages/client/NutritionPage';
import { StatsPage } from '@/pages/client/StatsPage';
import { CheckInPage } from '@/pages/client/CheckInPage';
import { SettingsPage } from '@/pages/client/SettingsPage';

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ClientsPage } from '@/pages/admin/ClientsPage';
import { WorkoutPlansPage } from '@/pages/admin/WorkoutPlansPage';
import { AnnouncementsPage } from '@/pages/admin/AnnouncementsPage';
import { ResourcesPage } from '@/pages/admin/ResourcesPage';
import { AdminCheckInsPage } from '@/pages/admin/AdminCheckInsPage';

// Loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'CLIENT')[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}

// Public route (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Client routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="check-in" element={<CheckInPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="workouts" element={<WorkoutPlansPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="check-ins" element={<AdminCheckInsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
