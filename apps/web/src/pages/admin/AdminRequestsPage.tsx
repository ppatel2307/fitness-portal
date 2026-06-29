import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import type { UserRequest } from '@/types';
import { ClipboardList, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  IN_REVIEW: { label: 'In Review', icon: AlertCircle, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [reply, setReply] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadRequests = async () => {
    try {
      const url = filter ? `/requests?status=${filter}` : '/requests';
      const res = await api.get(url);
      if (res.data.success) setRequests(res.data.data || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [filter]);

  const updateRequest = async (id: string, status?: string, adminReply?: string) => {
    setIsSaving(true);
    try {
      await api.patch(`/requests/${id}`, { status, adminReply });
      toast.success('Request updated');
      setSelectedRequest(null);
      setReply('');
      await loadRequests();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">User Requests</h1>
        <div className="flex gap-2">
          {['', 'PENDING', 'IN_REVIEW', 'RESOLVED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === s ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const config = STATUS_CONFIG[req.status];
            const StatusIcon = config.icon;
            return (
              <div key={req.id} className="bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{req.user?.name}</span>
                      <span className="text-xs text-zinc-500">{req.user?.email}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{req.category.replace('_', ' ')}</span>
                    </div>
                    <h3 className="font-medium text-white">{req.subject}</h3>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{req.body}</p>
                    {req.adminReply && (
                      <div className="mt-2 p-2 bg-accent/10 rounded-lg">
                        <p className="text-xs text-accent">Your reply: {req.adminReply}</p>
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 mt-2">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </div>
                    <button
                      onClick={() => { setSelectedRequest(req); setReply(req.adminReply || ''); }}
                      className="text-xs text-accent hover:text-accent/80 transition"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-1">{selectedRequest.subject}</h2>
            <p className="text-xs text-zinc-500 mb-4">
              From {selectedRequest.user?.name} · {new Date(selectedRequest.createdAt).toLocaleString()}
            </p>
            <p className="text-zinc-300 text-sm bg-zinc-800/50 rounded-xl p-4 mb-4">{selectedRequest.body}</p>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1.5">Reply to user</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Type your reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
            </div>

            <div className="flex gap-2 mb-4">
              {['PENDING', 'IN_REVIEW', 'RESOLVED'].map(s => (
                <button
                  key={s}
                  onClick={() => updateRequest(selectedRequest.id, s, reply || undefined)}
                  disabled={isSaving}
                  className={`flex-1 py-2 text-sm rounded-lg transition ${selectedRequest.status === s ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {reply && (
              <button
                onClick={() => updateRequest(selectedRequest.id, undefined, reply)}
                disabled={isSaving}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium mb-3 transition"
              >
                {isSaving ? 'Saving...' : 'Send Reply'}
              </button>
            )}

            <button onClick={() => setSelectedRequest(null)} className="w-full py-2 text-zinc-400 hover:text-zinc-200 text-sm transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
