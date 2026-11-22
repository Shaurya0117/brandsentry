import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface ComplianceScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function computeComplianceScore(findings: { severity: string; status: string }[]): number {
  const active = findings.filter((f) => f.status === 'open' || f.status === 'needs_human_check');
  if (active.length === 0) return 100;

  let deduction = 0;
  for (const f of active) {
    if (f.severity === 'high') deduction += 25;
    else if (f.severity === 'medium') deduction += 12;
    else deduction += 5;
  }

  return Math.max(0, Math.min(100, 100 - deduction));
}

export default function ComplianceScoreRing({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: ComplianceScoreRingProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  let statusColor = '#10b981'; // emerald
  let statusBg = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  let statusText = 'Ready to Publish';
  let StatusIcon = ShieldCheck;

  if (safeScore < 50) {
    statusColor = '#f43f5e'; // rose
    statusBg = 'bg-rose-500/10 text-rose-300 border-rose-500/25';
    statusText = 'High Risk';
    StatusIcon = AlertOctagon;
  } else if (safeScore < 85) {
    statusColor = '#f59e0b'; // amber
    statusBg = 'bg-amber-500/10 text-amber-300 border-amber-500/25';
    statusText = 'Needs Fixes';
    StatusIcon = AlertTriangle;
  }

  const dimensions = {
    sm: { size: 56, stroke: 5, radius: 22, text: 'text-sm' },
    md: { size: 76, stroke: 6, radius: 30, text: 'text-lg font-bold' },
    lg: { size: 100, stroke: 8, radius: 40, text: 'text-2xl font-bold' },
  }[size];

  const circumference = 2 * Math.PI * dimensions.radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0"
        role="progressbar"
        aria-valuenow={safeScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Brand Compliance Score: ${safeScore} out of 100 (${statusText})`}
      >
        <svg
          width={dimensions.size}
          height={dimensions.size}
          viewBox={`0 0 ${dimensions.size} ${dimensions.size}`}
          className="transform -rotate-90"
        >
          {/* Track background */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={dimensions.radius}
            stroke="currentColor"
            strokeWidth={dimensions.stroke}
            fill="transparent"
            className="text-white/[0.08]"
          />
          {/* Progress fill */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={dimensions.radius}
            stroke={statusColor}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono text-zinc-100 ${dimensions.text} tracking-tight`}>
            {safeScore}
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Brand Compliance
            </span>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${statusBg}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
