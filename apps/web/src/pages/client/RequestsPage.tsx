import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import type { UserRequest } from '@/types';
import { ClipboardList, Plus, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'WORKOUT_MODIFICATION', label: 'Workout Modification' },
  { value: 'NUTRITION_REQUEST', label: 'Nutrition Request' },
  { value: 'INJURY_UPDATE', label: 'Injury Update' },
  { value: 'GENERAL', label: 'General' },
] as const;

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-yellow-400 bg-yellow-400/10' },
  IN_REVIEW: { label: 'In Review', icon: AlertCircle, color: 'text-blue-400 bg-blue-400/10' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle, color: 'text-green-400 bg-green-400/10' },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    category: string;
    subject: string;
    body: string;
  }>();

  const loadRequests = async () => {
    try {
      const res = await api.get('/requests/my');
      if (res.data.success) setRequests(res.data.data || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const onSubmit = async (data: { category: string; subject: string; body: string }) => {
    setSubmitting(true);
    try {
      await api.post('/requests', data);
      toast.success('Request submitted! Your coach will review it soon.');
      reset();
      setShowForm(false);
      await loadRequests();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Requests</h1>
          <p className="text-zinc-400 text-sm mt-1">Submit requests for workout modifications, nutrition changes, or general questions.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">New Request</h2>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Category</label>
              <select
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent"
                {...register('category', { required: 'Category is required' })}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Subject</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Brief subject..."
                {...register('subject', { required: 'Subject is required', minLength: 3 })}
              />
              {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Details</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Describe your request in detail..."
                {...register('body', { required: 'Details are required', minLength: 10 })}
              />
              {errors.body && <p className="text-red-400 text-xs mt-1">{errors.body.message}</p>}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium rounded-xl transition">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No requests yet. Submit your first request above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const config = STATUS_CONFIG[req.status];
            const StatusIcon = config.icon;
            return (
              <div key={req.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                        {CATEGORIES.find(c => c.value === req.category)?.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-white font-medium">{req.subject}</h3>
                    <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{req.body}</p>
                    {req.adminReply && (
                      <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <p className="text-xs text-accent font-medium mb-1">Coach Reply</p>
                        <p className="text-sm text-zinc-300">{req.adminReply}</p>
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${config.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
