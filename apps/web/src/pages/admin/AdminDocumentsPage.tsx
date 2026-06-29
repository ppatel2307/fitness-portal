import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import type { AIDocument } from '@/types';
import { FileText, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AIDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({ title: '', type: 'KNOWLEDGE_BASE' as 'KNOWLEDGE_BASE' | 'NUTRITION_GUIDE', content: '' });

  const load = async () => {
    try {
      const res = await api.get('/admin/documents');
      if (res.data.success) setDocuments(res.data.data || []);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (doc: AIDocument) => {
    setEditingDoc(doc);
    setForm({ title: doc.title, type: doc.type, content: doc.content });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) return toast.error('Title and content are required');
    setIsSaving(true);
    try {
      if (editingDoc) {
        await api.patch(`/admin/documents/${editingDoc.id}`, form);
        toast.success('Document updated');
      } else {
        await api.post('/admin/documents', form);
        toast.success('Document created');
      }
      setShowForm(false);
      setEditingDoc(null);
      setForm({ title: '', type: 'KNOWLEDGE_BASE', content: '' });
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? The AI will no longer use it.')) return;
    try {
      await api.delete(`/admin/documents/${id}`);
      toast.success('Document deleted');
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggleActive = async (doc: AIDocument) => {
    try {
      await api.patch(`/admin/documents/${doc.id}`, { active: !doc.active });
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Documents</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage the knowledge base and nutrition guides used by the AI coach.</p>
        </div>
        <button
          onClick={() => { setEditingDoc(null); setForm({ title: '', type: 'KNOWLEDGE_BASE', content: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{editingDoc ? 'Edit Document' : 'New Document'}</h2>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Document title..."
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Type</label>
                <select
                  className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value as 'KNOWLEDGE_BASE' | 'NUTRITION_GUIDE' }))}
                >
                  <option value="KNOWLEDGE_BASE">Knowledge Base (AI Chat)</option>
                  <option value="NUTRITION_GUIDE">Nutrition Guide (Meal Plans)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Content</label>
              <textarea
                rows={12}
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent resize-y font-mono text-sm"
                placeholder="Enter the document content that the AI will use..."
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium rounded-xl transition">
                {isSaving ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No documents yet. Create your first knowledge base document.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map(doc => (
            <div key={doc.id} className={`bg-card border rounded-xl p-5 transition ${doc.active ? 'border-border' : 'border-zinc-700 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${doc.type === 'KNOWLEDGE_BASE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                      {doc.type === 'KNOWLEDGE_BASE' ? 'Knowledge Base' : 'Nutrition Guide'}
                    </span>
                    {!doc.active && <span className="text-xs text-zinc-500">Inactive</span>}
                  </div>
                  <h3 className="text-white font-medium">{doc.title}</h3>
                  <p className="text-zinc-500 text-sm mt-1 line-clamp-2 font-mono">{doc.content.substring(0, 150)}...</p>
                  <p className="text-xs text-zinc-600 mt-2">Updated {new Date(doc.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(doc)} title={doc.active ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg transition ${doc.active ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-zinc-500 bg-zinc-800 hover:bg-zinc-700'}`}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(doc)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
