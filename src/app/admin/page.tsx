'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings2,
  BookOpen,
  CheckCircle2,
  FileCheck,
  Ban,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Save,
  X,
  Shield,
  Layers,
  Search,
  Download,
} from 'lucide-react';
import { Guideline, Fact, Term } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';

export default function AdminPage() {
  const { role, userName, canManageKB, setRole } = useRole();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'guidelines' | 'facts' | 'terms'>('guidelines');
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modal / Form state for Add/Edit
  const [editingItem, setEditingItem] = useState<{
    type: 'guideline' | 'fact' | 'term';
    item?: any;
  } | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    category: '',
    text: '',
    statement: '',
    preferred: '',
    banned: '',
    note: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, fRes, tRes] = await Promise.all([
        fetch('/api/guidelines'),
        fetch('/api/facts'),
        fetch('/api/terms'),
      ]);

      if (gRes.ok) setGuidelines(await gRes.json());
      if (fRes.ok) setFacts(await fRes.json());
      if (tRes.ok) setTerms(await tRes.json());
    } catch (e: any) {
      toast('Failed to load knowledge base items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedBrandPack = async () => {
    if (!canManageKB) {
      toast('Admin role required to seed or reset the brand pack.', 'warning');
      return;
    }

    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('Nova Bank sample brand pack loaded successfully!', 'success');
        await fetchData();
      } else {
        toast(data.error || 'Failed to seed sample pack', 'error');
      }
    } catch (e: any) {
      toast('Failed to load sample brand pack.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExportKB = () => {
    const data = {
      brand: 'Nova Bank',
      exported_at: new Date().toISOString(),
      guidelines,
      facts,
      terms,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-knowledge-base-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Knowledge base exported as JSON!', 'success');
  };

  const openAddModal = (type: 'guideline' | 'fact' | 'term') => {
    if (!canManageKB) {
      toast('Admin role required to add rules.', 'warning');
      return;
    }
    setEditingItem({ type });
    setFormData({
      code: type === 'guideline' ? 'TONE-2' : type === 'fact' ? 'F-25' : '',
      category: type === 'guideline' ? 'Tone and Voice' : '',
      text: '',
      statement: '',
      preferred: '',
      banned: '',
      note: '',
    });
  };

  const openEditModal = (type: 'guideline' | 'fact' | 'term', item: any) => {
    if (!canManageKB) {
      toast('Admin role required to edit rules.', 'warning');
      return;
    }
    setEditingItem({ type, item });
    setFormData({
      code: item.code || '',
      category: item.category || '',
      text: item.text || '',
      statement: item.statement || '',
      preferred: item.preferred || '',
      banned: item.banned || '',
      note: item.note || '',
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { type, item } = editingItem;
    const isEdit = Boolean(item);
    const endpoint = type === 'guideline' ? '/api/guidelines' : type === 'fact' ? '/api/facts' : '/api/terms';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      let payload: any = {
        actor: userName,
        role,
      };

      if (isEdit) {
        payload.id = item.id;
      }

      if (type === 'guideline') {
        payload.code = formData.code;
        payload.category = formData.category;
        payload.text = formData.text;
      } else if (type === 'fact') {
        payload.code = formData.code;
        payload.statement = formData.statement;
      } else if (type === 'term') {
        payload.preferred = formData.preferred;
        payload.banned = formData.banned;
        payload.note = formData.note;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save item');
      }

      toast(`${type.toUpperCase()} saved successfully.`, 'success');
      setEditingItem(null);
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Error saving rule', 'error');
    }
  };

  const handleDelete = async (type: 'guideline' | 'fact' | 'term', id: string, name: string) => {
    if (!canManageKB) {
      toast('Admin role required to delete rules.', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const endpoint = type === 'guideline' ? '/api/guidelines' : type === 'fact' ? '/api/facts' : '/api/terms';

    try {
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}&actor=${encodeURIComponent(userName)}&role=${encodeURIComponent(role)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      toast(`Deleted successfully.`, 'success');
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Error deleting item', 'error');
    }
  };

  // Filter items by search
  const q = searchQuery.toLowerCase().trim();
  const filteredGuidelines = guidelines.filter(
    (g) => !q || g.code.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.text.toLowerCase().includes(q)
  );
  const filteredFacts = facts.filter(
    (f) => !q || f.code.toLowerCase().includes(q) || f.statement.toLowerCase().includes(q)
  );
  const filteredTerms = terms.filter(
    (t) => !q || t.banned.toLowerCase().includes(q) || t.preferred.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-950 text-purple-400 border border-purple-800/80">
              <Settings2 className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-purple-400">
              Brand Governance Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Brand Knowledge Base</h1>
          <p className="text-sm text-slate-400">
            Configure authoritative guidelines, enterprise facts, and banned terminology for the audit pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportKB}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            title="Export full knowledge base as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <button
            onClick={handleSeedBrandPack}
            disabled={isSeeding || !canManageKB}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-lg ${
              canManageKB
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={!canManageKB ? 'Admin role required' : 'Seed sample brand pack'}
          >
            {isSeeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            )}
            Load Sample Pack (Nova Bank)
          </button>
        </div>
      </div>

      {/* Role Permission Banner if not Admin */}
      {!canManageKB && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="text-xs text-purple-200 leading-relaxed">
              <strong className="font-semibold text-white">Read-Only Mode:</strong> You are currently operating as{' '}
              <span className="font-bold underline">{role}</span> ({userName}). Only the{' '}
              <strong className="text-purple-300">Admin</strong> role has permission to add, edit, delete, or re-seed brand rules.
            </div>
          </div>
          <button
            onClick={() => setRole('Admin')}
            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 shadow-sm transition-all"
          >
            Switch to Admin Role
          </button>
        </div>
      )}

      {/* Search & Tabs Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'guidelines'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Guidelines ({guidelines.length})
          </button>

          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'facts'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approved Facts ({facts.length})
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'terms'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ban className="w-4 h-4" />
            Terminology Rules ({terms.length})
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {canManageKB && (
            <button
              onClick={() => openAddModal(activeTab === 'guidelines' ? 'guideline' : activeTab === 'facts' ? 'fact' : 'term')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Guidelines */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading guidelines...</div>
          ) : filteredGuidelines.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm">No guidelines matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGuidelines.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 font-mono text-xs font-bold border border-cyan-800/80">
                        {g.code}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{g.category}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{g.text}</p>
                  </div>

                  {canManageKB && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal('guideline', g)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Edit guideline"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('guideline', g.id, g.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        aria-label="Delete guideline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Facts */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading facts...</div>
          ) : filteredFacts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm">No approved facts matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacts.map((f) => (
                <div
                  key={f.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 font-mono text-xs font-bold border border-emerald-800/80">
                        {f.code}
                      </span>
                      <span className="text-[11px] text-emerald-400/80 font-medium">Verified Fact</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{f.statement}</p>
                  </div>

                  {canManageKB && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal('fact', f)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Edit fact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('fact', f.id, f.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        aria-label="Delete fact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Terms */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading terminology rules...</div>
          ) : filteredTerms.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
              <p className="text-slate-400 text-sm">No terminology rules matching your search.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Prohibited / Banned Phrasing</th>
                    <th className="px-5 py-3.5">Preferred Brand Replacement</th>
                    <th className="px-5 py-3.5">Governance Note</th>
                    {canManageKB && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTerms.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded bg-rose-950/60 text-rose-300 font-mono text-xs font-semibold border border-rose-800/50">
                          {t.banned}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 font-mono text-xs font-semibold border border-emerald-800/50">
                          {t.preferred}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 max-w-md">
                        {t.note || 'Enforced by rule engine.'}
                      </td>
                      {canManageKB && (
                        <td className="px-5 py-4 text-right space-x-1">
                          <button
                            onClick={() => openEditModal('term', t)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('term', t.id, t.banned)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingItem.item ? 'Edit' : 'Add'}{' '}
              {editingItem.type === 'guideline'
                ? 'Guideline'
                : editingItem.type === 'fact'
                ? 'Approved Fact'
                : 'Terminology Rule'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {editingItem.type === 'guideline' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Code (e.g. TONE-1, LEGAL-2)</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Tone and Voice, Visual Accessibility, Claims..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Guideline Text</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'fact' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Code (e.g. F-12, F-15)</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Verified Fact Statement</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.statement}
                      onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'term' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Banned Term or Phrase</label>
                    <input
                      type="text"
                      required
                      value={formData.banned}
                      onChange={(e) => setFormData({ ...formData, banned: e.target.value })}
                      placeholder="e.g. Nova Pay, 100% secure"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Authorized Term</label>
                    <input
                      type="text"
                      required
                      value={formData.preferred}
                      onChange={(e) => setFormData({ ...formData, preferred: e.target.value })}
                      placeholder="e.g. NovaPay, Highly secure"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Governance Context / Note</label>
                    <input
                      type="text"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Reasoning behind this terminology standard..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
