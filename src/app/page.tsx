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
  Zap,
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

      if (typeof window !== 'undefined' && data.content_id) {
        try {
          const cachedItem = {
            content: data.content || {
              id: data.content_id,
              title: 'NovaPay Global Launch Campaign (60s Demo)',
              channel: 'Instagram post',
              status: 'draft',
              created_by: 'Alex (Creator)',
              is_confidential: false,
              image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
              image_alt: '',
              text_color: '#94a3b8',
              bg_color: '#cbd5e1',
              created_at: new Date().toISOString(),
            },
            currentVersion: data.currentVersion || {
              id: data.version_id,
              content_id: data.content_id,
              version_no: 1,
              body: 'Our app is 100% secure and the #1 choice! Nova Pay guarantees high yields with zero risk. Contact support@novabank.com or call +1 800 555 0199 now!',
              created_at: new Date().toISOString(),
            },
            versions: data.versions || [
              {
                id: data.version_id,
                content_id: data.content_id,
                version_no: 1,
                body: 'Our app is 100% secure and the #1 choice! Nova Pay guarantees high yields with zero risk. Contact support@novabank.com or call +1 800 555 0199 now!',
                created_at: new Date().toISOString(),
              },
            ],
            findings: data.findings || [],
            comments: [],
            auditLogs: [],
          };
          localStorage.setItem(`brandsentry_content_${data.content_id}`, JSON.stringify(cachedItem));

          const listStr = localStorage.getItem('brandsentry_items_cache');
          const list = listStr ? JSON.parse(listStr) : [];
          localStorage.setItem(
            'brandsentry_items_cache',
            JSON.stringify([cachedItem.content, ...list.filter((x: any) => x.id !== data.content_id)])
          );
        } catch (e) {}
      }

      router.push(`/review/${data.content_id}`);
    } catch (e) {
      console.error('Demo error:', e);
      setDemoLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Dramatic Minimalist Hero Section */}
      <div className="relative pt-4 sm:pt-8 pb-4">
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-indigo-500/10 via-blue-500/10 to-teal-500/5 blur-3xl pointer-events-none rounded-full -z-10" />

        <div className="max-w-4xl space-y-6">
          {/* Micro Status Pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-md text-slate-700 dark:text-zinc-300 text-xs font-mono tracking-wide shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>PRE-PUBLICATION GOVERNANCE • ROUND 3 PROD</span>
          </div>

          {/* Big Bold Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.01]">
            Publish with <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400">
              absolute certainty.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-zinc-400 font-normal leading-relaxed max-w-2xl">
            Deterministic brand rulebooks meet responsible Gemini AI. Eliminate regulatory advertising exposure, stop brand drift, and verify every claim before it goes public.
          </p>

          {/* Action Row */}
          <div className="pt-4 flex flex-wrap items-center gap-3.5">
            {/* 60-Second Demo Button */}
            <button
              onClick={handleRunDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-sm tracking-tight transition-all shadow-xl shadow-slate-950/15 hover:shadow-slate-950/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75"
            >
              {demoLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-zinc-950" />
                  <span>Running 60s Demo Audit...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Try the 60-second Demo</span>
                </>
              )}
            </button>

            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-semibold text-sm border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-all"
            >
              <Plus className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Create & Run Audit</span>
            </Link>

            <Link
              href="/queue"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08] text-slate-700 dark:text-zinc-300 font-medium text-sm border border-slate-200/60 dark:border-white/[0.06] transition-all"
            >
              <Inbox className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Review Queue</span>
              {stats.inReview > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold">
                  {stats.inReview}
                </span>
              )}
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium text-sm transition-colors"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>Knowledge Base ({stats.guidelines} rules)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Minimalist Trust & Safety Bar */}
      <div className="py-4 border-y border-slate-200/80 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 font-medium">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Zero hallucinations: Every finding cites an authoritative Knowledge Base rule code.</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 font-mono text-[11px] text-slate-400 dark:text-zinc-500">
          <span>WCAG 2.1 AA Contrast</span>
          <span>•</span>
          <span>Client-Side PII Masking</span>
          <span>•</span>
          <span>Human Manager Sign-Off</span>
        </div>
      </div>

      {/* Large Typography Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Active Rules & Guidelines', value: stats.guidelines, unit: 'rules', hint: 'Tone, Legal, Visual, Claims' },
          { label: 'Verified Corporate Truths', value: stats.facts, unit: 'facts', hint: 'Authoritative facts cross-checked' },
          { label: 'Pending Compliance Queue', value: stats.inReview, unit: 'in review', hint: 'Awaiting managerial sign-off' },
          { label: 'Certified Publications', value: stats.approved, unit: 'cleared', hint: 'Authorized for live distribution' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-all group"
          >
            <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-semibold">
              {stat.label}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {stat.value}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 font-medium">{stat.unit}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-sans leading-relaxed">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Minimalist 3-Step Architecture Section */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/70 dark:border-white/[0.08] pb-5">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              3-Step Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              How Brand Governance Works
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md font-sans">
            Engineered for high-velocity marketing and product teams before content touches the public.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4 relative overflow-hidden">
            <span className="text-5xl font-black font-mono text-slate-100 dark:text-white/[0.05] absolute top-4 right-5 select-none pointer-events-none">
              01
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              1. Set Brand Rules
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
              Codify brand voice, banned terminology (e.g. &quot;Nova Pay&quot; vs &quot;NovaPay&quot;), verified corporate truth sets, and WCAG visual contrast standards into an authoritative knowledge base.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4 relative overflow-hidden">
            <span className="text-5xl font-black font-mono text-slate-100 dark:text-white/[0.05] absolute top-4 right-5 select-none pointer-events-none">
              02
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              2. Audit Pre-Flight
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
              Multi-tiered inspection: deterministic regex rulebooks execute instantly alongside responsible Gemini AI with client-side PII sanitization and an anti-hallucination validation gate.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4 relative overflow-hidden">
            <span className="text-5xl font-black font-mono text-slate-100 dark:text-white/[0.05] absolute top-4 right-5 select-none pointer-events-none">
              03
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              3. Human Sign-Off
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
              Reviewers inspect intent-preserving rewrites, accept fixes with 1-click, and certify formal publication sign-off in the editorial review queue with printable audit certificates.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Workflow Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
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
              className="group p-7 rounded-2xl bg-white dark:bg-[#121b2d] hover:bg-slate-50 dark:hover:bg-[#162035] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-zinc-200 group-hover:scale-105 transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {module.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                  {module.desc}
                </p>
              </div>
              <div className="pt-5 flex items-center text-xs font-semibold text-slate-900 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 gap-1.5 transition-colors">
                <span>{module.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Submissions Section */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/70 dark:border-white/[0.08] pb-5">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Live Feed
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              Recent Governance Audits
            </h2>
          </div>
          <Link
            href="/create"
            className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 font-semibold"
          >
            <span>Create new submission</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Skeleton Loaders */}
        {loading ? (
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121b2d] space-y-4" aria-busy="true" aria-label="Loading recent audits">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-200/70 dark:bg-zinc-850 rounded w-1/4" />
                </div>
                <div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded-full w-24" />
                <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg w-28 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : contentList.length === 0 ? (
          /* Friendly Empty State */
          <div className="p-12 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121b2d] text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-500 dark:text-zinc-400 mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">No publication audits recorded yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-sans leading-relaxed">
                Get started in 30 seconds: run the one-click demo or audit your own proposed marketing copy.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRunDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Try 60-Second Demo</span>
              </button>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-white/[0.08] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Submission</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121b2d] shadow-sm">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-mono font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Title & Channel</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Risk Level</th>
                  <th className="px-5 py-3.5">Author</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {contentList.slice(0, 8).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{item.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-2 mt-1 font-mono">
                        <span className="font-medium text-slate-600 dark:text-zinc-400">{item.channel}</span>
                        <span>•</span>
                        <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                          item.risk_level === 'Critical'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                            : item.risk_level === 'Medium'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        }`}
                      >
                        {item.risk_level ? `${item.risk_level.toUpperCase()} RISK` : 'LOW RISK'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-400 font-mono text-xs">
                      {item.created_by}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Link
                        href={`/review/${item.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-sm transition-all inline-block"
                      >
                        Workbench
                      </Link>
                      <Link
                        href={`/history/${item.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 text-xs font-medium transition-colors inline-block"
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
