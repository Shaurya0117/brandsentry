'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Plus,
  Inbox,
  BarChart2,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  Layers,
  ChevronRight,
  TrendingUp,
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

  const statusMeta: Record<string, { label: string; badge: string; dot: string }> = {
    draft: {
      label: 'Draft',
      badge: 'bg-zinc-850 text-zinc-300 border-zinc-700/60',
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141417] via-[#0f0f11] to-[#09090b] p-8 sm:p-10 shadow-2xl top-highlight">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Pre-Publication Brand Governance & Verification Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Publish with complete brand certainty.
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl font-normal">
            Automated 3-step compliance verification combining deterministic brand rulebooks,
            responsible Gemini 2.5 Flash analysis with client-side PII masking, and strict knowledge-base cross-validation.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-sm hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>Create & Run Audit</span>
            </Link>
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-white/[0.08] transition-colors"
            >
              <Inbox className="w-4 h-4 text-zinc-400" />
              <span>Review Queue</span>
              {stats.inReview > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                  {stats.inReview}
                </span>
              )}
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-xs border border-white/[0.06] transition-colors"
            >
              <Sliders className="w-4 h-4 text-zinc-500" />
              <span>Brand Pack ({stats.guidelines} rules)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Guidelines', value: stats.guidelines, hint: 'Tone, Legal, Visual, Claims' },
          { label: 'Verified Facts', value: stats.facts, hint: 'Authoritative truth set' },
          { label: 'Pending Review', value: stats.inReview, hint: 'Awaiting managerial sign-off' },
          { label: 'Approved Publications', value: stats.approved, hint: 'Ready for distribution' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-white/[0.1] transition-all top-highlight shadow-sm"
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
              {stat.label}
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stat.value}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block truncate">
              {stat.hint}
            </span>
          </div>
        ))}
      </div>

      {/* 3 Core Workflow Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            href: '/create',
            title: 'Author & Audit Copy',
            desc: 'Draft campaign copy across Instagram, Press notes, or Email. Audit against banned terminology, absolute claims, and WCAG contrast.',
            cta: 'New Submission',
            icon: Plus,
          },
          {
            href: '/queue',
            title: 'Governance Queue',
            desc: 'Inspect pending content with live channel mockups (Instagram post card, Email format, Press note). Approve or request revisions.',
            cta: 'Open Queue',
            icon: Inbox,
          },
          {
            href: '/insights',
            title: 'Brand Health & Analytics',
            desc: 'Identify systematic compliance friction, review creator mistake patterns, and refine ambiguous guidelines with AI suggestions.',
            cta: 'View Insights',
            icon: BarChart2,
          },
        ].map((module, i) => {
          const Icon = module.icon;
          return (
            <Link
              key={i}
              href={module.href}
              className="group p-6 rounded-xl bg-[#111113] hover:bg-[#151518] border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col justify-between top-highlight shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-200 group-hover:border-white/20 transition-all">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {module.desc}
                </p>
              </div>
              <div className="pt-4 flex items-center text-xs font-semibold text-zinc-300 group-hover:text-white gap-1 transition-colors">
                <span>{module.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Submissions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Recent Governance Audits</h2>
            <p className="text-xs text-zinc-500">Live feed of processed content drafts and publication statuses</p>
          </div>
          <Link
            href="/create"
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
          >
            <span>New check</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs animate-pulse">Loading audits...</div>
        ) : contentList.length === 0 ? (
          <div className="p-8 rounded-xl border border-white/[0.06] bg-[#111113] text-center space-y-3">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-300">No submissions recorded yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Run your first compliance check on marketing copy, email announcement, or press release.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Submission
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111113]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-white/[0.06] text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Title & Channel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Author</th>
                  <th className="px-5 py-3">Privacy</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {contentList.slice(0, 8).map((item) => {
                  const meta = statusMeta[item.status] || statusMeta.draft;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-zinc-200">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{item.channel}</span>
                          <span>•</span>
                          <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.badge}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                        {item.created_by}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.is_confidential ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                            Confidential
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                            AI + Rules
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <Link
                          href={`/review/${item.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium border border-white/[0.06] transition-colors"
                        >
                          Workbench
                        </Link>
                        <Link
                          href={`/history/${item.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors"
                        >
                          History
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
