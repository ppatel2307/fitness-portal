import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { Users, Search } from 'lucide-react';
import { formatUsd } from '@/lib/payment';

interface UserOverview {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  avatarUrl?: string;
  onboarding?: { completed: boolean };
  workoutPlans?: { id: string; title: string }[];
  assignedManager?: { manager: { id: string; name: string } };
  accountabilitySubscription?: { tier: string; active: boolean } | null;
  missedWorkoutCharges?: { amount: number }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserOverview[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = async () => {
    try {
      const [usersRes, managersRes] = await Promise.all([
        api.get('/admin/users?role=USER'),
        api.get('/admin/managers'),
      ]);
      if (usersRes.data.success) setUsers(usersRes.data.data || []);
      if (managersRes.data.success) setManagers(managersRes.data.data || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const assignManager = async (userId: string, managerId: string) => {
    setAssigning(userId);
    try {
      await api.post(`/admin/users/${userId}/assign-manager`, { managerId });
      toast.success('Manager assigned');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setAssigning(null);
    }
  };

  const toggleActive = async (userId: string, active: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { active });
      toast.success(active ? 'User activated' : 'User deactivated');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const setTier = async (userId: string, tier: 'free' | 'accountability') => {
    try {
      await api.patch(`/admin/users/${userId}/tier`, { tier });
      toast.success(`Tier set to ${tier}`);
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const addCharge = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/charge`, {});
      toast.success('$10 missed-workout charge added');
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const markPaid = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/charges/mark-paid`);
      toast.success('Balance cleared');
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const balanceOf = (u: UserOverview) => (u.missedWorkoutCharges || []).reduce((s, c) => s + c.amount, 0);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users..."
            className="pl-9 pr-4 py-2 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                {['User', 'Onboarding', 'Workout Plan', 'Manager', 'Accountability', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-zinc-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">{user.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${user.onboarding?.completed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {user.onboarding?.completed ? 'Complete' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.workoutPlans && user.workoutPlans.length > 0 ? (
                      <span className="text-sm text-white">{user.workoutPlans[0].title}</span>
                    ) : (
                      <span className="text-sm text-zinc-500">None assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="px-2 py-1 bg-zinc-800 border border-border rounded-lg text-sm text-white focus:outline-none"
                      value={user.assignedManager?.manager.id || ''}
                      onChange={e => e.target.value && assignManager(user.id, e.target.value)}
                      disabled={assigning === user.id}
                    >
                      <option value="">No manager</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      <select
                        className="px-2 py-1 bg-zinc-800 border border-border rounded-lg text-xs text-white focus:outline-none"
                        value={user.accountabilitySubscription?.tier === 'accountability' ? 'accountability' : 'free'}
                        onChange={e => setTier(user.id, e.target.value as 'free' | 'accountability')}
                      >
                        <option value="free">Free</option>
                        <option value="accountability">Accountability</option>
                      </select>
                      <span className={`text-xs font-semibold ${balanceOf(user) > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                        Balance: {formatUsd(balanceOf(user))}
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={() => addCharge(user.id)} className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-400/10 transition">+$10</button>
                        {balanceOf(user) > 0 && (
                          <button onClick={() => markPaid(user.id)} className="text-xs px-2 py-1 rounded-lg text-accent hover:bg-accent/10 transition">Clear</button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${user.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(user.id, !user.active)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition ${user.active ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No users found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
