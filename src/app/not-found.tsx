import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Plus, Inbox, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-amber-400 mx-auto shadow-xl">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          404 &bull; Item Not Found
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Content Draft or Page Unavailable
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          The requested content draft or audit record could not be found. It may have been archived or the URL might be invalid.
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs shadow-sm transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Review Queue</span>
        </Link>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Submission</span>
        </Link>
      </div>
    </div>
  );
}
