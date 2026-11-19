'use client';

import React from 'react';
import { diffWords } from 'diff';

interface DiffViewerProps {
  original: string;
  modified: string;
  mode?: 'inline' | 'split';
  className?: string;
}

export default function DiffViewer({
  original,
  modified,
  mode = 'inline',
  className = '',
}: DiffViewerProps) {
  const diffParts = React.useMemo(() => {
    return diffWords(original || '', modified || '');
  }, [original, modified]);

  if (mode === 'split') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono ${className}`}>
        <div className="p-3 rounded-lg bg-rose-500/[0.04] border border-rose-500/20 text-rose-300/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
          <div className="text-[10px] uppercase font-semibold text-rose-400 mb-1 flex items-center gap-1.5 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Original
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{original}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 text-emerald-300/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
          <div className="text-[10px] uppercase font-semibold text-emerald-400 mb-1 flex items-center gap-1.5 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Suggested Revision
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{modified}</p>
        </div>
      </div>
    );
  }

  // Inline diff mode
  return (
    <div className={`p-3 rounded-lg bg-[#09090b] border border-white/[0.08] text-xs font-mono leading-relaxed shadow-inner ${className}`}>
      {diffParts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-rose-500/15 text-rose-300 line-through px-1.5 py-0.5 rounded border border-rose-500/30 opacity-75"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-zinc-300">{part.value}</span>;
      })}
    </div>
  );
}
