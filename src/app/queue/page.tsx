'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Shield,
  Send,
  User,
  AlertTriangle,
  ChevronRight,
  Filter,
  Search,
  Camera,
  FileText,
  Mail,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ContentItem, ContentVersion, Finding, Comment, UserRole } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';

export default function QueuePage() {
  const { role, userName, setRole, canApprove, canRequestChanges } = useRole();
  const { toast } = useToast();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'in_review' | 'changes_requested' | 'approved'>('in_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Detail item state
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContent, setDetailContent] = useState<ContentItem | null>(null);
  const [detailVersion, setDetailVersion] = useState<ContentVersion | null>(null);
  const [detailFindings, setDetailFindings] = useState<Finding[]>([]);
  const [detailComments, setDetailComments] = useState<Comment[]>([]);
  const [previewTab, setPreviewTab] = useState<'text' | 'channel'>('text');

  // Action inputs
  const [newCommentText, setNewCommentText] = useState('');
  const [requestChangesText, setRequestChangesText] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Counts across all categories
  const [counts, setCounts] = useState({
    all: 0,
    in_review: 0,
    changes_requested: 0,
    approved: 0,
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      let allData: ContentItem[] = [];
      try {
        const res = await fetch('/api/content');
        if (res.ok) {
          allData = await res.json();
        }
      } catch (e) {}

      // Merge with localStorage items cache for zero-loss serverless fallback
      if (typeof window !== 'undefined') {
        try {
          const cachedStr = localStorage.getItem('brandsentry_items_cache');
          if (cachedStr) {
            const cachedList: ContentItem[] = JSON.parse(cachedStr);
            const map = new Map<string, ContentItem>();
            allData.forEach((i) => map.set(i.id, i));
            cachedList.forEach((i) => {
              if (!map.has(i.id)) map.set(i.id, i);
            });
            allData = Array.from(map.values());
          }
        } catch (e) {}
      }

      setCounts({
        all: allData.length,
        in_review: allData.filter((i) => i.status === 'in_review').length,
        changes_requested: allData.filter((i) => i.status === 'changes_requested').length,
        approved: allData.filter((i) => i.status === 'approved').length,
      });

      const filtered = filter === 'all' ? allData : allData.filter((i) => i.status === filter);
      setItems(filtered);

      if (filtered.length > 0) {
        if (!selectedItemId || !filtered.some((i) => i.id === selectedItemId)) {
          setSelectedItemId(filtered[0].id);
        }
      } else {
        setSelectedItemId(null);
      }
    } catch (e) {
      toast('Failed to load items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/content/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailContent(data.content);
        setDetailVersion(data.currentVersion);
        setDetailFindings(data.findings || []);
        setDetailComments(data.comments || []);
      }
    } catch (e) {
      toast('Error fetching submission details.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      fetchDetail(selectedItemId);
    } else {
      setDetailContent(null);
      setDetailVersion(null);
      setDetailFindings([]);
      setDetailComments([]);
    }
  }, [selectedItemId]);

  const handleApprove = async () => {
    if (!canApprove) {
      toast('Manager or Admin role required to approve content.', 'warning');
      return;
    }
    if (!detailContent) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/content/${detailContent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          actor: userName,
          role,
          commentText: `Approved for immediate publication by ${userName} (${role}).`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve');
      }

      toast('Content approved and certified for publication!', 'success');
      await fetchItems();
      await fetchDetail(detailContent.id);
    } catch (e: any) {
      toast(e.message || 'Error approving content', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!canRequestChanges) {
      toast('Manager, Reviewer, or Admin role required to request changes.', 'warning');
      return;
    }
    if (!detailContent || !requestChangesText.trim()) {
      toast('Please enter the required revisions note.', 'warning');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/content/${detailContent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'changes_requested',
          actor: userName,
          role,
          commentText: requestChangesText.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to request changes');
      }

      toast('Changes requested. Draft returned to author for revisions.', 'info');
      setIsRequestModalOpen(false);
      setRequestChangesText('');
      await fetchItems();
      await fetchDetail(detailContent.id);
    } catch (e: any) {
      toast(e.message || 'Error updating status', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAddCommentOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailContent || !newCommentText.trim()) return;

    try {
      const res = await fetch(`/api/content/${detailContent.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newCommentText.trim(),
          author: userName,
          role,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');
      toast('Comment posted to governance log.', 'success');
      setNewCommentText('');
      await fetchDetail(detailContent.id);
    } catch (e: any) {
      toast(e.message || 'Error adding comment', 'error');
    }
  };

  const statusMeta: Record<string, { label: string; badge: string; dot: string }> = {
    draft: {
      label: 'Draft',
      badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      dot: 'bg-zinc-400',
    },
    in_review: {
      label: 'In Review',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    changes_requested: {
      label: 'Changes Req.',
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      dot: 'bg-rose-400',
    },
    approved: {
      label: 'Approved',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
  };

  const channelIcons: Record<string, any> = {
    'Instagram post': Camera,
    'Press note': FileText,
    'Email': Mail,
  };

  // Filter items by search query
  const displayedItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.channel.toLowerCase().includes(q) ||
      item.created_by.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              <Inbox className="w-3.5 h-3.5 text-zinc-300" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Editorial Governance & Approval
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1 tracking-tight">Review Queue</h1>
          <p className="text-xs text-zinc-400">
            Sign off on pre-publication drafts, request mandatory revisions, or inspect compliance audits.
          </p>
        </div>

        {/* Status Filter Tabs with Live Badges */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#111113] border border-white/[0.08]">
          {(
            [
              { key: 'in_review', label: 'In Review', count: counts.in_review },
              { key: 'changes_requested', label: 'Changes Req.', count: counts.changes_requested },
              { key: 'approved', label: 'Approved', count: counts.approved },
              { key: 'all', label: 'All Items', count: counts.all },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === tab.key
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  filter === tab.key ? 'bg-white/[0.1] text-zinc-200 border border-white/[0.12]' : 'bg-white/[0.03] text-zinc-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Role Banner / One-Click Role Switcher */}
      {!canApprove && (
        <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs text-zinc-300">
              <strong className="text-zinc-100 font-medium">Author Mode ({role}):</strong> Approving content or requesting mandatory changes requires a{' '}
              <strong className="text-amber-300">Manager</strong> or <strong className="text-zinc-100">Reviewer</strong> role.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRole('Manager')}
              className="px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium text-xs transition-all"
            >
              Switch to Manager
            </button>
            <button
              onClick={() => setRole('Reviewer')}
              className="px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 font-medium text-xs transition-all"
            >
              Switch to Reviewer
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Split: Queue Item List (Left 4 cols) & Detail / Preview (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, channel, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#111113] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/25"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 px-1 pt-1">
            <span>Submissions</span>
            <span>{displayedItems.length} items</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-xs animate-pulse">Loading submissions...</div>
          ) : displayedItems.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111113] border border-white/[0.08] text-center space-y-3">
              <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No submissions found matching &quot;{filter}&quot;.</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-xs text-zinc-300 underline font-medium"
                >
                  View all submissions ({counts.all})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {displayedItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                const ChannelIcon = channelIcons[item.channel] || FileText;
                const meta = statusMeta[item.status] || statusMeta.draft;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#18181b] border-white/25 shadow-sm ring-1 ring-white/20'
                        : 'bg-[#111113] border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-100 truncate max-w-[190px]">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                          meta.badge
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <ChannelIcon className="w-3 h-3 text-zinc-400" />
                        {item.channel}
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">By {item.created_by}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1.5 border-t border-white/[0.06]">
                      <span className="font-mono">{new Date(item.created_at || '').toLocaleDateString()}</span>
                      {item.is_confidential && (
                        <span className="text-amber-400/80 font-mono text-[9px] uppercase tracking-wider">Confidential</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (8 cols): Detail & Inspection Pane */}
        <div className="lg:col-span-8 space-y-5">
          {detailLoading ? (
            <div className="p-16 text-center text-zinc-500 text-xs">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50 mx-auto mb-2" />
              Loading submission details...
            </div>
          ) : !detailContent || !detailVersion ? (
            <div className="p-16 text-center bg-[#111113] rounded-2xl border border-white/[0.08] text-zinc-400 text-sm space-y-2">
              <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs">Select a submission from the queue to inspect compliance status.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Detail Card Header */}
              <div className="p-6 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-5 top-highlight">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                        {detailContent.channel}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                          (statusMeta[detailContent.status] || statusMeta.draft).badge
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${(statusMeta[detailContent.status] || statusMeta.draft).dot}`} />
                        {(statusMeta[detailContent.status] || statusMeta.draft).label}
                      </span>
                      {detailContent.status === 'approved' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Authorized
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">{detailContent.title}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Submitted by <strong className="text-zinc-200 font-medium">{detailContent.created_by}</strong> • Version v{detailVersion.version_no}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/review/${detailContent.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-zinc-400" />
                      Workbench
                    </Link>
                    <Link
                      href={`/history/${detailContent.id}`}
                      className="px-3 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Audit Trail
                    </Link>
                  </div>
                </div>

                {/* Preview Mode Selector: Text vs Realistic Channel Mockup */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-white/[0.06] text-xs">
                    <button
                      onClick={() => setPreviewTab('text')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewTab === 'text' ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.08]' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Raw Text View
                    </button>
                    <button
                      onClick={() => setPreviewTab('channel')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewTab === 'channel' ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.08]' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-zinc-400" />
                      Mockup ({detailContent.channel})
                    </button>
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono">
                    {detailVersion.body.length} chars
                  </span>
                </div>

                {/* Draft Content Preview: Text vs Channel Mockup */}
                {previewTab === 'text' ? (
                  <div className="p-4 rounded-xl bg-[#09090b] border border-white/[0.06] text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {detailVersion.body}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-[#09090b] border border-white/[0.06] flex justify-center">
                    {/* Realistic Channel Mockups */}
                    {detailContent.channel === 'Instagram post' && (
                      <div className="max-w-sm w-full rounded-2xl border border-white/[0.12] bg-[#111113] shadow-2xl overflow-hidden text-xs">
                        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-[10px] font-mono text-zinc-300">
                              NB
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100 text-[11px]">novabank_official</div>
                              <div className="text-[9px] text-zinc-500">Sponsored • Financial Services</div>
                            </div>
                          </div>
                          <span className="text-zinc-500 text-xs">•••</span>
                        </div>

                        {detailContent.image_url ? (
                          <img
                            src={detailContent.image_url}
                            alt={detailContent.image_alt || 'Instagram Campaign Visual'}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-32 flex items-center justify-center font-medium text-xs text-center p-4"
                            style={{
                              backgroundColor: detailContent.bg_color || '#09090b',
                              color: detailContent.text_color || '#ffffff',
                            }}
                          >
                            Nova Bank Official Announcement
                          </div>
                        )}

                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-zinc-400 text-xs">
                            <div className="flex items-center gap-3">
                              <span>❤️ 1,248</span>
                              <span>💬 42</span>
                              <span>↗️</span>
                            </div>
                            <span>🔖</span>
                          </div>
                          <p className="text-zinc-300 leading-relaxed">
                            <strong className="text-zinc-100 font-medium">novabank_official</strong> {detailVersion.body}
                          </p>
                        </div>
                      </div>
                    )}

                    {detailContent.channel === 'Email' && (
                      <div className="max-w-md w-full rounded-xl border border-white/[0.12] bg-[#111113] shadow-2xl overflow-hidden text-xs">
                        <div className="p-3 bg-[#09090b] border-b border-white/[0.06] space-y-1">
                          <div className="text-zinc-400">From: <strong className="text-zinc-200">announcements@novabank.com</strong></div>
                          <div className="text-zinc-400">Subject: <strong className="text-zinc-100">{detailContent.title}</strong></div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="h-7 flex items-center border-b border-white/[0.06] pb-2">
                            <span className="font-semibold text-xs text-zinc-100 tracking-tight">Nova Bank</span>
                          </div>
                          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {detailVersion.body}
                          </div>
                          <div className="pt-4 border-t border-white/[0.06] text-[10px] text-zinc-500 text-center font-mono">
                            Nova Bank N.A. Member FDIC. Confidential & Proprietary.
                          </div>
                        </div>
                      </div>
                    )}

                    {detailContent.channel === 'Press note' && (
                      <div className="max-w-lg w-full rounded-xl border border-white/[0.12] bg-[#111113] p-6 shadow-2xl space-y-4 text-xs font-serif leading-relaxed text-zinc-300">
                        <div className="text-center pb-3 border-b border-white/[0.06]">
                          <div className="text-[9px] uppercase font-mono font-medium tracking-widest text-zinc-400">
                            Official Press Release — For Immediate Release
                          </div>
                          <h4 className="text-sm font-semibold font-sans text-zinc-100 mt-1">{detailContent.title}</h4>
                          <span className="text-[10px] font-mono text-zinc-500">NEW YORK, NY — {new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{detailVersion.body}</p>
                        <div className="pt-3 border-t border-white/[0.06] font-sans text-[10px] text-zinc-500 font-mono">
                          Media Contact: press@novabank.com | Investor Relations: ir@novabank.com
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Open Findings Diagnostic Summary */}
                <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-xs">Audit Status:</span>
                    {detailFindings.filter((f) => f.status === 'open' || f.status === 'needs_human_check').length === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        0 Open Issues (Clean)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium text-[11px]">
                        {detailFindings.filter((f) => f.status === 'open' || f.status === 'needs_human_check').length} Active Findings
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/review/${detailContent.id}`}
                    className="text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect in Review Workbench</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Reviewer Action Buttons */}
                <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-zinc-400">
                    Operating as: <strong className="text-zinc-200">{userName}</strong> ({role})
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setIsRequestModalOpen(true)}
                      disabled={!canRequestChanges || isProcessingAction}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Request Changes
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={!canApprove || isProcessingAction || detailContent.status === 'approved'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-semibold shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {detailContent.status === 'approved' ? 'Approved for Publishing' : 'Approve for Publishing'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Review Discussion & Comments Thread */}
              <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Editorial Feedback Thread ({detailComments.length})
                    </h3>
                  </div>
                </div>

                {detailComments.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No notes or revision requests recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {detailComments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-zinc-400">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200">{c.author}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.04] border border-white/[0.06] text-zinc-400 font-mono">
                              {c.role}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {new Date(c.created_at || '').toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed font-sans">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preset Feedback Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500">Presets:</span>
                  {[
                    'Approved with full compliance clearance.',
                    'Please update terminology per brand dictionary.',
                    'Image requires descriptive alt text (VIS-2).',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCommentText(preset)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[10px] border border-white/[0.06] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Add Comment Field */}
                <form onSubmit={handleAddCommentOnly} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type an auditor note or feedback..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-3.5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] disabled:opacity-50 text-zinc-200 text-xs font-medium transition-colors"
                  >
                    Post Note
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Changes Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111113] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 top-highlight">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Request Mandatory Revisions
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Specify the exact brand, tone, or regulatory adjustments required. This note will be recorded in the audit log and delivered to the creator.
            </p>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Please adjust product name to "NovaPay" without spaces.',
                'Remove absolute guarantees ("100% secure") per LEGAL-1.',
                'Provide descriptive alternative text for screen readers.',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRequestChangesText(chip)}
                  className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[10px] border border-white/[0.06] text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={4}
              placeholder="e.g. Please remove absolute yield claims and adhere strictly to Fact F-12 regarding zero-knowledge encryption..."
              value={requestChangesText}
              onChange={(e) => setRequestChangesText(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#09090b] border border-white/[0.08] text-xs text-zinc-200 leading-relaxed placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium hover:bg-white/[0.08] border border-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={!requestChangesText.trim() || isProcessingAction}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
