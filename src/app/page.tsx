'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  PlusCircle,
  Inbox,
  BarChart3,
  Settings2,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ContentItem } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';

export default function HomePage() {
  const { role, userName } = useRole();
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    guidelines: 5,
    facts: 4,
    terms: 7,
    inReview: 0,
    approved: 0,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, gRes, fRes, tRes] = await Promise.all([
          fetch('/api/content'),
          fetch('/api/guidelines'),
          fetch('/api/facts'),
          fetch('/api/terms'),
        ]);

        if (cRes.ok) {
          const items: ContentItem[] = await cRes.json();
          setContentList(items);
          setStats((prev) => ({
            ...prev,
            inReview: items.filter((i) => i.status === 'in_review').length,
            approved: items.filter((i) => i.status === 'approved').length,
          }));
        }

        const g = gRes.ok ? await gRes.json() : [];
        const f = fRes.ok ? await fRes.json() : [];
        const t = tRes.ok ? await tRes.json() : [];

        setStats((prev) => ({
          ...prev,
          guidelines: g.length,
          facts: f.length,
          terms: t.length,
        }));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const statusColors = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    in_review: 'bg-amber-950 text-amber-300 border-amber-800',
    changes_requested: 'bg-rose-950 text-rose-300 border-rose-800',
    approved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  };

  const statusLabels = {
    draft: 'Draft (Audited)',
    in_review: 'In Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved for Publishing',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Brand Governance & Compliance Engine
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Publish with complete brand certainty.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            BrandSentry audits content before publication through a 3-step pipeline: deterministic brand rules,
            responsible Gemini 2.5 Flash analysis with PII masking, and strict knowledge-base cross-validation.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              Create & Run Audit
            </Link>
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-colors"
            >
              <Inbox className="w-4 h-4" />
              Review Queue ({stats.inReview})
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Brand Pack ({stats.guidelines} rules)
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Active Guidelines</span>
          <div className="mt-2 text-3xl font-bold text-white">{stats.guidelines}</div>
          <span className="text-xs text-slate-400 mt-1 block">Tone, Legal, Visual, Claims</span>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Approved Facts</span>
          <div className="mt-2 text-3xl font-bold text-cyan-400">{stats.facts}</div>
          <span className="text-xs text-slate-400 mt-1 block">Enterprise verified truth set</span>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Pending Review</span>
          <div className="mt-2 text-3xl font-bold text-amber-400">{stats.inReview}</div>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting sign-off</span>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Approved Items</span>
          <div className="mt-2 text-3xl font-bold text-emerald-400">{stats.approved}</div>
          <span className="text-xs text-slate-400 mt-1 block">Ready for publication</span>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/create"
          className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
              Submit & Audit Content
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Creator role: Select publication channel, draft copy, attach image/contrast metadata, and run the real-time 3-step audit.
            </p>
          </div>
          <div className="pt-4 flex items-center text-sm font-semibold text-cyan-400 gap-1.5">
            <span>New Submission</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/queue"
          className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Governance Review Queue
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Manager & Reviewer roles: Inspect content awaiting approval, comment on flagged issues, and authorize or request revisions.
            </p>
          </div>
          <div className="pt-4 flex items-center text-sm font-semibold text-amber-400 gap-1.5">
            <span>View Queue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/insights"
          className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-violet-950 border border-violet-800/80 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
              Guideline Health & Analytics
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detect ambiguous rules with high dispute/rejection rates and receive AI-generated recommendations to clarify corporate standards.
            </p>
          </div>
          <div className="pt-4 flex items-center text-sm font-semibold text-violet-400 gap-1.5">
            <span>Explore Insights</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent Submissions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Governance Audits</h2>
            <p className="text-xs text-slate-400">Content processed through BrandSentry pre-publication checks</p>
          </div>
          <Link
            href="/create"
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Run new check</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading audits...</div>
        ) : contentList.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/30 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No content items submitted yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start by running an audit on your marketing copy, email announcement, or press note.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Submission
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Title & Channel</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Submitted By</th>
                    <th className="px-5 py-3.5">Privacy</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contentList.slice(0, 8).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{item.title}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {item.channel}
                          </span>
                          <span>•</span>
                          <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            statusColors[item.status]
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 font-medium">
                        {item.created_by}
                      </td>
                      <td className="px-5 py-4">
                        {item.is_confidential ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-medium">
                            Confidential (Rule-Only)
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-medium">
                            AI + Rules
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <Link
                          href={`/review/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors"
                        >
                          Audit Findings
                        </Link>
                        <Link
                          href={`/history/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
                        >
                          History & Logs
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
