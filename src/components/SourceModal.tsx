'use client';

import React from 'react';
import { BookOpen, X, ExternalLink } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#111113] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative top-highlight">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-zinc-200">
            <BookOpen className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Cited Knowledge Standard</span>
            </div>
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight font-mono">{sourceCode}</h3>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60" />
          </div>
        ) : detail ? (
          <div className="space-y-3.5">
            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Category
              </span>
              <p className="text-xs font-medium text-zinc-200">{detail.category || 'Standard'}</p>
            </div>

            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Authorized Governance Statement
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">{detail.text}</p>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-zinc-400">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
                onClick={onClose}
              >
                <span>Open Knowledge Base</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
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
