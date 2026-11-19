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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
        <p className="text-slate-400 text-sm">Aggregating brand governance intelligence...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400">Failed to load insights.</p>
      </div>
    );
  }

  const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
    tone: { bg: 'bg-indigo-950', text: 'text-indigo-400', bar: 'bg-indigo-500' },
    terminology: { bg: 'bg-purple-950', text: 'text-purple-400', bar: 'bg-purple-500' },
    fact: { bg: 'bg-cyan-950', text: 'text-cyan-400', bar: 'bg-cyan-500' },
    claim: { bg: 'bg-rose-950', text: 'text-rose-400', bar: 'bg-rose-500' },
    visual: { bg: 'bg-amber-950', text: 'text-amber-400', bar: 'bg-amber-500' },
    accessibility: { bg: 'bg-emerald-950', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  };

  const maxCategoryCount = Math.max(...Object.values(data.categoryCounts), 1);
  const maxCodeCount = data.top5Codes.length > 0 ? Math.max(...data.top5Codes.map((c) => c.count), 1) : 1;

  const displayedHealth = healthFilter === 'all'
    ? data.guidelineHealth
    : data.guidelineHealth.filter((gh) => gh.is_unclear);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-violet-950 text-violet-400 border border-violet-800/80">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-violet-400">
              Governance Analytics & Diagnostic Health
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Brand Health & Compliance Insights</h1>
          <p className="text-sm text-slate-400">
            Identify systematic brand drift, creator education opportunities, and ambiguous guidelines requiring clarification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            title="Download executive governance summary report"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report (.md)
          </button>

          <Link
            href="/admin"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold transition-colors"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Knowledge Base</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Category Breakdown & Top 5 Triggered Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Findings by Governance Category
            </h3>
            <span className="text-xs text-slate-400 font-mono">{data.totalFindings} Total Flagged</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(data.categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / maxCategoryCount) * 100);
              const color = categoryColors[cat] || { bg: 'bg-slate-800', text: 'text-slate-300', bar: 'bg-cyan-500' };

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 capitalize flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color.bar}`} />
                      {cat}
                    </span>
                    <span className="font-mono text-slate-400">{count} issues</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Most Triggered Codes */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Top 5 Most Triggered Guideline Codes
            </h3>
            <span className="text-xs text-slate-400">High-frequency friction points</span>
          </div>

          {data.top5Codes.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              No guidelines triggered yet. Run audits on proposed drafts to populate analytics.
            </p>
          ) : (
            <div className="space-y-3.5">
              {data.top5Codes.map((item, idx) => {
                const pct = Math.round((item.count / maxCodeCount) * 100);
                return (
                  <div key={item.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-cyan-400">{item.code}</span>
                        <span className="text-[10px] text-slate-500 uppercase">({item.category})</span>
                      </div>
                      <span className="font-mono text-slate-300 font-semibold">{item.count} hits</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-500"
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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Repeated Compliance Tendencies by Creator</h3>
          </div>
          <span className="text-xs text-slate-400">Enables targeted brand education</span>
        </div>

        {data.creatorMistakes.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-6">No creator audit records yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.creatorMistakes.map((cm) => (
              <div
                key={cm.creator}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{cm.creator}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    {cm.totalFindings} flagged
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Frequent Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(cm.categories).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                      >
                        {cat}: <strong className="text-white">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-1 border-t border-slate-900">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Common Codes Triggered</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(cm.commonCodes).map(([code, count]) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono text-[10px] border border-cyan-900/50"
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

      {/* Row 3: Guideline Health & AI-written Clarification Suggestions */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Guideline Health & Clarification Engine</h3>
              <p className="text-xs text-slate-400">
                Flags rules that are triggered often and rejected often (indicating ambiguity or creator dispute).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setHealthFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                healthFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              All Rules ({data.guidelineHealth.length})
            </button>
            <button
              onClick={() => setHealthFilter('unclear')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                healthFilter === 'unclear' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              Needs Clarification ({data.guidelineHealth.filter((g) => g.is_unclear).length})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {displayedHealth.map((gh) => (
            <div
              key={gh.guideline.id}
              className={`p-5 rounded-xl border transition-all space-y-3 ${
                gh.is_unclear
                  ? 'bg-amber-950/20 border-amber-800/80 shadow-md shadow-amber-950/20'
                  : 'bg-slate-950 border-slate-800/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                    {gh.guideline.code}
                  </span>
                  <span className="text-sm font-bold text-white">{gh.guideline.category}</span>
                  {gh.is_unclear && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-900/80 text-amber-200 border border-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Likely Unclear
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span>Triggered: <strong className="text-slate-200">{gh.total_triggered}</strong></span>
                  <span>Rejected: <strong className="text-rose-400">{gh.total_rejected}</strong></span>
                  <span>
                    Rejection Rate:{' '}
                    <strong className={gh.rejection_rate > 20 ? 'text-amber-400' : 'text-emerald-400'}>
                      {gh.rejection_rate}%
                    </strong>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/70 font-sans">
                &ldquo;{gh.guideline.text}&rdquo;
              </p>

              {/* AI Written Clarification Suggestion */}
              <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <span>AI Recommendation to Clarify Corporate Standard:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{gh.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
