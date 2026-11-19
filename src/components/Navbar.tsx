'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '../lib/context/role-context';
import {
  Shield,
  Plus,
  Inbox,
  BarChart2,
  Sliders,
  ChevronDown,
  Check,
  Sparkles,
  Command,
} from 'lucide-react';
import { UserRole } from '../lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const { role, userName, setRole } = useRole();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll queue count
  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const res = await fetch('/api/content?status=in_review');
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.length || 0);
        }
      } catch (err) {}
    }
    fetchQueueCount();
    const interval = setInterval(fetchQueueCount, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Click outside listener for role dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/create', label: 'Create', icon: Plus },
    { href: '/queue', label: 'Review Queue', icon: Inbox, badge: queueCount },
    { href: '/insights', label: 'Insights', icon: BarChart2 },
    { href: '/admin', label: 'Knowledge Base', icon: Sliders },
  ];

  const roleMeta: Record<UserRole, { badge: string; dot: string; title: string }> = {
    Admin: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-purple-400',
      title: 'Full Knowledge Base Admin',
    },
    Creator: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-emerald-400',
      title: 'Author & Draft Revisions',
    },
    Manager: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-amber-400',
      title: 'Approval & Sign-Off',
    },
    Reviewer: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-blue-400',
      title: 'Compliance Audit & Feedback',
    },
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#09090b]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.12] flex items-center justify-center shadow-sm group-hover:border-white/25 transition-all">
              <Shield className="w-3.5 h-3.5 text-zinc-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100 tracking-tight">
                BrandSentry
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06]">
                Governance
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800/80 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-white/[0.06]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right tools: Role switcher & Status indicator */}
        <div className="flex items-center gap-3">
          {/* Role Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/70 hover:bg-zinc-850 hover:border-white/[0.14] text-xs font-medium transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              aria-expanded={isDropdownOpen}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${roleMeta[role].dot}`} />
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="font-semibold text-zinc-100">{role}</span>
                <span className="text-zinc-500 hidden sm:inline">•</span>
                <span className="text-zinc-400 hidden sm:inline text-[11px] truncate max-w-[130px]">{userName}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-500 ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.1] bg-[#111113] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1">
                  Active User Role & Permissions
                </div>
                {(['Admin', 'Creator', 'Manager', 'Reviewer'] as UserRole[]).map((r) => {
                  const isCurrent = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors my-0.5 ${
                        isCurrent
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${roleMeta[r].dot}`} />
                        <div>
                          <div className="font-semibold text-zinc-200 leading-none">{r}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{roleMeta[r].title}</div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
