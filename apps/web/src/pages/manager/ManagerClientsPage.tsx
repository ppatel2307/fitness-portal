import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  onboarding?: {
    completed: boolean;
    fitnessGoals: string[];
    injuries?: string;
    activityLevel?: string;
  };
  workoutPlans?: {
    id: string;
    title: string;
    workoutDays: {
      id: string;
      title: string;
      dayOfWeek: number;
      isRestDay: boolean;
      completions: { completedAt: string }[];
    }[];
  }[];
  mealPlans?: { calories: number }[];
  checkIns?: { weekOf: string; energy: number; stress: number; adherence: number }[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ManagerClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/manager/clients');
        if (res.data.success) setClients(res.data.data || []);
      } catch { /* silent */ } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Clients ({clients.length})</h1>

      {clients.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No clients assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map(client => {
            const isExpanded = expanded === client.id;
            const plan = client.workoutPlans?.[0];
            const thisWeekCompletions = plan?.workoutDays?.flatMap(d => d.completions || []).filter(
              c => new Date(c.completedAt) >= weekStart
            ).length || 0;
            const latestCheckIn = client.checkIns?.[0];

            return (
              <div key={client.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : client.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-zinc-800/30 transition"
                >
                  {client.avatarUrl ? (
                    <img src={client.avatarUrl} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-lg font-semibold text-white">{client.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">{client.name}</p>
                    <p className="text-sm text-zinc-400">{client.email}</p>
                  </div>
                  <div className="flex items-center gap-6 mr-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{thisWeekCompletions}</p>
                      <p className="text-xs text-zinc-500">workouts this week</p>
                    </div>
                    {latestCheckIn && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{latestCheckIn.adherence}/10</p>
                        <p className="text-xs text-zinc-500">adherence</p>
                      </div>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-5">
                    {/* Onboarding info */}
                    {client.onboarding && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Profile</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Activity Level', value: client.onboarding.activityLevel?.replace('_', ' ') || '—' },
                            { label: 'Goals', value: (client.onboarding.fitnessGoals || []).slice(0, 2).join(', ') || '—' },
                            { label: 'Injuries', value: client.onboarding.injuries || 'None' },
                          ].map(item => (
                            <div key={item.label} className="bg-zinc-800/50 rounded-lg p-3">
                              <p className="text-xs text-zinc-500">{item.label}</p>
                              <p className="text-sm text-white mt-0.5 capitalize">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workout plan */}
                    {plan && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Current Workout Plan: {plan.title}</h3>
                        <div className="grid grid-cols-7 gap-1">
                          {DAY_NAMES.map((day, i) => {
                            const workoutDay = plan.workoutDays.find(d => d.dayOfWeek === i);
                            const completedToday = workoutDay?.completions?.some(
                              c => new Date(c.completedAt) >= weekStart
                            );
                            return (
                              <div key={day} className={`p-2 rounded-lg text-center ${workoutDay?.isRestDay ? 'bg-zinc-800' : completedToday ? 'bg-green-500/20' : 'bg-zinc-800/50'}`}>
                                <p className="text-xs text-zinc-500">{day}</p>
                                {completedToday ? (
                                  <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                                ) : workoutDay?.isRestDay ? (
                                  <p className="text-xs text-zinc-600 mt-1">Rest</p>
                                ) : workoutDay ? (
                                  <XCircle className="w-4 h-4 text-zinc-600 mx-auto mt-1" />
                                ) : (
                                  <p className="text-xs text-zinc-700 mt-1">—</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Latest check-in */}
                    {latestCheckIn && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Latest Check-in</h3>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Energy', value: `${latestCheckIn.energy}/10` },
                            { label: 'Stress', value: `${latestCheckIn.stress}/10` },
                            { label: 'Adherence', value: `${latestCheckIn.adherence}/10` },
                            { label: 'Week of', value: new Date(latestCheckIn.weekOf).toLocaleDateString() },
                          ].map(item => (
                            <div key={item.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-zinc-500">{item.label}</p>
                              <p className="text-sm font-medium text-white mt-0.5">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
