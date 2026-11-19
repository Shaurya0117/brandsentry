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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              <Settings2 className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Brand Governance Administration
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1 tracking-tight">Brand Knowledge Base</h1>
          <p className="text-xs text-zinc-400">
            Configure authoritative guidelines, enterprise facts, and banned terminology for the audit pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportKB}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
            title="Export full knowledge base as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <button
            onClick={handleSeedBrandPack}
            disabled={isSeeding || !canManageKB}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all ${
              canManageKB
                ? 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm'
                : 'bg-white/[0.04] text-zinc-500 cursor-not-allowed border border-white/[0.06]'
            }`}
            title={!canManageKB ? 'Admin role required' : 'Seed sample brand pack'}
          >
            {isSeeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
            )}
            Load Sample Pack (Nova Bank)
          </button>
        </div>
      </div>

      {/* Role Permission Banner if not Admin */}
      {!canManageKB && (
        <div className="p-3.5 rounded-xl bg-purple-500/[0.04] border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <strong className="font-medium text-zinc-100">Read-Only Mode:</strong> Currently operating as{' '}
              <span className="font-mono text-zinc-200 underline">{role}</span> ({userName}). Only the{' '}
              <strong className="text-purple-300">Admin</strong> role has permission to add, edit, or delete brand rules.
            </div>
          </div>
          <button
            onClick={() => setRole('Admin')}
            className="px-3 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-medium shrink-0 transition-all"
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* Search & Tabs Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.08]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'guidelines'
                ? 'border-white text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guidelines ({guidelines.length})
          </button>

          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'facts'
                ? 'border-white text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved Facts ({facts.length})
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'terms'
                ? 'border-white text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Terminology Rules ({terms.length})
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-lg bg-[#111113] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {canManageKB && (
            <button
              onClick={() => openAddModal(activeTab === 'guidelines' ? 'guideline' : activeTab === 'facts' ? 'fact' : 'term')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-colors shrink-0"
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
            <div className="py-12 text-center text-zinc-500 text-xs">Loading guidelines...</div>
          ) : filteredGuidelines.length === 0 ? (
            <div className="p-8 text-center bg-[#111113] rounded-xl border border-white/[0.08]">
              <p className="text-zinc-400 text-xs">No guidelines matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredGuidelines.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] hover:border-white/[0.15] transition-all flex flex-col justify-between space-y-3.5 top-highlight"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] text-zinc-200 font-mono text-[11px] font-semibold border border-white/[0.08]">
                        {g.code}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">{g.category}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">{g.text}</p>
                  </div>

                  {canManageKB && (
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal('guideline', g)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        aria-label="Edit guideline"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('guideline', g.id, g.code)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        aria-label="Delete guideline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            <div className="py-12 text-center text-zinc-500 text-xs">Loading facts...</div>
          ) : filteredFacts.length === 0 ? (
            <div className="p-8 text-center bg-[#111113] rounded-xl border border-white/[0.08]">
              <p className="text-zinc-400 text-xs">No approved facts matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredFacts.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] hover:border-white/[0.15] transition-all flex flex-col justify-between space-y-3.5 top-highlight"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[11px] font-semibold border border-emerald-500/20">
                        {f.code}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400/80 uppercase">Verified Fact</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">{f.statement}</p>
                  </div>

                  {canManageKB && (
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal('fact', f)}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        aria-label="Edit fact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('fact', f.id, f.code)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        aria-label="Delete fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            <div className="py-12 text-center text-zinc-500 text-xs">Loading terminology rules...</div>
          ) : filteredTerms.length === 0 ? (
            <div className="p-8 text-center bg-[#111113] rounded-xl border border-white/[0.08]">
              <p className="text-zinc-400 text-xs">No terminology rules matching your search.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#09090b] border-b border-white/[0.06] text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Prohibited Phrasing</th>
                    <th className="px-4 py-3">Preferred Brand Term</th>
                    <th className="px-4 py-3">Governance Note</th>
                    {canManageKB && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredTerms.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono text-[11px] font-medium border border-rose-500/20">
                          {t.banned}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[11px] font-medium border border-emerald-500/20">
                          {t.preferred}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300 max-w-md font-sans">
                        {t.note || 'Enforced by deterministic rule engine.'}
                      </td>
                      {canManageKB && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => openEditModal('term', t)}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete('term', t.id, t.banned)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111113] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 top-highlight">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-zinc-100">
              {editingItem.item ? 'Edit' : 'Add'}{' '}
              {editingItem.type === 'guideline'
                ? 'Guideline'
                : editingItem.type === 'fact'
                ? 'Approved Fact'
                : 'Terminology Rule'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              {editingItem.type === 'guideline' && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Code (e.g. TONE-1, LEGAL-2)</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Tone and Voice, Visual Accessibility, Claims..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Guideline Text</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'fact' && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Code (e.g. F-12, F-15)</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Verified Fact Statement</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.statement}
                      onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs leading-relaxed"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'term' && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Banned Term or Phrase</label>
                    <input
                      type="text"
                      required
                      value={formData.banned}
                      onChange={(e) => setFormData({ ...formData, banned: e.target.value })}
                      placeholder="e.g. Nova Pay, 100% secure"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Preferred Authorized Term</label>
                    <input
                      type="text"
                      required
                      value={formData.preferred}
                      onChange={(e) => setFormData({ ...formData, preferred: e.target.value })}
                      placeholder="e.g. NovaPay, Highly secure"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Governance Context / Note</label>
                    <input
                      type="text"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Reasoning behind this terminology standard..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-white text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium hover:bg-white/[0.08] border border-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold flex items-center gap-1.5"
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
