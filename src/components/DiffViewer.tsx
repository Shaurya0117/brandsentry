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
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono ${className}`}>
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-200">
          <div className="text-[10px] uppercase font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Original
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{original}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-200">
          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
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
    <div className={`p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono leading-relaxed ${className}`}>
      {diffParts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-emerald-900/60 text-emerald-200 px-1 py-0.5 rounded border border-emerald-700/60 font-semibold"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-rose-900/60 text-rose-200 line-through px-1 py-0.5 rounded border border-rose-700/60 opacity-80"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-slate-300">{part.value}</span>;
      })}
    </div>
  );
}
