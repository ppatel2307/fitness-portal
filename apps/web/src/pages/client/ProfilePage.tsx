import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, CreditCard, Activity, Check } from 'lucide-react';
import { VENMO_URL, VENMO_HANDLE, ZELLE_PHONE, formatUsd } from '@/lib/payment';

interface Charge {
  id: string;
  amount: number;
  workoutDate: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAccountability, setIsTogglingAccountability] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    height: user?.clientProfile?.height?.toString() || '',
    weight: user?.clientProfile?.weight?.toString() || '',
    goal: user?.clientProfile?.goal || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/users/profile', {
        name: form.name,
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        goal: form.goal,
      });
      if (res.data.success && res.data.data) {
        updateUser({ ...user!, ...res.data.data });
        toast.success('Profile updated');
        setIsEditing(false);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAccountability = async () => {
    setIsTogglingAccountability(true);
    try {
      const newState = !user?.accountabilitySubscription?.active;
      await api.post('/users/accountability', { active: newState });
      updateUser({
        ...user!,
        accountabilitySubscription: { ...user?.accountabilitySubscription!, active: newState, tier: newState ? 'accountability' : 'free' },
      });
      toast.success(newState ? 'Accountability tier activated' : 'Accountability tier deactivated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsTogglingAccountability(false);
    }
  };

  const isAccountabilityActive = user?.accountabilitySubscription?.active;

  // ---- Accountability ledger (manual Venmo/Zelle) ----
  const [charges, setCharges] = useState<Charge[]>([]);
  const [isPaying, setIsPaying] = useState(false);

  const loadCharges = async () => {
    try {
      const res = await api.get('/users/charges');
      if (res.data.success) setCharges(res.data.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadCharges(); }, []);

  const pendingCharges = charges.filter(c => c.status === 'PENDING');
  const balanceCents = pendingCharges.reduce((sum, c) => sum + c.amount, 0);

  const markPaid = async () => {
    setIsPaying(true);
    try {
      await api.post('/users/charges/pay');
      toast.success('Marked as paid. Thanks for staying accountable!');
      await loadCharges();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* Personal Info */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <User className="w-5 h-5 text-zinc-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Personal Information</h2>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-sm text-accent hover:text-accent/80 transition">
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
              { label: 'Height (cm)', key: 'height', type: 'number', placeholder: '175' },
              { label: 'Weight (kg)', key: 'weight', type: 'number', placeholder: '75' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm text-zinc-400 mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Fitness Goal</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="e.g., Lose 10kg, run a 5K..."
                value={form.goal}
                onChange={e => setForm(p => ({ ...p, goal: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl transition text-sm font-medium">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Height', value: user?.clientProfile?.height ? `${user.clientProfile.height} cm` : '—' },
              { label: 'Weight', value: user?.clientProfile?.weight ? `${user.clientProfile.weight} kg` : '—' },
              { label: 'Goal', value: user?.clientProfile?.goal || '—' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
            ].map(item => (
              <div key={item.label}>
                <dt className="text-xs text-zinc-500 uppercase tracking-wide">{item.label}</dt>
                <dd className="text-white mt-0.5">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Subscription Tier */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Shield className="w-5 h-5 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Subscription</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-white">
              {isAccountabilityActive ? 'Accountability Tier' : 'Free Tier'}
            </p>
            <p className="text-sm text-zinc-400 mt-0.5">
              {isAccountabilityActive
                ? 'You are charged $10 for each missed workout'
                : 'Standard workout tracking'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isAccountabilityActive ? 'bg-accent/20 text-accent' : 'bg-zinc-700 text-zinc-300'}`}>
            {isAccountabilityActive ? 'Active' : 'Free'}
          </span>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Accountability Tier</p>
              <p className="text-xs text-zinc-400 mt-1">
                If you miss a scheduled workout before midnight, you'll be automatically charged $10. This keeps you accountable to your fitness goals.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={toggleAccountability}
          disabled={isTogglingAccountability}
          className={`w-full py-3 rounded-xl text-sm font-medium transition ${
            isAccountabilityActive
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              : 'bg-accent hover:bg-accent/90 text-white'
          }`}
        >
          {isTogglingAccountability ? 'Updating...' : isAccountabilityActive ? 'Deactivate Accountability' : 'Activate Accountability Tier'}
        </button>
      </div>

      {/* Accountability Balance / Ledger */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Accountability Balance</h2>
        </div>

        {/* Balance summary */}
        <div className={`rounded-xl p-5 mb-4 border ${balanceCents > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-accent/10 border-accent/30'}`}>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Balance Due</p>
          <p className={`text-4xl font-black mt-1 ${balanceCents > 0 ? 'text-red-400' : 'text-accent'}`}>
            {formatUsd(balanceCents)}
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            {balanceCents > 0
              ? `${pendingCharges.length} missed workout${pendingCharges.length === 1 ? '' : 's'} × $10`
              : "You're all paid up. Keep showing up! 💪"}
          </p>
        </div>

        {balanceCents > 0 && (
          <>
            {/* How to pay */}
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm font-medium text-white">Pay your coach {formatUsd(balanceCents)}:</p>
              <a href={VENMO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2.5 transition">
                <span className="text-zinc-300">Venmo</span>
                <span className="text-accent font-medium">{VENMO_HANDLE}</span>
              </a>
              <div className="flex items-center justify-between text-sm bg-zinc-800 rounded-lg px-3 py-2.5">
                <span className="text-zinc-300">Zelle</span>
                <span className="text-accent font-medium">{ZELLE_PHONE}</span>
              </div>
            </div>

            <button
              onClick={markPaid}
              disabled={isPaying}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-accent hover:bg-accent/90 disabled:opacity-50 text-white transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isPaying ? 'Updating...' : "I've Paid — Clear My Balance"}
            </button>
            <p className="text-xs text-zinc-600 mt-2 text-center">Only tap this after you've sent payment.</p>
          </>
        )}

        {/* Charge history */}
        {charges.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">History</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {charges.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-zinc-400">
                    Missed workout · {new Date(c.workoutDate).toLocaleDateString()}
                  </span>
                  <span className={c.status === 'PENDING' ? 'text-red-400' : 'text-zinc-500 line-through'}>
                    {formatUsd(c.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
