import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Public
import { LandingPage } from '@/pages/LandingPage';

// Auth
import { LoginPage } from '@/pages/auth/LoginPage';

// Client pages
import { DashboardPage } from '@/pages/client/DashboardPage';
import { WorkoutsPage } from '@/pages/client/WorkoutsPage';
import { NutritionPage } from '@/pages/client/NutritionPage';
import { StatsPage } from '@/pages/client/StatsPage';
import { SettingsPage } from '@/pages/client/SettingsPage';

// New pages (lazy loaded)
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const CalendarPage = lazy(() => import('@/pages/client/CalendarPage'));
const RequestsPage = lazy(() => import('@/pages/client/RequestsPage'));
const ProfilePage = lazy(() => import('@/pages/client/ProfilePage'));

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { WorkoutPlansPage } from '@/pages/admin/WorkoutPlansPage';
import { AnnouncementsPage } from '@/pages/admin/AnnouncementsPage';
import { ResourcesPage } from '@/pages/admin/ResourcesPage';
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage'));
const AdminDocumentsPage = lazy(() => import('@/pages/admin/AdminDocumentsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));

// Manager pages
const ManagerDashboardPage = lazy(() => import('@/pages/manager/ManagerDashboardPage'));
const ManagerClientsPage = lazy(() => import('@/pages/manager/ManagerClientsPage'));

// AI Chat widget
import { AIChatWidget } from '@/components/ai/AIChatWidget';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'MANAGER' | 'USER'>;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role as 'ADMIN' | 'MANAGER' | 'USER')) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Landing page — always public */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={<ProtectedRoute allowedRoles={['USER']}><OnboardingPage /></ProtectedRoute>}
          />

          {/* User routes — pathless layout so URLs stay /dashboard, /workouts etc. */}
          <Route element={<ProtectedRoute allowedRoles={['USER']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin routes */}
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRoles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="clients" element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="workouts" element={<WorkoutPlansPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="requests" element={<AdminRequestsPage />} />
            <Route path="documents" element={<AdminDocumentsPage />} />
          </Route>

          {/* Manager routes */}
          <Route
            path="/manager"
            element={<ProtectedRoute allowedRoles={['MANAGER']}><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<ManagerDashboardPage />} />
            <Route path="clients" element={<ManagerClientsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIChatWidget />
      </Suspense>
    </GoogleOAuthProvider>
  );
}
