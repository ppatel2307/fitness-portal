import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Users, Dumbbell, Apple, BarChart3, MessageSquare,
  FolderOpen, Settings, LogOut, Calendar, ClipboardList, Bell, FileText, UserCog, User,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const adminNavItems: NavItem[] = [
  { to: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'Users' },
  { to: '/admin/workouts', icon: <Dumbbell className="w-5 h-5" />, label: 'Workout Plans' },
  { to: '/admin/requests', icon: <ClipboardList className="w-5 h-5" />, label: 'Requests' },
  { to: '/admin/documents', icon: <FileText className="w-5 h-5" />, label: 'AI Documents' },
  { to: '/admin/announcements', icon: <MessageSquare className="w-5 h-5" />, label: 'Announcements' },
  { to: '/admin/resources', icon: <FolderOpen className="w-5 h-5" />, label: 'Resources' },
];

const managerNavItems: NavItem[] = [
  { to: '/manager', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/manager/clients', icon: <Users className="w-5 h-5" />, label: 'My Clients' },
];

const userNavItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/workouts', icon: <Dumbbell className="w-5 h-5" />, label: 'Workouts' },
  { to: '/calendar', icon: <Calendar className="w-5 h-5" />, label: 'Calendar' },
  { to: '/nutrition', icon: <Apple className="w-5 h-5" />, label: 'Nutrition' },
  { to: '/requests', icon: <ClipboardList className="w-5 h-5" />, label: 'Requests' },
  { to: '/stats', icon: <BarChart3 className="w-5 h-5" />, label: 'Progress' },
  { to: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
  { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = user?.role === 'ADMIN'
    ? adminNavItems
    : user?.role === 'MANAGER'
    ? managerNavItems
    : userNavItems;

  const portalLabel = user?.role === 'ADMIN' ? 'Admin Portal' : user?.role === 'MANAGER' ? 'Manager Portal' : 'My Portal';

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) setUnreadCount(res.data.data.unreadCount || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const mobileNavItems = navItems.slice(0, 5);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-background-secondary border-r border-border h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shadow-glow-sm">
              <svg className="w-5 h-5 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wide leading-none">
                <span className="text-accent">VEGGI</span> <span className="text-white">CHIKN</span>
              </h1>
              <p className="text-[11px] uppercase tracking-wider text-text-muted mt-1">{portalLabel}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/dashboard' || item.to === '/manager'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
                  'text-text-secondary hover:text-white hover:bg-surface',
                  isActive && 'bg-accent/10 text-accent font-semibold border border-accent/20 shadow-glow-sm'
                )
              }
            >
              {item.icon}
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.label === 'Requests' && unreadCount > 0 && (
                <span className="text-xs bg-accent text-accent-fg font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center mb-3">
              <span className="text-sm font-semibold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background-secondary border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          {mobileNavItems.map(item => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/dashboard' && item.to !== '/admin' && item.to !== '/manager' &&
                location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-lg', isActive ? 'text-accent' : 'text-zinc-500')}
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
