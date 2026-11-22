'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Clock,
  History,
  GitCommit,
  GitBranch,
  MessageSquare,
  Shield,
  ArrowLeft,
  ArrowRight,
  User,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ContentItem, ContentVersion, Comment, AuditLogEntry, UserRole } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';
import DiffViewer from '@/components/DiffViewer';

function HistoryContent() {
  const routeParams = useParams();
  const id = typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : '';
  const { role, userName } = useRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Diff selection
  const [versionAIndex, setVersionAIndex] = useState<number>(0);
  const [versionBIndex, setVersionBIndex] = useState<number>(0);
  const [diffMode, setDiffMode] = useState<'inline' | 'split'>('split');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchHistoryData = async () => {
    if (!id) return;
    try {
      let data: any = null;
      try {
        const res = await fetch(`/api/content/${id}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      if (!data && typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem(`brandsentry_content_${id}`);
        if (cachedStr) {
          data = JSON.parse(cachedStr);
        }
      }

      if (!data || !data.content) throw new Error('Content not found');

      setContent(data.content);
      const vList = data.versions || (data.currentVersion ? [data.currentVersion] : []);
      setVersions(vList);
      setComments(data.comments || []);
      setAuditLogs(data.auditLogs || []);

      if (vList.length >= 2) {
        setVersionAIndex(0); // v1
        setVersionBIndex(vList.length - 1); // latest
      } else if (vList.length === 1) {
        setVersionAIndex(0);
        setVersionBIndex(0);
      }
    } catch (e: any) {
      toast(e.message || 'Error loading history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/content/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment.trim(),
          author: userName,
          role,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');
      toast('Comment posted to governance audit trail.', 'success');
      setNewComment('');
      await fetchHistoryData();
    } catch (e: any) {
      toast(e.message || 'Error posting comment', 'error');
    } finally {
      setIsPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
        <p className="text-zinc-500 text-xs">Loading audit history...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-zinc-400 text-xs">Content item not found.</p>
        <Link href="/" className="text-zinc-300 underline text-xs">Return Home</Link>
      </div>
    );
  }

  const verA = versions[versionAIndex];
  const verB = versions[versionBIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/review/${content.id}`}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Workbench
            </Link>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">Channel: {content.channel}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
            Governance History: {content.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/review/${content.id}`}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            Review Workbench
          </Link>
          <Link
            href="/queue"
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {/* Version Diff Section */}
      <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Version Comparison & Diff</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Base Version */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">Base:</span>
              <select
                value={versionAIndex}
                onChange={(e) => setVersionAIndex(Number(e.target.value))}
                className="px-2.5 py-1 rounded-md bg-[#09090b] border border-white/[0.08] text-zinc-200 text-xs font-mono"
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    v{v.version_no} ({new Date(v.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-3 h-3 text-zinc-600" />

            {/* Target Version */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">Compare:</span>
              <select
                value={versionBIndex}
                onChange={(e) => setVersionBIndex(Number(e.target.value))}
                className="px-2.5 py-1 rounded-md bg-[#09090b] border border-white/[0.08] text-zinc-200 text-xs font-mono"
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    v{v.version_no} ({new Date(v.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            {/* Diff Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded-lg border border-white/[0.06] ml-2">
              <button
                onClick={() => setDiffMode('split')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  diffMode === 'split' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]' : 'text-zinc-400'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setDiffMode('inline')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  diffMode === 'inline' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]' : 'text-zinc-400'
                }`}
              >
                Inline
              </button>
            </div>
          </div>
        </div>

        {verA && verB ? (
          <DiffViewer
            original={verA.body}
            modified={verB.body}
            mode={diffMode}
            className="rounded-xl"
          />
        ) : (
          <p className="text-xs text-zinc-500">Only 1 version exists so far.</p>
        )}
      </div>

      {/* 2-Column Section: Comments Thread & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Comments Thread */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3.5 top-highlight">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Review Discussion ({comments.length})</h3>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No notes posted yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{c.author}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.04] text-zinc-400 border border-white/[0.06] font-mono">
                        {c.role}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {new Date(c.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans">{c.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Post Comment Form */}
          <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <input
              type="text"
              placeholder="Leave an auditor note or revision comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <button
              type="submit"
              disabled={isPostingComment || !newComment.trim()}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold transition-colors"
            >
              Post Note
            </button>
          </form>
        </div>

        {/* Audit Log Timeline */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3.5 top-highlight">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Full Audit Trail ({auditLogs.length})</h3>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No audit log entries recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{log.actor}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                        {log.role}
                      </span>
                    </div>
                    <span className="text-zinc-500">{new Date(log.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <p className="text-zinc-300 font-sans leading-relaxed text-xs">{log.action}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
          <p className="text-zinc-500 text-xs">Loading audit history...</p>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
