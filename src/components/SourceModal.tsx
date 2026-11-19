'use client';

import React, { useState } from 'react';
import { BookOpen, CheckCircle, ShieldAlert, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export interface SourceDetail {
  code: string;
  category?: string;
  text: string;
  type: 'guideline' | 'fact' | 'term' | 'rule';
}

interface SourceModalProps {
  sourceCode: string;
  onClose: () => void;
}

export default function SourceModal({ sourceCode, onClose }: SourceModalProps) {
  const [detail, setDetail] = React.useState<SourceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchSource() {
      setLoading(true);
      try {
        // Fetch guideline or fact
        const gRes = await fetch(`/api/guidelines`);
        const fRes = await fetch(`/api/facts`);
        const tRes = await fetch(`/api/terms`);

        const guidelines = gRes.ok ? await gRes.json() : [];
        const facts = fRes.ok ? await fRes.json() : [];
        const terms = tRes.ok ? await tRes.json() : [];

        const codeUpper = sourceCode.trim().toUpperCase();

        const matchG = guidelines.find((g: any) => g.code.toUpperCase() === codeUpper);
        if (matchG) {
          setDetail({
            code: matchG.code,
            category: matchG.category,
            text: matchG.text,
            type: 'guideline',
          });
          setLoading(false);
          return;
        }

        const matchF = facts.find((f: any) => f.code.toUpperCase() === codeUpper);
        if (matchF) {
          setDetail({
            code: matchF.code,
            category: 'Approved Enterprise Fact',
            text: matchF.statement,
            type: 'fact',
          });
          setLoading(false);
          return;
        }

        if (codeUpper === 'TERM' || codeUpper.startsWith('TERM')) {
          setDetail({
            code: 'TERM',
            category: 'Brand Terminology Standard',
            text: 'Terminology must adhere to authorized preferred spellings, capitalization, and prohibited phrases.',
            type: 'term',
          });
          setLoading(false);
          return;
        }

        // Generic fallback
        setDetail({
          code: sourceCode,
          category: 'Brand Compliance Standard',
          text: `Referenced standard code ${sourceCode}. Ensure publication copy strictly respects corporate tone, legal compliance, and accessibility standards.`,
          type: 'rule',
        });
      } catch (e) {
        setDetail({
          code: sourceCode,
          category: 'Compliance Rule',
          text: `Rule details for ${sourceCode}.`,
          type: 'rule',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSource();
  }, [sourceCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">Cited Knowledge Base Reference</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{sourceCode}</h3>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Category
              </span>
              <p className="text-sm font-medium text-slate-200">{detail.category || 'Standard'}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Authorized Governance Statement
              </span>
              <p className="text-sm text-slate-300 leading-relaxed">{detail.text}</p>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-cyan-400 hover:underline"
                onClick={onClose}
              >
                <span>View in Knowledge Base</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
