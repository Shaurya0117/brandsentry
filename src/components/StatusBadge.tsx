import React from 'react';
import { Clock, CheckCircle2, RotateCcw, FileText } from 'lucide-react';
import { ContentStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ContentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const meta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string; dot: string }> = {
    draft: {
      label: 'Draft',
      icon: FileText,
      badge: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
      dot: 'bg-zinc-400',
    },
    in_review: {
      label: 'In Review',
      icon: Clock,
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      dot: 'bg-amber-400',
    },
    changes_requested: {
      label: 'Changes Req.',
      icon: RotateCcw,
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
      dot: 'bg-rose-400',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
      dot: 'bg-emerald-400',
    },
  };

  const item = meta[status] || {
    label: status.replace('_', ' '),
    icon: FileText,
    badge: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
    dot: 'bg-zinc-400',
  };

  const Icon = item.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide uppercase font-mono ${item.badge} ${sizeClasses} ${className}`}
      title={`Status: ${item.label}`}
    >
      <Icon className={iconSizes} aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}
