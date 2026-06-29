import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Users, Dumbbell, ClipboardList, Bell, CheckCircle, ChevronRight } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  pendingRequests: number;
  completionsThisWeek: number;
  unreadNotifications: number;
  recentCompletions?: { id: string; user: { name: string }; completedAt: string }[];
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data.success) setStats(res.data.data);
      } catch { /* silent */ } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400', link: '/admin/users' },
    { label: 'Completions This Week', value: stats?.completionsThisWeek ?? 0, icon: Dumbbell, color: 'text-green-400', link: null },
    { label: 'Pending Requests', value: stats?.pendingRequests ?? 0, icon: ClipboardList, color: 'text-yellow-400', link: '/admin/requests' },
    { label: 'Unread Notifications', value: stats?.unreadNotifications ?? 0, icon: Bell, color: 'text-purple-400', link: null },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          const inner = (
            <div className="bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition">
              <div className={`${card.color} mb-2`}><Icon className="w-5 h-5" /></div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{card.label}</div>
            </div>
          );
          return card.link ? (
            <Link key={card.label} to={card.link}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users', icon: Users, link: '/admin/users' },
            { label: 'Workout Plans', icon: Dumbbell, link: '/admin/workouts' },
            { label: 'User Requests', icon: ClipboardList, link: '/admin/requests' },
            { label: 'AI Documents', icon: Bell, link: '/admin/documents' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.link}
                className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition"
              >
                <Icon className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-medium text-white text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent completions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Completions</h2>
          <Link to="/admin/workouts" className="text-sm text-accent hover:text-accent/80 flex items-center gap-1 transition">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {!stats?.recentCompletions?.length ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No workout completions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentCompletions.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-white flex-1">{c.user.name}</span>
                <span className="text-xs text-zinc-500">{new Date(c.completedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
