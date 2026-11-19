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
      const res = await fetch('/api/content');
      if (res.ok) {
        const allData: ContentItem[] = await res.json();
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
        setDetailFindings(data.findings);
        setDetailComments(data.comments);
      }
    } catch (e) {
      toast('Failed to load item detail.', 'error');
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
    }
  }, [selectedItemId]);

  const handleApprove = async () => {
    if (!canApprove) {
      toast('Manager or Reviewer role required to approve content.', 'warning');
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
          commentText: 'Pre-publication governance review authorized. Content approved for publication.',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve');
      }

      toast(`"${detailContent.title}" approved for publication!`, 'success');
      await fetchItems();
      await fetchDetail(detailContent.id);
    } catch (e: any) {
      toast(e.message || 'Error approving item', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!canRequestChanges) {
      toast('Manager or Reviewer role required to request changes.', 'warning');
      return;
    }
    if (!detailContent) return;

    if (!requestChangesText.trim()) {
      toast('A comment explaining the required changes is required.', 'error');
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

      toast('Changes requested. Item returned to creator with required revisions.', 'info');
      setIsRequestModalOpen(false);
      setRequestChangesText('');
      await fetchItems();
      await fetchDetail(detailContent.id);
    } catch (e: any) {
      toast(e.message || 'Error requesting changes', 'error');
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

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    in_review: 'bg-amber-950 text-amber-300 border-amber-800',
    changes_requested: 'bg-rose-950 text-rose-300 border-rose-800',
    approved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-950 text-amber-400 border border-amber-800/80">
              <Inbox className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-amber-400">
              Editorial Governance & Approval Queue
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Review Queue</h1>
          <p className="text-sm text-slate-400">
            Sign off on pre-publication drafts, request mandatory revisions, or provide auditor notes.
          </p>
        </div>

        {/* Status Filter Tabs with Live Badges */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  filter === tab.key ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
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
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <strong className="text-white font-semibold">Author Mode ({role}):</strong> Approving content or requesting mandatory changes requires a{' '}
              <strong className="text-amber-300">Manager</strong> or <strong className="text-indigo-300">Reviewer</strong> role.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRole('Manager')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm transition-all"
            >
              Switch to Manager
            </button>
            <button
              onClick={() => setRole('Reviewer')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all"
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, channel, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block pt-1">
            Submissions ({displayedItems.length})
          </span>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading submissions...</div>
          ) : displayedItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No submissions found matching &quot;{filter}&quot;.</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-xs text-cyan-400 underline font-semibold"
                >
                  View all submissions ({counts.all})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {displayedItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                const ChannelIcon = channelIcons[item.channel] || FileText;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate max-w-[190px]">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                          statusColors[item.status]
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ChannelIcon className="w-3.5 h-3.5 text-cyan-400" />
                        {item.channel}
                      </span>
                      <span>By {item.created_by}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                      {item.is_confidential && (
                        <span className="text-amber-400 font-semibold">Confidential</span>
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
            <div className="p-16 text-center text-slate-400 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2" />
              Loading submission details...
            </div>
          ) : !detailContent || !detailVersion ? (
            <div className="p-16 text-center bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 text-sm space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <p>Select a submission from the queue to inspect compliance status.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detail Card Header */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                        {detailContent.channel}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                          statusColors[detailContent.status]
                        }`}
                      >
                        Status: {detailContent.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {detailContent.status === 'approved' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Authorized
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{detailContent.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted by <strong className="text-slate-300">{detailContent.created_by}</strong> • Version v{detailVersion.version_no}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/review/${detailContent.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Workbench
                    </Link>
                    <Link
                      href={`/history/${detailContent.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      Audit Trail
                    </Link>
                  </div>
                </div>

                {/* Preview Mode Selector: Text vs Realistic Channel Mockup */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => setPreviewTab('text')}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                        previewTab === 'text' ? 'bg-slate-800 text-white' : 'text-slate-400'
                      }`}
                    >
                      Raw Text View
                    </button>
                    <button
                      onClick={() => setPreviewTab('channel')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                        previewTab === 'channel' ? 'bg-slate-800 text-white' : 'text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Channel Mockup ({detailContent.channel})
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {detailVersion.body.length} characters
                  </span>
                </div>

                {/* Draft Content Preview: Text vs Channel Mockup */}
                {previewTab === 'text' ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {detailVersion.body}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 flex justify-center">
                    {/* Realistic Channel Mockups */}
                    {detailContent.channel === 'Instagram post' && (
                      <div className="max-w-sm w-full rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-xs">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 flex items-center justify-center p-0.5">
                              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                NB
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-white text-[11px]">novabank_official</div>
                              <div className="text-[9px] text-slate-400">Sponsored • Financial Services</div>
                            </div>
                          </div>
                          <span className="text-slate-400 text-xs">•••</span>
                        </div>

                        {detailContent.image_url ? (
                          <img
                            src={detailContent.image_url}
                            alt={detailContent.image_alt || 'Instagram Campaign Visual'}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-32 flex items-center justify-center font-bold text-sm text-center p-4"
                            style={{
                              backgroundColor: detailContent.bg_color || '#0f172a',
                              color: detailContent.text_color || '#ffffff',
                            }}
                          >
                            Nova Bank Official Announcement
                          </div>
                        )}

                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-3">
                              <span>❤️ 1,248</span>
                              <span>💬 42</span>
                              <span>↗️</span>
                            </div>
                            <span>🔖</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed">
                            <strong className="text-white">novabank_official</strong> {detailVersion.body}
                          </p>
                        </div>
                      </div>
                    )}

                    {detailContent.channel === 'Email' && (
                      <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-xs">
                        <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-1">
                          <div className="text-slate-400">From: <strong className="text-white">announcements@novabank.com</strong></div>
                          <div className="text-slate-400">Subject: <strong className="text-cyan-300">{detailContent.title}</strong></div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="h-8 flex items-center border-b border-slate-800 pb-2">
                            <span className="font-bold text-sm text-white">Nova Bank</span>
                          </div>
                          <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {detailVersion.body}
                          </div>
                          <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                            Nova Bank N.A. Member FDIC. Confidential & Proprietary.
                          </div>
                        </div>
                      </div>
                    )}

                    {detailContent.channel === 'Press note' && (
                      <div className="max-w-lg w-full rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 text-xs font-serif leading-relaxed text-slate-200">
                        <div className="text-center pb-3 border-b border-slate-800">
                          <div className="text-[10px] uppercase font-sans font-bold tracking-widest text-cyan-400">
                            Official Press Release — For Immediate Release
                          </div>
                          <h4 className="text-base font-bold font-sans text-white mt-1">{detailContent.title}</h4>
                          <span className="text-[10px] font-sans text-slate-500">NEW YORK, NY — {new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{detailVersion.body}</p>
                        <div className="pt-3 border-t border-slate-800 font-sans text-[10px] text-slate-400">
                          Media Contact: press@novabank.com | Investor Relations: ir@novabank.com
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Open Findings Diagnostic Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Audit Status:</span>
                    {detailFindings.filter((f) => f.status === 'open' || f.status === 'needs_human_check').length === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        0 Open Issues (Clean)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                        {detailFindings.filter((f) => f.status === 'open' || f.status === 'needs_human_check').length} Active Findings
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/review/${detailContent.id}`}
                    className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Inspect in Review Workbench</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Reviewer Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    Operating as: <strong className="text-slate-200">{userName}</strong> ({role})
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsRequestModalOpen(true)}
                      disabled={!canRequestChanges || isProcessingAction}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Request Changes (Requires Comment)
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={!canApprove || isProcessingAction || detailContent.status === 'approved'}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {detailContent.status === 'approved' ? 'Approved for Publishing' : 'Approve for Publishing'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Review Discussion & Comments Thread */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Editorial Feedback Thread ({detailComments.length})
                    </h3>
                  </div>
                </div>

                {detailComments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No notes or revision requests recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {detailComments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{c.author}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                              {c.role}
                            </span>
                          </div>
                          <span>
                            {new Date(c.created_at || '').toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preset Feedback Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Quick notes:</span>
                  {[
                    'Approved with full compliance clearance.',
                    'Please update terminology per brand dictionary.',
                    'Image requires descriptive alt text (VIS-2).',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCommentText(preset)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-colors"
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
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Request Mandatory Revisions
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
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
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] border border-slate-700 text-left"
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
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white leading-relaxed placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={!requestChangesText.trim() || isProcessingAction}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
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
