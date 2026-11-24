'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '../lib/context/role-context';
import { useTheme } from '../lib/context/theme-context';
import {
  Shield,
  Plus,
  Inbox,
  BarChart2,
  Sliders,
  ChevronDown,
  Check,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Info,
} from 'lucide-react';
import { UserRole } from '../lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const { role, userName, setRole } = useRole();
  const { theme, toggleTheme } = useTheme();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/create', label: 'Create', icon: Plus },
    { href: '/queue', label: 'Review Queue', icon: Inbox, badge: queueCount },
    { href: '/insights', label: 'Insights', icon: BarChart2 },
    { href: '/admin', label: 'Knowledge Base', icon: Sliders },
  ];

  const roleMeta: Record<UserRole, { badge: string; dot: string; title: string; capabilities: string }> = {
    Creator: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-emerald-400',
      title: 'Author & Draft Revisions',
      capabilities: 'Can draft copy, run pre-flight audits, apply fixes, and submit to review. Cannot approve publication.',
    },
    Reviewer: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-blue-400',
      title: 'Compliance Audit & Feedback',
      capabilities: 'Can inspect rule compliance, add auditor notes, and request mandatory changes. Cannot approve publication.',
    },
    Manager: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-amber-400',
      title: 'Approval & Sign-Off Authority',
      capabilities: 'Has authority to officially certify and approve content for publication, or request revisions.',
    },
    Admin: {
      badge: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      dot: 'bg-purple-400',
      title: 'Knowledge Base Administrator',
      capabilities: 'Full access: add/edit guidelines, enterprise facts, banned terms, and seed brand packs.',
    },
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 tracking-tight">
                BrandSentry
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-zinc-400 px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-white/[0.04] border border-indigo-200 dark:border-white/[0.06] hidden xs:inline-block">
                Governance
              </span>
            </div>
          </Link>

          {/* Nav links - Desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right tools: Theme toggle, Role switcher, Mobile menu */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/70 hover:bg-zinc-850 hover:border-white/[0.15] text-zinc-400 hover:text-zinc-100 transition-all text-xs"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-zinc-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-300" />
            )}
          </button>

          {/* Role Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/70 hover:bg-zinc-850 hover:border-white/[0.14] text-xs font-medium transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label={`Current role: ${role}. Click to switch role and inspect permissions.`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${roleMeta[role].dot}`} />
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="font-semibold text-zinc-100 text-xs">{role}</span>
                <span className="text-zinc-500 hidden lg:inline">•</span>
                <span className="text-zinc-400 hidden lg:inline text-[11px] truncate max-w-[120px]">{userName}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-500 ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-white/[0.1] bg-[#111113] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 top-highlight">
                <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-white/[0.06] flex items-center justify-between mb-1">
                  <span>Role Switcher & Permissions</span>
                  <span className="text-zinc-500 text-[9px]">4 Tiers</span>
                </div>
                {(['Creator', 'Reviewer', 'Manager', 'Admin'] as UserRole[]).map((r) => {
                  const isCurrent = role === r;
                  const meta = roleMeta[r];
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex flex-col p-2.5 rounded-lg text-left transition-all my-1 ${
                        isCurrent
                          ? 'bg-zinc-800 text-white border border-white/[0.1] shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          <span className="font-semibold text-xs text-zinc-100">{r}</span>
                          <span className="text-[10px] font-mono text-zinc-400">({meta.title})</span>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 pl-4 leading-relaxed font-sans">
                        {meta.capabilities}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/70 text-zinc-400 hover:text-zinc-100"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#09090b] px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
