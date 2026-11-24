'use client';

import React from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Calendar,
  User,
  Shield,
  Layers,
  Award,
} from 'lucide-react';
import { ContentItem, ContentVersion, Finding, Comment, AuditLogEntry } from '@/lib/types';
import { DetailedScoreResult } from './ComplianceScoreRing';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem;
  currentVersion: ContentVersion;
  scoreResult: DetailedScoreResult;
  findings: Finding[];
  comments: Comment[];
  auditLogs: AuditLogEntry[];
}

export default function AuditReportModal({
  isOpen,
  onClose,
  content,
  currentVersion,
  scoreResult,
  findings,
  comments,
  auditLogs,
}: AuditReportModalProps) {
  if (!isOpen) return null;

  const { overallScore, statusLabel, riskLevel, categories } = scoreResult;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const latestApprovalLog = auditLogs.find((log) => log.action?.toLowerCase().includes('approved'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Container - Printable styles configured via CSS */}
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl bg-[#0e0e10] border border-white/[0.15] shadow-2xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black print:max-h-none print:overflow-visible">
        {/* Screen Action Bar (hidden on print) */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Downloadable Compliance Audit Certificate
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT DOCUMENT START */}
        <div id="printable-audit-certificate" className="space-y-6 text-zinc-200 print:text-black">
          {/* Header & Brand Sentry Seal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.12] print:border-black/20 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  BS
                </div>
                <span className="text-xl font-bold tracking-tight text-white print:text-black">
                  BrandSentry Compliance Certificate
                </span>
              </div>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Official Pre-Publication Governance & Legal Verification Audit
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 print:border-emerald-700 print:text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>STATUS: {content.status.toUpperCase()}</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 print:text-zinc-600">
                Generated: {formattedDate}
              </div>
            </div>
          </div>

          {/* Campaign Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] print:border-black/15 print:bg-zinc-50 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-zinc-600 block">
                Campaign Title
              </span>
              <span className="font-semibold text-zinc-100 print:text-black truncate block">
                {content.title}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-zinc-600 block">
                Channel
              </span>
              <span className="font-mono text-zinc-200 print:text-black block">
                {content.channel}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-zinc-600 block">
                Author & Revision
              </span>
              <span className="font-mono text-zinc-200 print:text-black block">
                {content.created_by} (v{currentVersion.version_no})
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 print:text-zinc-600 block">
                Audit Mode
              </span>
              <span className="font-mono text-zinc-200 print:text-black block">
                {content.is_confidential ? 'Confidential (Local)' : 'Gemini AI + Rule Engine'}
              </span>
            </div>
          </div>

          {/* Compliance Score Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-[#09090b] border border-white/[0.08] print:border-black/15 print:bg-zinc-50 items-center">
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] print:bg-zinc-200 border border-white/[0.1] print:border-black/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-mono font-bold text-white print:text-black">
                  {overallScore}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 print:text-zinc-600">/ 100</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-100 print:text-black block">
                  {statusLabel}
                </span>
                <span className="text-[11px] text-zinc-400 print:text-zinc-600 block">
                  Priority Risk: {riskLevel}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-500 block">
                  Total Active Issues: {scoreResult.deductions.length}
                </span>
              </div>
            </div>

            <div className="sm:col-span-3 grid grid-cols-2 gap-2 text-xs">
              {categories.map((cat) => (
                <div key={cat.name} className="p-2 rounded-lg bg-black/40 print:bg-white border border-white/[0.06] print:border-black/10">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400 print:text-zinc-700">{cat.name}</span>
                    <span className="font-mono font-bold text-zinc-200 print:text-black">{cat.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copy Snippet Under Audit */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 print:text-zinc-800">
              Audited Content Text (v{currentVersion.version_no})
            </h3>
            <div className="p-3.5 rounded-xl bg-black/40 print:bg-zinc-50 border border-white/[0.06] print:border-black/15 text-xs text-zinc-300 print:text-zinc-900 leading-relaxed font-sans whitespace-pre-wrap">
              {currentVersion.body}
            </div>
          </div>

          {/* Detailed Findings Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 print:text-zinc-800 flex justify-between">
              <span>Detailed Governance Findings & Actions</span>
              <span className="font-mono text-[11px] text-zinc-500 print:text-zinc-600">
                {findings.length} Total Findings Tracked
              </span>
            </h3>

            {findings.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No violations recorded on this content.</p>
            ) : (
              <div className="overflow-x-auto border border-white/[0.08] print:border-black/15 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] print:bg-zinc-100 border-b border-white/[0.08] print:border-black/15 text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-700">
                      <th className="p-2.5">Rule / Std</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Flagged Text & Suggested Rewrite</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] print:divide-zinc-200">
                    {findings.map((f, i) => (
                      <tr key={f.id || i} className="hover:bg-white/[0.01]">
                        <td className="p-2.5 font-mono text-[11px] font-semibold text-zinc-200 print:text-black">
                          {f.source_code}
                        </td>
                        <td className="p-2.5 capitalize text-zinc-400 print:text-zinc-700">
                          {f.category}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            f.severity === 'high'
                              ? 'text-rose-400 bg-rose-500/10'
                              : f.severity === 'medium'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-blue-400 bg-blue-500/10'
                          }`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="p-2.5 space-y-1 max-w-xs">
                          <div className="text-zinc-300 print:text-black font-mono text-[11px]">
                            &quot;{f.quoted_span}&quot;
                          </div>
                          {f.suggested_fix && (
                            <div className="text-emerald-400 print:text-emerald-700 text-[10px]">
                              ➜ Fix: &quot;{f.suggested_fix}&quot;
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            f.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-300 print:text-emerald-700'
                              : f.status === 'rejected'
                              ? 'bg-zinc-800 text-zinc-400 print:text-zinc-600'
                              : 'bg-amber-500/10 text-amber-300 print:text-amber-700'
                          }`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Governance Sign-Off & Approvals */}
          <div className="p-4 rounded-xl border border-white/[0.1] print:border-black/20 bg-white/[0.01] print:bg-zinc-50 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 print:text-zinc-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
              <span>Governance Sign-Off & Verification Stamp</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block">
                  Author Signature
                </span>
                <span className="font-mono text-zinc-200 print:text-black block">
                  {content.created_by}
                </span>
                <span className="text-[10px] text-zinc-500 block">Creator Role</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block">
                  Reviewer / Manager Sign-Off
                </span>
                <span className="font-mono text-emerald-400 print:text-emerald-800 font-semibold block">
                  {latestApprovalLog ? latestApprovalLog.actor : 'Pending Final Sign-Off'}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {latestApprovalLog ? `${latestApprovalLog.role} • Certified` : 'Awaiting Manager Review'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block">
                  Digital Verification Hash
                </span>
                <span className="font-mono text-[10px] text-zinc-400 print:text-zinc-700 break-all block">
                  BS-VERIFIED-{(content.id + currentVersion.id).slice(0, 16).toUpperCase()}
                </span>
                <span className="text-[9px] text-zinc-500 block">Audited via BrandSentry v3.0</span>
              </div>
            </div>

            {/* Comments Thread (if any) */}
            {comments.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] print:border-black/10 space-y-1 text-xs">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block">
                  Reviewer Notes:
                </span>
                <div className="space-y-1 text-zinc-300 print:text-zinc-800 text-[11px]">
                  {comments.map((c) => (
                    <div key={c.id} className="italic">
                      &quot;{c.text}&quot; — <span className="font-semibold">{c.author}</span> ({c.role})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* PRINTABLE REPORT DOCUMENT END */}

        {/* Modal Footer (Screen only) */}
        <div className="flex justify-between items-center pt-3 border-t border-white/[0.08] print:hidden">
          <span className="text-xs text-zinc-500">
            Tip: Select &quot;Save as PDF&quot; in the system print dialog.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
