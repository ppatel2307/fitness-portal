import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, ClipboardList, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  onboarding?: { completed: boolean };
  workoutPlans?: { title: string; workoutDays: { completions: { completedAt: string }[] }[] }[];
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [clientsRes, requestsRes] = await Promise.all([
          api.get('/manager/clients'),
          api.get('/requests?status=PENDING'),
        ]);
        if (clientsRes.data.success) setClients(clientsRes.data.data || []);
        if (requestsRes.data.success) setPendingRequests((requestsRes.data.data || []).length);
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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const completedThisWeek = clients.reduce((acc, c) => {
    const completions = c.workoutPlans?.[0]?.workoutDays?.flatMap(d => d.completions || []).filter(
      comp => new Date(comp.completedAt) >= weekStart
    ) || [];
    return acc + completions.length;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Clients', value: clients.length, icon: Users, color: 'text-blue-400' },
          { label: 'Workouts This Week', value: completedThisWeek, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Pending Requests', value: pendingRequests, icon: ClipboardList, color: 'text-yellow-400' },
          { label: 'Onboarded', value: clients.filter(c => c.onboarding?.completed).length, icon: BarChart3, color: 'text-purple-400' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
              <div className={`${stat.color} mb-2`}><Icon className="w-5 h-5" /></div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Client list preview */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">My Clients</h2>
          <Link to="/manager/clients" className="text-sm text-accent hover:text-accent/80 transition">View all →</Link>
        </div>
        {clients.length === 0 ? (
          <p className="text-zinc-400 text-sm text-center py-4">No clients assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {clients.slice(0, 5).map(client => {
              const thisWeekCompletions = client.workoutPlans?.[0]?.workoutDays?.flatMap(d => d.completions || []).filter(
                c => new Date(c.completedAt) >= weekStart
              ).length || 0;
              return (
                <div key={client.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                  {client.avatarUrl ? (
                    <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{client.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{client.name}</p>
                    <p className="text-xs text-zinc-500">{client.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{thisWeekCompletions}</p>
                    <p className="text-xs text-zinc-500">this week</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
