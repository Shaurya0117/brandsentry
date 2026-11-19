'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ShieldCheck,
  AlertTriangle,
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
} from 'lucide-react';
import { ContentItem, ContentVersion, Finding, UserRole } from '@/lib/types';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';
import DiffViewer from '@/components/DiffViewer';
import SourceModal from '@/components/SourceModal';

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
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modalSourceCode, setModalSourceCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Manual Edit Modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [manualEditText, setManualEditText] = useState('');
  const [isSubmittingFix, setIsSubmittingFix] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const fetchContentDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/content/${id}`);
      if (!res.ok) throw new Error('Content not found');
      const data = await res.json();
      setContent(data.content);
      setVersions(data.versions);
      setCurrentVersion(data.currentVersion);
      setFindings(data.findings);
      if (data.currentVersion) {
        setManualEditText(data.currentVersion.body);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentDetails();
  }, [id]);

  // Handle Accept Single Fix
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create updated version');
      }

      toast('Fix accepted! New version created and re-audited.', 'success');
      await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error accepting fix', 'error');
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
      const res = await fetch(`/api/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          actor: userName,
          role,
        }),
      });

      if (!res.ok) throw new Error('Failed to reject finding');

      toast('Finding marked as rejected.', 'info');
      await fetchContentDetails();
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

      if (!res.ok) throw new Error('Failed to save manual edit');

      toast('New version saved and audited successfully.', 'success');
      setIsEditingModalOpen(false);
      await fetchContentDetails();
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit for approval');
      }

      toast('Content submitted to Review Queue! Managers and Reviewers can now approve.', 'success');
      await fetchContentDetails();
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
        <p className="text-zinc-500 text-xs">Loading governance audit results...</p>
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

  // Active findings for current version
  const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'needs_human_check');
  const resolvedFindings = findings.filter((f) => f.status === 'accepted' || f.status === 'rejected');

  const filteredOpenFindings = categoryFilter === 'all'
    ? openFindings
    : openFindings.filter((f) => f.category === categoryFilter);

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
      {/* Top Banner: Confidential */}
      {content.is_confidential && (
        <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              <strong>Confidential Mode:</strong> External Google Gemini LLM was bypassed. Audit generated strictly using local rule standards.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-mono text-[10px]">
            Rule-Based Only
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              {content.channel}
            </span>
            <span className="text-xs text-zinc-400">
              Version v{currentVersion.version_no} of {versions.length}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">By {content.created_by}</span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-500 font-mono">
              {wordCount} words • ~{readingTime} min read
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">{content.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors"
            title="Copy current copy to clipboard"
          >
            {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            onClick={() => setIsEditingModalOpen(true)}
            disabled={!canReviseContent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Manual Edit
          </button>

          <Link
            href={`/history/${content.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            History ({versions.length})
          </Link>

          {content.status !== 'approved' && (
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmittingApproval || content.status === 'in_review'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {content.status === 'in_review' ? 'In Review Queue' : 'Submit for Approval'}
            </button>
          )}
        </div>
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
            <span className="text-xs text-zinc-500 font-mono">
              {openFindings.length} open issue{openFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Highlighted text component */}
          {renderHighlightedContent()}

          {/* Associated Campaign Assets / Contrast Info */}
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
        <div className="lg:col-span-5 space-y-3.5">
          {/* Findings Header with Category Filters & Batch Action */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Findings ({openFindings.length} Active)
            </span>

            {openFindings.length > 1 && canReviseContent && (
              <button
                onClick={handleAcceptAllRuleFixes}
                disabled={isSubmittingFix}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-[11px] font-medium transition-all"
              >
                <CheckCheck className="w-3 h-3 text-zinc-400" />
                <span>Accept All Rule Fixes</span>
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1 p-1 bg-[#111113] rounded-lg border border-white/[0.08] text-[10px]">
            {['all', 'terminology', 'claim', 'tone', 'accessibility', 'visual'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredOpenFindings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#111113] border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-100">
                {openFindings.length === 0
                  ? 'All Governance Checks Passed'
                  : `No open ${categoryFilter} findings.`}
              </h3>
              <p className="text-xs text-zinc-400">
                {openFindings.length === 0
                  ? `Zero brand violations or factual issues remaining on Version v${currentVersion.version_no}.`
                  : 'Check other category filters above.'}
              </p>
              {content.status !== 'approved' && content.status !== 'in_review' && openFindings.length === 0 && (
                <button
                  onClick={handleSubmitForApproval}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredOpenFindings.map((finding) => {
                const isSelected = selectedFindingId === finding.id;

                const severityBadge = {
                  high: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
                  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                  low: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
                }[finding.severity];

                const isNeedsHumanCheck =
                  finding.status === 'needs_human_check' || finding.confidence < 0.6;

                return (
                  <div
                    key={finding.id}
                    id={`finding-${finding.id}`}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-[#18181b] border-white/30 shadow-sm ring-1 ring-white/20'
                        : 'bg-[#111113] border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono tracking-wider bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                          {finding.category}
                        </span>

                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${severityBadge}`}>
                          {finding.severity.toUpperCase()}
                        </span>

                        {finding.is_ai ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                            <Sparkles className="w-2.5 h-2.5 text-zinc-400" />
                            AI
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                            <Cpu className="w-2.5 h-2.5 text-zinc-400" />
                            Rule
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isNeedsHumanCheck && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <HelpCircle className="w-2.5 h-2.5" />
                            Human check
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500">
                          {Math.round(finding.confidence * 100)}% conf
                        </span>
                      </div>
                    </div>

                    {/* Cited Source */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 text-[11px]">Standard:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSourceCode(finding.source_code);
                        }}
                        className="font-mono text-xs text-zinc-300 hover:text-white underline flex items-center gap-1 transition-colors"
                        title="Click to view full guideline or fact definition"
                      >
                        <span>{finding.source_code}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{finding.explanation}</p>

                    {/* Suggested Fix Diff */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">
                        Suggested Resolution
                      </span>
                      <DiffViewer
                        original={finding.quoted_span}
                        modified={finding.suggested_fix}
                        mode="split"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectFix(finding);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      >
                        Dismiss
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptFix(finding);
                          }}
                          disabled={isSubmittingFix || !canReviseContent}
                          className="px-3 py-1 rounded-md bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-semibold transition-all shadow-sm"
                        >
                          Accept Fix
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resolved Findings Summary */}
          {resolvedFindings.length > 0 && (
            <div className="p-3 rounded-xl bg-[#111113] border border-white/[0.06] space-y-2">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Resolved Issues ({resolvedFindings.length})
              </span>
              <div className="space-y-1.5">
                {resolvedFindings.map((rf) => (
                  <div key={rf.id} className="text-xs text-zinc-400 flex items-center justify-between">
                    <span className="truncate max-w-[200px] text-zinc-400">{rf.quoted_span}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
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
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto" />
          <p className="text-zinc-500 text-xs">Loading governance audit results...</p>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
