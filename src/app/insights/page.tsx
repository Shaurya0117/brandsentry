'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight,
  Info,
  HelpCircle,
  Lightbulb,
  Download,
  FileText,
  Activity,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function InsightsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalFindings: number;
    categoryCounts: Record<string, number>;
    top5Codes: { code: string; count: number; category: string }[];
    creatorMistakes: {
      creator: string;
      totalFindings: number;
      categories: Record<string, number>;
      commonCodes: Record<string, number>;
    }[];
    guidelineHealth: {
      guideline: { id: string; code: string; category: string; text: string };
      total_triggered: number;
      total_rejected: number;
      rejection_rate: number;
      is_unclear: boolean;
      suggestion: string;
    }[];
  } | null>(null);

  const [healthFilter, setHealthFilter] = useState<'all' | 'unclear'>('all');

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          toast('Failed to load insights data.', 'error');
        }
      } catch (e) {
        toast('Error loading insights.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  const handleExportReport = () => {
    if (!data) return;
    const report = `# BrandSentry Governance Audit & Compliance Report
Generated on: ${new Date().toLocaleString()}

## Executive Summary
- Total Governance Findings Flagged: ${data.totalFindings}
- Active Guidelines Analyzed: ${data.guidelineHealth.length}
- Guidelines Flagged Unclear / Ambiguous: ${data.guidelineHealth.filter((g) => g.is_unclear).length}

## Breakdown by Category
${Object.entries(data.categoryCounts)
  .map(([cat, count]) => `- **${cat.toUpperCase()}**: ${count} occurrences`)
  .join('\n')}

## Top 5 Triggered Rule Codes
${data.top5Codes.map((item, idx) => `${idx + 1}. **${item.code}** (${item.category}): ${item.count} hits`).join('\n')}

## Guideline Health & AI Optimization Recommendations
${data.guidelineHealth
  .map(
    (gh) => `### ${gh.guideline.code} - ${gh.guideline.category}
- **Rule Text**: "${gh.guideline.text}"
- **Triggered**: ${gh.total_triggered} | **Rejected**: ${gh.total_rejected} (${gh.rejection_rate}% rejection rate)
- **Status**: ${gh.is_unclear ? '⚠️ LIKELY UNCLEAR - Needs Clarification' : '✅ Stable Adherence'}
- **AI Recommendation**: ${gh.suggestion}
`
  )
  .join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandsentry-compliance-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Governance report exported as Markdown!', 'success');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
        <p className="text-zinc-500 text-xs">Aggregating brand governance intelligence...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 text-xs">Failed to load insights.</p>
      </div>
    );
  }

  const categoryBars: Record<string, string> = {
    tone: 'bg-indigo-400',
    terminology: 'bg-purple-400',
    fact: 'bg-cyan-400',
    claim: 'bg-rose-400',
    visual: 'bg-amber-400',
    accessibility: 'bg-emerald-400',
  };

  const maxCategoryCount = Math.max(...Object.values(data.categoryCounts), 1);
  const maxCodeCount = data.top5Codes.length > 0 ? Math.max(...data.top5Codes.map((c) => c.count), 1) : 1;

  const displayedHealth = healthFilter === 'all'
    ? data.guidelineHealth
    : data.guidelineHealth.filter((gh) => gh.is_unclear);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-300" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Governance Analytics & Diagnostics
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1 tracking-tight">Brand Health & Compliance Insights</h1>
          <p className="text-xs text-zinc-400">
            Identify systematic brand drift, creator education opportunities, and ambiguous guidelines requiring clarification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
            title="Download executive governance summary report"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report (.md)
          </button>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Category Breakdown & Top 5 Triggered Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
              Findings by Governance Category
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">{data.totalFindings} Total Flagged</span>
          </div>

          <div className="space-y-3">
            {Object.entries(data.categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / maxCategoryCount) * 100);
              const barClass = categoryBars[cat] || 'bg-white';

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300 capitalize flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${barClass}`} />
                      {cat}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">{count} issue{count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#09090b] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Most Triggered Codes */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Top 5 Most Triggered Guideline Codes
            </h3>
            <span className="text-[11px] text-zinc-500">Frequent friction points</span>
          </div>

          {data.top5Codes.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-8 text-center">
              No guidelines triggered yet. Run audits on proposed drafts to populate analytics.
            </p>
          ) : (
            <div className="space-y-3">
              {data.top5Codes.map((item, idx) => {
                const pct = Math.round((item.count / maxCodeCount) * 100);
                return (
                  <div key={item.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-white/[0.04] text-zinc-400 font-mono text-[10px] font-medium flex items-center justify-center border border-white/[0.06]">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-medium text-zinc-200 text-xs">{item.code}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">({item.category})</span>
                      </div>
                      <span className="font-mono text-zinc-300 text-xs font-medium">{item.count} hit{item.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#09090b] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-300 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Repeated Mistakes by Creator */}
      <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Repeated Tendencies by Creator</h3>
          </div>
          <span className="text-[11px] text-zinc-500">Enables targeted brand education</span>
        </div>

        {data.creatorMistakes.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-6">No creator audit records yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.creatorMistakes.map((cm) => (
              <div
                key={cm.creator}
                className="p-3.5 rounded-xl bg-[#09090b] border border-white/[0.06] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-zinc-100">{cm.creator}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    {cm.totalFindings} flagged
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-400">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">Frequent Categories</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(cm.categories).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-zinc-300"
                      >
                        {cat}: <strong className="text-zinc-100">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-zinc-400 pt-1.5 border-t border-white/[0.04]">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">Common Codes</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(cm.commonCodes).map(([code, count]) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.2 rounded bg-white/[0.03] text-zinc-300 font-mono text-[10px] border border-white/[0.06]"
                      >
                        {code} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Guideline Health & AI Clarification Engine */}
      <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Guideline Health & Clarification Engine</h3>
              <p className="text-xs text-zinc-400">
                Flags rules that are triggered often and rejected often (indicating ambiguity or creator dispute).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-white/[0.06] text-xs">
            <button
              onClick={() => setHealthFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                healthFilter === 'all' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Rules ({data.guidelineHealth.length})
            </button>
            <button
              onClick={() => setHealthFilter('unclear')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                healthFilter === 'unclear' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Needs Clarification ({data.guidelineHealth.filter((g) => g.is_unclear).length})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {displayedHealth.map((gh) => (
            <div
              key={gh.guideline.id}
              className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                gh.is_unclear
                  ? 'bg-amber-500/[0.03] border-amber-500/25 shadow-sm'
                  : 'bg-[#09090b] border-white/[0.06]'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-white/[0.04] text-zinc-200 border border-white/[0.08]">
                    {gh.guideline.code}
                  </span>
                  <span className="text-xs font-medium text-zinc-200">{gh.guideline.category}</span>
                  {gh.is_unclear && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Likely Unclear
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span>Triggered: <strong className="text-zinc-200">{gh.total_triggered}</strong></span>
                  <span>Rejected: <strong className="text-rose-400">{gh.total_rejected}</strong></span>
                  <span>
                    Rejection Rate:{' '}
                    <strong className={gh.rejection_rate > 20 ? 'text-amber-400' : 'text-emerald-400'}>
                      {gh.rejection_rate}%
                    </strong>
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-[#111113] p-3 rounded-lg border border-white/[0.06] font-sans">
                &ldquo;{gh.guideline.text}&rdquo;
              </p>

              {/* AI Written Clarification Suggestion */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-zinc-300 text-[11px]">
                  <Lightbulb className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Recommendation to Clarify Corporate Standard:</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-xs">{gh.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
