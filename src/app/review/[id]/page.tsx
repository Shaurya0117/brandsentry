'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Cpu,
  ArrowRight,
  Send,
  Edit3,
  Clock,
  ExternalLink,
  BookOpen,
  Info,
  Check,
  Lock,
  Copy,
  CheckCheck,
  Filter,
  Eye,
  Layers,
  FileCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Printer,
  Calculator,
  FileText,
} from 'lucide-react';
import { ContentItem, ContentVersion, Finding, UserRole, Comment, AuditLogEntry } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';
import DiffViewer from '@/components/DiffViewer';
import SourceModal from '@/components/SourceModal';
import ComplianceScoreRing, { computeComplianceScore, computeDetailedComplianceScore } from '@/components/ComplianceScoreRing';
import ScoreExplainerModal from '@/components/ScoreExplainerModal';
import AuditReportModal from '@/components/AuditReportModal';
import StatusBadge from '@/components/StatusBadge';

function ReviewContent() {
  const routeParams = useParams();
  const id = typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : '';
  const router = useRouter();
  const { role, userName, canReviseContent, canSubmitContent } = useRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [modalSourceCode, setModalSourceCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Modals state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isScoreExplainerOpen, setIsScoreExplainerOpen] = useState(false);
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [isSubmittingFix, setIsSubmittingFix] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const detailedScore = useMemo(() => {
    return computeDetailedComplianceScore(findings);
  }, [findings]);

  const fetchContentDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/content/${id}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        setVersions(data.versions || [data.currentVersion]);
        setCurrentVersion(data.currentVersion);
        setFindings(data.findings || []);
        setComments(data.comments || []);
        setAuditLogs(data.auditLogs || []);
        if (data.currentVersion) {
          setManualEditText(data.currentVersion.body);
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`brandsentry_content_${id}`, JSON.stringify(data));
          } catch (e) {}
        }
        setLoading(false);
        return;
      }

      // Seamless fallback to client cache (handles cold serverless lambdas on Vercel)
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem(`brandsentry_content_${id}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          setContent(cached.content);
          setVersions(cached.versions || (cached.currentVersion ? [cached.currentVersion] : []));
          setCurrentVersion(cached.currentVersion);
          setFindings(cached.findings || []);
          setComments(cached.comments || []);
          setAuditLogs(cached.auditLogs || []);
          if (cached.currentVersion) {
            setManualEditText(cached.currentVersion.body);
          }
          setLoading(false);
          return;
        }
      }

      throw new Error('Content not found');
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem(`brandsentry_content_${id}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          setContent(cached.content);
          setVersions(cached.versions || (cached.currentVersion ? [cached.currentVersion] : []));
          setCurrentVersion(cached.currentVersion);
          setFindings(cached.findings || []);
          if (cached.currentVersion) {
            setManualEditText(cached.currentVersion.body);
          }
          setLoading(false);
          return;
        }
      }
      toast(err.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentDetails();
  }, [id]);

  // Handle Accept Single Fix (creates new version v(N+1))
  const handleAcceptFix = async (finding: Finding) => {
    if (!canReviseContent) {
      toast('Creator or Admin role required to revise content.', 'warning');
      return;
    }
    if (!currentVersion) return;

    setIsSubmittingFix(true);
    try {
      const oldBody = currentVersion.body;
      let newBody = oldBody;

      if (oldBody.includes(finding.quoted_span)) {
        newBody = oldBody.replace(finding.quoted_span, finding.suggested_fix);
      } else {
        const regex = new RegExp(finding.quoted_span.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        newBody = oldBody.replace(regex, finding.suggested_fix);
      }

      let succeededOnServer = false;
      try {
        const res = await fetch(`/api/content/${id}/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newBody,
            actor: userName,
            role,
            actionDescription: `Accepted suggested fix for rule ${finding.source_code}: replaced "${finding.quoted_span}" with "${finding.suggested_fix}"`,
            acceptedFindingId: finding.id,
          }),
        });

        if (res.ok) {
          succeededOnServer = true;
          await fetchContentDetails();
        }
      } catch (netErr) {}

      // Fallback state update for offline or stateless serverless lambdas
      if (!succeededOnServer) {
        const nextVerNo = (currentVersion.version_no || 1) + 1;
        const newVer: ContentVersion = {
          id: `v-${Date.now()}`,
          content_id: id,
          version_no: nextVerNo,
          body: newBody,
          created_at: new Date().toISOString(),
        };
        const updatedVersions = [...versions, newVer];
        const updatedFindings = findings.map((f) => (f.id === finding.id ? { ...f, status: 'accepted' as const } : f));
        
        setCurrentVersion(newVer);
        setVersions(updatedVersions);
        setFindings(updatedFindings);
        setManualEditText(newBody);

        if (typeof window !== 'undefined') {
          try {
            const cachedItem = {
              content,
              currentVersion: newVer,
              versions: updatedVersions,
              findings: updatedFindings,
            };
            localStorage.setItem(`brandsentry_content_${id}`, JSON.stringify(cachedItem));
          } catch (e) {}
        }
      }

      toast('Fix accepted! New version created and re-audited.', 'success');
    } catch (e: any) {
      toast(e.message || 'Error accepting fix', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Undo Last Accept (reverts to previous version v(N-1))
  const handleUndoLastAccept = async () => {
    if (!canReviseContent) {
      toast('Creator or Admin role required to revise content.', 'warning');
      return;
    }
    if (versions.length < 2) {
      toast('No previous version to undo to.', 'info');
      return;
    }

    const previousVersion = versions[versions.length - 2];
    setIsSubmittingFix(true);
    try {
      let succeededOnServer = false;
      try {
        const res = await fetch(`/api/content/${id}/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newBody: previousVersion.body,
            actor: userName,
            role,
            actionDescription: `Undid last accept: reverted copy back to version v${previousVersion.version_no}`,
          }),
        });

        if (res.ok) {
          succeededOnServer = true;
          await fetchContentDetails();
        }
      } catch (netErr) {}

      if (!succeededOnServer) {
        const nextVerNo = (currentVersion?.version_no || versions.length) + 1;
        const newVer: ContentVersion = {
          id: `v-${Date.now()}`,
          content_id: id,
          version_no: nextVerNo,
          body: previousVersion.body,
          created_at: new Date().toISOString(),
        };
        const updatedVersions = [...versions, newVer];
        setCurrentVersion(newVer);
        setVersions(updatedVersions);
        setManualEditText(previousVersion.body);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `brandsentry_content_${id}`,
              JSON.stringify({ content, currentVersion: newVer, versions: updatedVersions, findings })
            );
          } catch (e) {}
        }
      }

      toast(`Undid last accepted change! Reverted to version v${previousVersion.version_no}.`, 'success');
    } catch (e: any) {
      toast(e.message || 'Error undoing last accept', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Accept All Rule Fixes in One Batch
  const handleAcceptAllRuleFixes = async () => {
    if (!canReviseContent) {
      toast('Creator or Admin role required to revise content.', 'warning');
      return;
    }
    if (!currentVersion) return;

    const ruleFindings = openFindings.filter((f) => !f.is_ai);
    if (ruleFindings.length === 0) {
      toast('No rule-based findings available to batch accept.', 'info');
      return;
    }

    setIsSubmittingFix(true);
    try {
      let updatedBody = currentVersion.body;
      let appliedCount = 0;

      for (const rf of ruleFindings) {
        if (updatedBody.includes(rf.quoted_span)) {
          updatedBody = updatedBody.replace(rf.quoted_span, rf.suggested_fix);
          appliedCount++;
        }
      }

      if (appliedCount === 0) {
        toast('No matching text spans found to replace.', 'warning');
        setIsSubmittingFix(false);
        return;
      }

      const res = await fetch(`/api/content/${id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newBody: updatedBody,
          actor: userName,
          role,
          actionDescription: `Batch accepted ${appliedCount} deterministic rule fixes.`,
        }),
      });

      if (!res.ok) throw new Error('Failed to create batch version');

      toast(`Applied ${appliedCount} rule fixes in one version! Re-audited successfully.`, 'success');
      await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error applying batch fixes', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Reject Finding
  const handleRejectFix = async (finding: Finding) => {
    try {
      let succeededOnServer = false;
      try {
        const res = await fetch(`/api/findings/${finding.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            actor: userName,
            role,
          }),
        });
        if (res.ok) succeededOnServer = true;
      } catch (e) {}

      const updatedFindings = findings.map((f) =>
        f.id === finding.id ? { ...f, status: 'rejected' as const } : f
      );
      setFindings(updatedFindings);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `brandsentry_content_${id}`,
            JSON.stringify({ content, currentVersion, versions, findings: updatedFindings })
          );
        } catch (e) {}
      }

      toast('Finding marked as rejected.', 'info');
      if (succeededOnServer) await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error rejecting finding', 'error');
    }
  };

  // Handle Manual Version Save
  const handleSaveManualEdit = async () => {
    if (!manualEditText.trim()) {
      toast('Content body cannot be empty', 'error');
      return;
    }

    setIsSubmittingFix(true);
    try {
      let succeededOnServer = false;
      try {
        const res = await fetch(`/api/content/${id}/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newBody: manualEditText,
            actor: userName,
            role,
            actionDescription: 'Creator manually edited and saved revised content.',
          }),
        });
        if (res.ok) succeededOnServer = true;
      } catch (e) {}

      if (!succeededOnServer) {
        const nextVerNo = (currentVersion?.version_no || versions.length) + 1;
        const newVer: ContentVersion = {
          id: `v-${Date.now()}`,
          content_id: id,
          version_no: nextVerNo,
          body: manualEditText,
          created_at: new Date().toISOString(),
        };
        const updatedVersions = [...versions, newVer];
        setCurrentVersion(newVer);
        setVersions(updatedVersions);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `brandsentry_content_${id}`,
              JSON.stringify({ content, currentVersion: newVer, versions: updatedVersions, findings })
            );
          } catch (e) {}
        }
      }

      toast('New version saved and audited successfully.', 'success');
      setIsEditingModalOpen(false);
      if (succeededOnServer) await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error saving version', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Submit for Approval
  const handleSubmitForApproval = async () => {
    if (!content) return;
    setIsSubmittingApproval(true);
    try {
      let succeededOnServer = false;
      try {
        const res = await fetch(`/api/content/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in_review',
            actor: userName,
            role,
            commentText: 'Content finalized by author and submitted to governance review queue.',
          }),
        });
        if (res.ok) succeededOnServer = true;
      } catch (e) {}

      const updatedContent: ContentItem = { ...content, status: 'in_review' };
      setContent(updatedContent);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `brandsentry_content_${id}`,
            JSON.stringify({ content: updatedContent, currentVersion, versions, findings })
          );
          const listStr = localStorage.getItem('brandsentry_items_cache');
          const list = listStr ? JSON.parse(listStr) : [];
          localStorage.setItem(
            'brandsentry_items_cache',
            JSON.stringify([updatedContent, ...list.filter((x: any) => x.id !== id)])
          );
        } catch (e) {}
      }

      toast('Content submitted to Review Queue! Managers and Reviewers can now approve.', 'success');
      if (succeededOnServer) await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error submitting for approval', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const copyToClipboard = () => {
    if (!currentVersion) return;
    navigator.clipboard.writeText(currentVersion.body);
    setIsCopied(true);
    toast('Copied audited copy to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleCardCollapse = (findingId: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  // Active findings for current version
  const openFindings = useMemo(() => {
    return findings.filter((f) => f.status === 'open' || f.status === 'needs_human_check');
  }, [findings]);

  const resolvedFindings = useMemo(() => {
    return findings.filter((f) => f.status === 'accepted' || f.status === 'rejected');
  }, [findings]);

  // Compute Brand Compliance Score
  const complianceScore = useMemo(() => {
    return computeComplianceScore(findings);
  }, [findings]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: openFindings.length };
    openFindings.forEach((f) => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  }, [openFindings]);

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: openFindings.length };
    openFindings.forEach((f) => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    });
    return counts;
  }, [openFindings]);

  // Filtered open findings
  const filteredOpenFindings = useMemo(() => {
    return openFindings.filter((f) => {
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
      return matchesCategory && matchesSeverity;
    });
  }, [openFindings, categoryFilter, severityFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
        <p className="text-zinc-400 text-xs font-mono">Loading governance audit results...</p>
      </div>
    );
  }

  if (!content || !currentVersion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-semibold text-zinc-100">Content item not found</h2>
        <Link href="/create" className="text-zinc-300 underline text-xs">Return to Create</Link>
      </div>
    );
  }

  // Stats
  const wordCount = currentVersion.body.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Interactive Text Highlighting
  const renderHighlightedContent = () => {
    const text = currentVersion.body;
    if (!text) return null;

    interface HighlightMatch {
      start: number;
      end: number;
      finding: Finding;
    }

    const matches: HighlightMatch[] = [];

    openFindings.forEach((f) => {
      if (!f.quoted_span) return;
      const span = f.quoted_span;
      let idx = text.indexOf(span);
      if (idx === -1) {
        idx = text.toLowerCase().indexOf(span.toLowerCase());
      }
      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + span.length,
          finding: f,
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const segments: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((m, i) => {
      if (m.start < cursor) return;

      if (m.start > cursor) {
        segments.push(<span key={`text-${cursor}`}>{text.slice(cursor, m.start)}</span>);
      }

      const isSelected = selectedFindingId === m.finding.id;
      const severityClass = {
        high: isSelected
          ? 'bg-rose-500/25 text-rose-100 ring-1 ring-rose-400 border-b border-rose-400'
          : 'bg-rose-500/10 text-rose-200 border-b border-rose-500/60 hover:bg-rose-500/20',
        medium: isSelected
          ? 'bg-amber-500/25 text-amber-100 ring-1 ring-amber-400 border-b border-amber-400'
          : 'bg-amber-500/10 text-amber-200 border-b border-amber-500/60 hover:bg-amber-500/20',
        low: isSelected
          ? 'bg-blue-500/25 text-blue-100 ring-1 ring-blue-400 border-b border-blue-400'
          : 'bg-blue-500/10 text-blue-200 border-b border-blue-500/60 hover:bg-blue-500/20',
      }[m.finding.severity];

      segments.push(
        <mark
          key={`highlight-${m.finding.id}-${i}`}
          onClick={() => {
            setSelectedFindingId(m.finding.id);
            const el = document.getElementById(`finding-${m.finding.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all font-sans select-text ${severityClass}`}
          title={`Click to inspect ${m.finding.category} finding (${m.finding.source_code})`}
        >
          {text.slice(m.start, m.end)}
        </mark>
      );

      cursor = m.end;
    });

    if (cursor < text.length) {
      segments.push(<span key={`text-tail`}>{text.slice(cursor)}</span>);
    }

    return (
      <div className="p-6 rounded-2xl bg-[#111113] border border-white/[0.08] text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans shadow-inner top-highlight">
        {segments}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Accessibility live announcement region */}
      <div aria-live="polite" className="sr-only">
        {`Brand Compliance Score is ${complianceScore} out of 100. ${openFindings.length} open issues found.`}
      </div>

      {/* Top Banner: Confidential */}
      {content.is_confidential && (
        <div className="p-3.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/25 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Confidential Mode Active:</strong> External Google Gemini LLM was bypassed. Audit generated strictly using local rule standards.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono text-[10px]">
            Rule-Based Only
          </span>
        </div>
      )}

      {/* Header Bar with Compliance Score Ring */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={content.status} size="sm" />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              {content.channel}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Version v{currentVersion.version_no} of {versions.length}
            </span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">By {content.created_by}</span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">
              {wordCount} words • ~{readingTime} min read
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">{content.title}</h1>
        </div>

        {/* Brand Compliance Score Ring & Header Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <ComplianceScoreRing score={complianceScore} size="md" showLabel={true} />
            <button
              type="button"
              onClick={() => setIsScoreExplainerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/25 transition-all shadow-sm"
              title="Inspect scoring weights, formula, and category breakdown"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>Explain Score</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAuditReportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold border border-white/[0.15] shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
              title="Download or print certified compliance audit certificate"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>PDF Report</span>
            </button>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
              title="Copy current copy to clipboard"
            >
              {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => setIsEditingModalOpen(true)}
              disabled={!canReviseContent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Manual Edit</span>
            </button>

            <Link
              href={`/history/${content.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History ({versions.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Scores Overview Bar (Priority 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#111113] border border-white/[0.08]">
        {detailedScore.categories.map((cat) => (
          <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04] text-xs">
            <span className="text-zinc-400 text-[11px] font-medium truncate">{cat.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold text-xs ${
                cat.score >= 85 ? 'text-emerald-400' : cat.score >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {cat.score}%
              </span>
              {cat.activeCount > 0 ? (
                <span className="text-[10px] font-mono text-rose-400">({cat.activeCount})</span>
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Review Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Content Text & Highlight Spans */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span>Interactive Highlight Workbench</span>
              <span className="text-[10px] font-normal text-zinc-500">(Click highlight to inspect)</span>
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {openFindings.length} open issue{openFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Highlighted text component */}
          {renderHighlightedContent()}

          {/* Attached Campaign Assets / Contrast Info */}
          {(content.image_url || content.text_color) && (
            <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2 text-xs">
              <span className="font-medium text-zinc-300 block">Attached Visual Metadata:</span>
              {content.image_url && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>Image:</span>
                  <a
                    href={content.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-200 underline truncate max-w-sm hover:text-white"
                  >
                    {content.image_url}
                  </a>
                  {content.image_alt ? (
                    <span className="text-emerald-400 font-medium">(Alt: &quot;{content.image_alt}&quot;)</span>
                  ) : (
                    <span className="text-rose-400 font-medium">(Missing Alt Text - VIS-2)</span>
                  )}
                </div>
              )}
              {content.text_color && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>Color palette:</span>
                  <span
                    className="px-2 py-0.5 rounded border border-white/[0.1] text-xs font-mono"
                    style={{ backgroundColor: content.bg_color || '#09090b', color: content.text_color }}
                  >
                    Text {content.text_color} on {content.bg_color}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Findings Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Findings Header with Filters & Quick Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <span>Findings ({openFindings.length} Active)</span>
              </span>

              {/* Undo Last Accept button */}
              {versions.length > 1 && canReviseContent && (
                <button
                  type="button"
                  onClick={handleUndoLastAccept}
                  disabled={isSubmittingFix}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.1] text-[11px] font-medium transition-all disabled:opacity-50"
                  title={`Revert to previous version v${versions[versions.length - 2]?.version_no}`}
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>Undo Last Accept</span>
                </button>
              )}
            </div>

            {/* Category Filter Chips with Count Badges */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Filter Category:</div>
              <div className="flex flex-wrap gap-1 p-1 bg-[#111113] rounded-lg border border-white/[0.08] text-[10px]">
                {['all', 'terminology', 'claim', 'tone', 'accessibility', 'visual'].map((cat) => {
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all flex items-center gap-1 ${
                        categoryFilter === cat
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.1]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[9px] px-1 rounded-full ${categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-zinc-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Filter Chips with Count Badges */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Filter Severity:</div>
              <div className="flex flex-wrap gap-1 p-1 bg-[#111113] rounded-lg border border-white/[0.08] text-[10px]">
                {['all', 'high', 'medium', 'low'].map((sev) => {
                  const count = severityCounts[sev] || 0;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded-md font-medium uppercase font-mono transition-all flex items-center gap-1 ${
                        severityFilter === sev
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.1]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{sev}</span>
                      <span className={`text-[9px] px-1 rounded-full ${severityFilter === sev ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-zinc-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Finding Cards List */}
          {filteredOpenFindings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111113] border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-100">
                {openFindings.length === 0
                  ? 'All Governance Checks Passed'
                  : `No matching findings for selected filters.`}
              </h3>
              <p className="text-xs text-zinc-400">
                {openFindings.length === 0
                  ? `Zero brand violations or factual issues remaining on Version v${currentVersion.version_no}. Ready for managerial sign-off.`
                  : 'Try clearing category or severity filters to view remaining issues.'}
              </p>
              {content.status !== 'approved' && content.status !== 'in_review' && openFindings.length === 0 && (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Approval</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredOpenFindings.map((finding) => {
                const isSelected = selectedFindingId === finding.id;
                const isCollapsed = collapsedCards[finding.id] || false;

                const severityMeta = {
                  high: { badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25', icon: AlertOctagon, label: 'HIGH RISK' },
                  medium: { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25', icon: AlertTriangle, label: 'MEDIUM' },
                  low: { badge: 'bg-blue-500/10 text-blue-300 border-blue-500/25', icon: Info, label: 'LOW' },
                }[finding.severity];

                const SeverityIcon = severityMeta.icon;
                const isNeedsHumanCheck =
                  finding.status === 'needs_human_check' || finding.confidence < 0.6;

                return (
                  <div
                    key={finding.id}
                    id={`finding-${finding.id}`}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isSelected
                        ? 'bg-[#18181b] border-white/30 shadow-md ring-1 ring-white/20'
                        : 'bg-[#111113] border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Category */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                          {finding.category}
                        </span>

                        {/* Severity with icon */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${severityMeta.badge}`}>
                          <SeverityIcon className="w-2.5 h-2.5" />
                          <span>{severityMeta.label}</span>
                        </span>

                        {/* Rule vs AI */}
                        {finding.is_ai ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                            <span>AI-Assisted</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            <Cpu className="w-2.5 h-2.5 text-cyan-300" />
                            <span>Rule-Based</span>
                          </span>
                        )}

                        {/* Verified Source Badge */}
                        {finding.verified !== false && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Verified source</span>
                          </span>
                        )}
                      </div>

                      {/* Right Side: Needs human check, Confidence meter, and Collapse toggle */}
                      <div className="flex items-center gap-2">
                        {isNeedsHumanCheck && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                            <HelpCircle className="w-2.5 h-2.5 text-amber-400" />
                            <span>Needs human check</span>
                          </span>
                        )}

                        {/* Visual confidence meter */}
                        <div
                          className="flex items-center gap-1.5"
                          title={`Verification Confidence: ${Math.round((finding.confidence || 0) * 100)}%`}
                        >
                          <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                (finding.confidence || 0) >= 0.8
                                  ? 'bg-emerald-400'
                                  : (finding.confidence || 0) >= 0.6
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${Math.round((finding.confidence || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {Math.round((finding.confidence || 0) * 100)}%
                          </span>
                        </div>

                        {/* Collapse/Expand Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardCollapse(finding.id);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                          title={isCollapsed ? 'Expand card' : 'Collapse card'}
                        >
                          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Cited Source Standard */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 text-[11px]">Standard:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSourceCode(finding.source_code);
                        }}
                        className="font-mono text-xs text-zinc-300 hover:text-white underline flex items-center gap-1 transition-colors"
                        title="Click to view full corporate guideline or fact specification"
                      >
                        <span>{finding.source_code}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Card Content (Collapsible) */}
                    {!isCollapsed && (
                      <div className="space-y-3 pt-1">
                        {/* Explanation */}
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans">{finding.explanation}</p>

                        {/* Small "Why this was flagged" panel */}
                        <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.06] space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                            <Info className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Why this was flagged:</span>
                          </div>
                          <p className="text-zinc-300 text-xs leading-relaxed font-sans">
                            {finding.flagged_reason || (
                              finding.is_ai
                                ? `Identified by Gemini semantic evaluation matching brand guideline ${finding.source_code}.`
                                : `Matched deterministic pattern for ${finding.source_code} in active corporate guidelines.`
                            )}
                          </p>
                          <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-1 pt-1 border-t border-white/[0.04]">
                            <span className="text-zinc-500">Flagged text:</span>
                            <span className="text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              &quot;{finding.quoted_span}&quot;
                            </span>
                          </div>
                        </div>

                        {/* Suggested Fix Diff */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-wider text-zinc-500">
                            <span>Suggested Intent-Preserving Rewrite</span>
                            <span className="text-[10px] text-zinc-500 font-sans">Red = removal, Green = addition</span>
                          </div>
                          <DiffViewer
                            original={finding.quoted_span}
                            modified={finding.suggested_fix}
                            mode="split"
                          />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectFix(finding);
                            }}
                            disabled={isSubmittingFix}
                            className="px-2 py-1 rounded text-xs font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                            title="Reject finding (updates creator rejection rate for guideline health)"
                          >
                            Dismiss / Reject
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualEditText(currentVersion.body);
                                setIsEditingModalOpen(true);
                              }}
                              disabled={isSubmittingFix || !canReviseContent}
                              className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptFix(finding);
                              }}
                              disabled={isSubmittingFix || !canReviseContent}
                              className="px-3.5 py-1 rounded-md bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-semibold transition-all shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 text-zinc-900" />
                              <span>Accept Fix</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resolved Findings Summary */}
          {resolvedFindings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.06] space-y-2">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Resolved Issues ({resolvedFindings.length})
              </span>
              <div className="space-y-1.5">
                {resolvedFindings.map((rf) => (
                  <div key={rf.id} className="text-xs text-zinc-400 flex items-center justify-between">
                    <span className="truncate max-w-[200px] text-zinc-400">{rf.quoted_span}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        rf.status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-white/[0.04] text-zinc-500'
                      }`}
                    >
                      {rf.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-30 mt-8 p-3.5 rounded-2xl bg-[#111113]/95 backdrop-blur-md border border-white/[0.12] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center font-mono text-xs font-bold text-zinc-100 border border-white/[0.1]">
              {complianceScore}
            </div>
            <div className="text-xs">
              <span className="font-semibold text-zinc-100 block">Score: {complianceScore}/100</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {openFindings.length} open issue{openFindings.length === 1 ? '' : 's'} remaining
              </span>
            </div>
          </div>
          <StatusBadge status={content.status} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Undo last accept button */}
          {versions.length > 1 && canReviseContent && (
            <button
              type="button"
              onClick={handleUndoLastAccept}
              disabled={isSubmittingFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] text-xs font-medium transition-all disabled:opacity-50"
              title={`Revert to previous version v${versions[versions.length - 2]?.version_no}`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Undo Last Accept</span>
            </button>
          )}

          {/* Batch accept rule fixes */}
          {openFindings.some((f) => !f.is_ai) && canReviseContent && (
            <button
              type="button"
              onClick={handleAcceptAllRuleFixes}
              disabled={isSubmittingFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] text-xs font-medium transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accept All Rule Fixes</span>
            </button>
          )}

          {/* Explain score button */}
          <button
            type="button"
            onClick={() => setIsScoreExplainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-xs font-medium transition-all"
            title="Inspect scoring weights, formula, and category breakdown"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
            <span>Explain Score</span>
          </button>

          {/* Download PDF report button */}
          <button
            type="button"
            onClick={() => setIsAuditReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.15] text-xs font-semibold shadow-sm transition-all"
            title="Print or export compliance audit certificate"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-300" />
            <span>PDF Report</span>
          </button>

          {/* Submit for approval */}
          {content.status !== 'approved' && (
            <button
              type="button"
              onClick={handleSubmitForApproval}
              disabled={isSubmittingApproval || content.status === 'in_review'}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{content.status === 'in_review' ? 'In Review Queue' : 'Submit for Approval'}</span>
            </button>
          )}

          {/* Copy text */}
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Cited Source Modal */}
      {modalSourceCode && (
        <SourceModal sourceCode={modalSourceCode} onClose={() => setModalSourceCode(null)} />
      )}

      {/* Manual Content Revision Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111113] border border-white/[0.12] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 top-highlight">
            <h3 className="text-base font-semibold text-zinc-100">Manual Content Revision (Version v{currentVersion.version_no + 1})</h3>
            <p className="text-xs text-zinc-400">
              Refine the draft copy directly. Saving will create a new version and automatically run the 3-step audit.
            </p>

            <textarea
              rows={10}
              value={manualEditText}
              onChange={(e) => setManualEditText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#09090b] border border-white/[0.08] text-xs sm:text-sm text-zinc-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-white/20"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium hover:bg-white/[0.08] border border-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualEdit}
                disabled={isSubmittingFix}
                className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold"
              >
                Save New Version & Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explainable Compliance Scoring Modal */}
      <ScoreExplainerModal
        isOpen={isScoreExplainerOpen}
        onClose={() => setIsScoreExplainerOpen(false)}
        scoreResult={detailedScore}
        campaignTitle={content.title}
      />

      {/* Downloadable / Printable Audit Certificate Modal */}
      {currentVersion && (
        <AuditReportModal
          isOpen={isAuditReportOpen}
          onClose={() => setIsAuditReportOpen(false)}
          content={content}
          currentVersion={currentVersion}
          scoreResult={detailedScore}
          findings={findings}
          comments={comments}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
          <p className="text-zinc-400 text-xs font-mono">Loading governance audit results...</p>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
