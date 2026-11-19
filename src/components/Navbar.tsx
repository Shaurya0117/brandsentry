'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '../lib/context/role-context';
import { ShieldCheck, PlusCircle, Inbox, BarChart3, Settings2, User, ChevronDown } from 'lucide-react';
import { UserRole } from '../lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const { role, userName, setRole } = useRole();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Poll or fetch queue count for in_review items
  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const res = await fetch('/api/content?status=in_review');
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.length || 0);
        }
      } catch (err) {
        // quiet error
      }
    }
    fetchQueueCount();
    const interval = setInterval(fetchQueueCount, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const navLinks = [
    { href: '/create', label: 'Create & Audit', icon: PlusCircle },
    { href: '/queue', label: 'Review Queue', icon: Inbox, badge: queueCount },
    { href: '/insights', label: 'Brand Insights', icon: BarChart3 },
    { href: '/admin', label: 'Knowledge Base', icon: Settings2 },
  ];

  const roleColors: Record<UserRole, { badge: string; dot: string; border: string }> = {
    Admin: {
      badge: 'bg-purple-900/60 text-purple-300 border-purple-700/60',
      dot: 'bg-purple-400',
      border: 'hover:border-purple-500',
    },
    Creator: {
      badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60',
      dot: 'bg-emerald-400',
      border: 'hover:border-emerald-500',
    },
    Manager: {
      badge: 'bg-amber-900/60 text-amber-300 border-amber-700/60',
      dot: 'bg-amber-400',
      border: 'hover:border-amber-500',
    },
    Reviewer: {
      badge: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60',
      dot: 'bg-indigo-400',
      border: 'hover:border-indigo-500',
    },
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-900/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                BrandSentry
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 tracking-wider">
                  Governance
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all bg-slate-900/80 ${roleColors[role].border}`}
              aria-expanded={isDropdownOpen}
              aria-label="Switch User Role"
            >
              <span className={`w-2 h-2 rounded-full ${roleColors[role].dot}`} />
              <div className="flex flex-col text-left">
                <span className="text-xs text-slate-400 leading-none">Role: <strong className="text-slate-200">{role}</strong></span>
                <span className="text-xs font-normal text-slate-300 truncate max-w-[120px] sm:max-w-[160px]">{userName}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Simulate Role & Permissions
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
                        isCurrent ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${roleColors[r].dot}`} />
                        <span>{r}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleColors[r].badge}`}>
                        {r === 'Admin' && 'Manage KB'}
                        {r === 'Creator' && 'Submit/Edit'}
                        {r === 'Manager' && 'Approve'}
                        {r === 'Reviewer' && 'Audit'}
                      </span>
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
