'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Play,
  Sparkles,
  BookOpen,
  Check,
  Search,
} from 'lucide-react';
import { ContentItem } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import StatusBadge from '@/components/StatusBadge';

export default function HomePage() {
  const router = useRouter();
  const { role, userName } = useRole();
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
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

  // 60-Second Demo Trigger
  const handleRunDemo = async () => {
    setDemoLoading(true);
    try {
      // 1. Ensure sample brand pack is loaded
      await fetch('/api/seed', { method: 'POST' }).catch(() => {});

      // 2. Submit flawed draft with intentional terminology, claim & contrast violations
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'NovaPay Global Launch Campaign (60s Demo)',
          channel: 'Instagram post',
          body: 'Our app is 100% secure and the #1 choice! Nova Pay guarantees high yields with zero risk. Contact support@novabank.com or call +1 800 555 0199 now!',
          created_by: 'Alex (Creator)',
          role: 'Creator',
          is_confidential: false,
          image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
          image_alt: '', // Missing alt text -> triggers VIS-2
          text_color: '#94a3b8',
          bg_color: '#cbd5e1', // Bad contrast -> triggers VIS-1
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start demo');

      router.push(`/review/${data.content_id}`);
    } catch (e) {
      console.error('Demo error:', e);
      setDemoLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Hero Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141417] via-[#0f0f11] to-[#09090b] p-6 sm:p-10 shadow-2xl top-highlight">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Pre-Publication Brand Governance & Verification Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Publish with complete brand certainty.
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl font-normal">
            Automated 3-step compliance verification combining deterministic brand rulebooks,
            responsible Gemini 2.5 Flash analysis with client-side PII masking, and strict knowledge-base cross-validation.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* 60-Second Demo Button */}
            <button
              onClick={handleRunDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 hover:scale-[1.01] disabled:opacity-75 cursor-pointer"
            >
              {demoLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-zinc-950" />
                  <span>Running 60s Demo Audit...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Try the 60-second Demo</span>
                </>
              )}
            </button>

            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all shadow-sm"
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

      {/* Trust Strip */}
      <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] flex items-center justify-center gap-2.5 text-xs text-zinc-300 font-medium text-center shadow-sm">
        <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Every finding cites a source. AI only suggests. Humans approve.
        </span>
      </div>

      {/* 3-Step "How it works" Strip */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium px-1">
          How Brand Governance Works
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] top-highlight space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-mono font-bold flex items-center justify-center text-zinc-200">
                1
              </span>
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Set Rules</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Codify brand voice, prohibited terminology, verified corporate facts, and WCAG visual accessibility standards into an authoritative knowledge base.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] top-highlight space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-mono font-bold flex items-center justify-center text-zinc-200">
                2
              </span>
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Audit Pre-Flight</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Multi-tiered inspection: deterministic regex rulebooks + responsible Gemini AI with automated client-side PII sanitization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] top-highlight space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-mono font-bold flex items-center justify-center text-zinc-200">
                3
              </span>
              <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Human Approves</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Auditors inspect intent-preserving diffs, accept fixes with 1-click, and certify formal publication sign-off in the editorial review queue.
            </p>
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
            className="p-4 sm:p-5 rounded-xl bg-[#111113] border border-white/[0.06] hover:border-white/[0.1] transition-all top-highlight shadow-sm"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
              {stat.label}
            </span>
            <div className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {stat.value}
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block truncate font-sans">
              {stat.hint}
            </span>
          </div>
        ))}
      </div>

      {/* 3 Core Workflow Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="group p-5 rounded-xl bg-[#111113] hover:bg-[#151518] border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col justify-between top-highlight shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-200 group-hover:border-white/20 transition-all">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {module.desc}
                </p>
              </div>
              <div className="pt-3.5 flex items-center text-xs font-medium text-zinc-300 group-hover:text-white gap-1 transition-colors">
                <span>{module.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Submissions Table with Skeleton Loaders & Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">Recent Governance Audits</h2>
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

        {/* Skeleton Loaders */}
        {loading ? (
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111113] space-y-3" aria-busy="true" aria-label="Loading recent audits">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-3 rounded-lg bg-[#09090b] border border-white/[0.04] flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-zinc-800 rounded w-1/3" />
                  <div className="h-2.5 bg-zinc-850 rounded w-1/4" />
                </div>
                <div className="h-5 bg-zinc-800 rounded-full w-20" />
                <div className="h-7 bg-zinc-800 rounded-lg w-24 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : contentList.length === 0 ? (
          /* Friendly Empty State */
          <div className="p-8 rounded-xl border border-white/[0.08] bg-[#111113] text-center space-y-4 top-highlight">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-zinc-400 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">No publication audits recorded yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Get started in 30 seconds: run the one-click demo or audit your own proposed marketing copy.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                onClick={handleRunDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Try 60-Second Demo</span>
              </button>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 font-medium text-xs border border-white/[0.08] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Submission</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#111113]">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-[#09090b] border-b border-white/[0.06] text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Title & Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Privacy</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {contentList.slice(0, 8).map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-200">{item.title}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span>{item.channel}</span>
                        <span>•</span>
                        <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                      {item.created_by}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_confidential ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20 font-mono">
                          Confidential
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] font-mono">
                          AI + Rules
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <Link
                        href={`/review/${item.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium border border-white/[0.08] transition-colors"
                      >
                        Workbench
                      </Link>
                      <Link
                        href={`/history/${item.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors"
                      >
                        History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
