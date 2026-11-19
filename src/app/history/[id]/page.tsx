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
      const res = await fetch(`/api/content/${id}`);
      if (!res.ok) throw new Error('Content not found');
      const data = await res.json();

      setContent(data.content);
      setVersions(data.versions);
      setComments(data.comments);
      setAuditLogs(data.auditLogs);

      if (data.versions.length >= 2) {
        setVersionAIndex(0); // v1
        setVersionBIndex(data.versions.length - 1); // latest
      } else if (data.versions.length === 1) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
        <p className="text-slate-400 text-sm">Loading audit history...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-400">Content item not found.</p>
        <Link href="/" className="text-cyan-400 underline text-sm">Return Home</Link>
      </div>
    );
  }

  const verA = versions[versionAIndex];
  const verB = versions[versionBIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/review/${content.id}`}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Audit Workbench
            </Link>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Channel: {content.channel}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Governance History: {content.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/review/${content.id}`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Review Workbench
          </Link>
          <Link
            href="/queue"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {/* Version Diff Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Version Comparison & Diff</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Base Version */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Base:</span>
              <select
                value={versionAIndex}
                onChange={(e) => setVersionAIndex(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    v{v.version_no} ({new Date(v.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

            {/* Target Version */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Compare With:</span>
              <select
                value={versionBIndex}
                onChange={(e) => setVersionBIndex(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    v{v.version_no} ({new Date(v.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            {/* Diff Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 ml-2">
              <button
                onClick={() => setDiffMode('split')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  diffMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setDiffMode('inline')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  diffMode === 'inline' ? 'bg-slate-800 text-white' : 'text-slate-400'
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
          <p className="text-xs text-slate-500">Only 1 version exists so far.</p>
        )}
      </div>

      {/* 2-Column Section: Comments Thread & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Comments Thread */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Review Discussion ({comments.length})</h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No notes posted yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{c.author}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                        {c.role}
                      </span>
                    </div>
                    <span>{new Date(c.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{c.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Post Comment Form */}
          <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Leave an auditor note or revision comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isPostingComment || !newComment.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              Post Note
            </button>
          </form>
        </div>

        {/* Audit Log Timeline */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Full Audit Trail ({auditLogs.length})</h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No audit log entries recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{log.actor}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        {log.role}
                      </span>
                    </div>
                    <span>{new Date(log.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed">{log.action}</p>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading audit history...</p>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
