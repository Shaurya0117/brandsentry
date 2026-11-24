'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Calculator,
  Layers,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import { DetailedScoreResult } from './ComplianceScoreRing';

interface ScoreExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreResult: DetailedScoreResult;
  campaignTitle: string;
}

export default function ScoreExplainerModal({
  isOpen,
  onClose,
  scoreResult,
  campaignTitle,
}: ScoreExplainerModalProps) {
  if (!isOpen) return null;

  const { overallScore, statusLabel, riskLevel, categories, deductions, weights } = scoreResult;

  const getScoreColor = (s: number) => {
    if (s >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    if (s >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  };

  const getProgressBarColor = (s: number) => {
    if (s >= 85) return 'bg-emerald-400';
    if (s >= 50) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111113] border border-white/[0.12] shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-zinc-100">
                Explainable Compliance Scoring
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Deterministic validation formula for <span className="text-zinc-200 font-medium">&quot;{campaignTitle}&quot;</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Score Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#09090b] border border-white/[0.08]">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Overall Score</span>
            <div className="flex items-baseline gap-2 justify-center sm:justify-start">
              <span className="text-3xl font-mono font-bold text-zinc-100">{overallScore}</span>
              <span className="text-xs font-mono text-zinc-500">/ 100</span>
            </div>
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Health Status</span>
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getScoreColor(overallScore)}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Risk Level</span>
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                riskLevel === 'Critical'
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                  : riskLevel === 'Medium'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
              }`}>
                {riskLevel} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown (Priority 1 item) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Category Score Breakdown</span>
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">4 Governance Dimensions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-200">{cat.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-zinc-100">{cat.score}%</span>
                    {cat.activeCount > 0 ? (
                      <span className="text-[10px] font-mono text-rose-400">({cat.activeCount} issues)</span>
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(cat.score)}`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Methodology & Formula */}
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-blue-300">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Deterministic Scoring Formula</span>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            The Brand Compliance Score is <strong>not</strong> an arbitrary AI output. It is calculated deterministically from active rule violations using weighted penalties:
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-black/40 border border-white/[0.06] text-center">
              <span className="text-rose-400 block font-bold">−{weights.high} pts</span>
              <span className="text-zinc-400 text-[10px]">High / Legal Risk</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/[0.06] text-center">
              <span className="text-amber-400 block font-bold">−{weights.medium} pts</span>
              <span className="text-zinc-400 text-[10px]">Medium / Tone Risk</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/[0.06] text-center">
              <span className="text-blue-400 block font-bold">−{weights.low} pts</span>
              <span className="text-zinc-400 text-[10px]">Low / Minor Style</span>
            </div>
          </div>
        </div>

        {/* Itemized Deductions */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
            <span>Itemized Score Deductions</span>
            <span className="text-zinc-500 text-[11px] font-mono">
              {deductions.length === 0 ? '0 Deductions (100% Score)' : `−${100 - overallScore} Total Deductions`}
            </span>
          </h3>

          {deductions.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Full 100/100 score: Zero active violations remaining on this revision.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {deductions.map((d, idx) => (
                <div
                  key={d.id + idx}
                  className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        −{d.deduction} pts
                      </span>
                      <span className="font-mono text-zinc-300 text-[11px] uppercase font-semibold">
                        {d.source_code}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        • {d.category}
                      </span>
                    </div>
                    {d.quoted_span && (
                      <p className="text-zinc-400 font-mono text-[11px]">
                        Matched: <span className="text-rose-300 bg-rose-500/10 px-1 rounded">&quot;{d.quoted_span}&quot;</span>
                      </p>
                    )}
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{d.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
