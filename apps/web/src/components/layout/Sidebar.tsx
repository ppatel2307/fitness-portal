/**
 * Sidebar navigation component
 * Desktop: Left sidebar
 * Mobile: Bottom navigation
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Apple,
  BarChart3,
  MessageSquare,
  FolderOpen,
  Settings,
  LogOut,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const adminNavItems: NavItem[] = [
  { to: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/admin/clients', icon: <Users className="w-5 h-5" />, label: 'Clients' },
  { to: '/admin/workouts', icon: <Dumbbell className="w-5 h-5" />, label: 'Workouts' },
  { to: '/admin/announcements', icon: <MessageSquare className="w-5 h-5" />, label: 'Announcements' },
  { to: '/admin/resources', icon: <FolderOpen className="w-5 h-5" />, label: 'Resources' },
  { to: '/admin/check-ins', icon: <ClipboardCheck className="w-5 h-5" />, label: 'Check-ins' },
];

const clientNavItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Home' },
  { to: '/workouts', icon: <Calendar className="w-5 h-5" />, label: 'Workouts' },
  { to: '/nutrition', icon: <Apple className="w-5 h-5" />, label: 'Nutrition' },
  { to: '/stats', icon: <BarChart3 className="w-5 h-5" />, label: 'Stats' },
  { to: '/check-in', icon: <ClipboardCheck className="w-5 h-5" />, label: 'Check-in' },
  { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? adminNavItems : clientNavItems;

  // Mobile bottom nav items (subset)
  const mobileNavItems = navItems.slice(0, 5);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-background-secondary border-r border-border h-screen sticky top-0">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-text-primary">FitPortal</h1>
          <p className="text-xs text-text-muted mt-1">
            {isAdmin ? 'Admin Portal' : 'Client Portal'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'text-text-secondary hover:text-text-primary hover:bg-surface',
                  isActive && 'bg-surface text-text-primary'
                )
              }
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <span className="text-sm font-medium text-text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.name}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background-secondary border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          {mobileNavItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/dashboard' &&
                item.to !== '/admin' &&
                location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  isActive ? 'text-accent' : 'text-text-muted'
                )}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
