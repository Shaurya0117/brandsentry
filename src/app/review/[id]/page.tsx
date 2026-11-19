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
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
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
          acceptedFindingId: finding.id,
          actor: userName,
          role,
          actionDescription: `Accepted suggested fix for [${finding.source_code}]: "${finding.quoted_span}" -> "${finding.suggested_fix}"`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to apply fix');
      }

      toast('Fix accepted! Created revised version.', 'success');
      await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error applying fix', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Accept ALL Open Deterministic / High-Confidence Fixes at once
  const handleAcceptAllRuleFixes = async () => {
    if (!canReviseContent) {
      toast('Creator or Admin role required to revise content.', 'warning');
      return;
    }
    if (!currentVersion) return;

    const applicable = openFindings.filter((f) => f.suggested_fix && f.suggested_fix.trim() && f.quoted_span && !f.quoted_span.startsWith('['));
    if (applicable.length === 0) {
      toast('No direct text fixes available to apply automatically.', 'info');
      return;
    }

    setIsSubmittingFix(true);
    try {
      let updatedBody = currentVersion.body;
      let count = 0;

      for (const finding of applicable) {
        if (updatedBody.includes(finding.quoted_span)) {
          updatedBody = updatedBody.replace(finding.quoted_span, finding.suggested_fix);
          count++;
        } else {
          const regex = new RegExp(finding.quoted_span.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (regex.test(updatedBody)) {
            updatedBody = updatedBody.replace(regex, finding.suggested_fix);
            count++;
          }
        }
      }

      const res = await fetch(`/api/content/${id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newBody: updatedBody,
          actor: userName,
          role,
          actionDescription: `Batch-accepted ${count} governance rule fixes at once.`,
        }),
      });

      if (!res.ok) throw new Error('Failed to batch accept fixes');

      toast(`Batch accepted ${count} fixes! Created Version ${currentVersion.version_no + 1}.`, 'success');
      await fetchContentDetails();
    } catch (e: any) {
      toast(e.message || 'Error batch-accepting fixes', 'error');
    } finally {
      setIsSubmittingFix(false);
    }
  };

  // Handle Reject Fix
  const handleRejectFix = async (finding: Finding) => {
    try {
      const res = await fetch(`/api/content/${id}/findings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingId: finding.id,
          status: 'rejected',
          actor: userName,
          role,
          explanation: 'Creator rejected suggested governance revision.',
        }),
      });

      if (!res.ok) throw new Error('Failed to update finding status');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto" />
        <p className="text-slate-400 text-sm">Loading governance audit results...</p>
      </div>
    );
  }

  if (!content || !currentVersion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Content item not found</h2>
        <Link href="/create" className="text-cyan-400 underline text-sm">Return to Create</Link>
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
        high: isSelected ? 'bg-rose-500/50 text-rose-100 ring-2 ring-rose-400 shadow-md' : 'bg-rose-950/70 text-rose-200 border-b-2 border-rose-500',
        medium: isSelected ? 'bg-amber-500/50 text-amber-100 ring-2 ring-amber-400 shadow-md' : 'bg-amber-950/70 text-amber-200 border-b-2 border-amber-500',
        low: isSelected ? 'bg-blue-500/50 text-blue-100 ring-2 ring-blue-400 shadow-md' : 'bg-blue-950/70 text-blue-200 border-b-2 border-blue-500',
      }[m.finding.severity];

      segments.push(
        <mark
          key={`highlight-${m.finding.id}-${i}`}
          onClick={() => {
            setSelectedFindingId(m.finding.id);
            const el = document.getElementById(`finding-${m.finding.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all font-medium ${severityClass}`}
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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-100 text-base leading-relaxed whitespace-pre-wrap font-sans">
        {segments}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Confidential */}
      {content.is_confidential && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Confidential Mode:</strong> External Google Gemini LLM was bypassed. Audit generated strictly using local rule standards.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
            Rule-Based Only
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              {content.channel}
            </span>
            <span className="text-xs text-slate-400">
              Version v{currentVersion.version_no} of {versions.length}
            </span>
            <span className="text-xs text-slate-400">• By {content.created_by}</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {wordCount} words • ~{readingTime} min read
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{content.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            title="Copy current copy to clipboard"
          >
            {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            onClick={() => setIsEditingModalOpen(true)}
            disabled={!canReviseContent}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Manual Edit
          </button>

          <Link
            href={`/history/${content.id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            History ({versions.length})
          </Link>

          {content.status !== 'approved' && (
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmittingApproval || content.status === 'in_review'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all"
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>Interactive Highlight Workbench</span>
              <span className="text-[10px] font-normal text-slate-500">(Click any highlight to jump to finding)</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {openFindings.length} open issue{openFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Highlighted text component */}
          {renderHighlightedContent()}

          {/* Associated Campaign Assets / Contrast Info */}
          {(content.image_url || content.text_color) && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Attached Visual Metadata:</span>
              {content.image_url && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span>Image:</span>
                  <a
                    href={content.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline truncate max-w-sm"
                  >
                    {content.image_url}
                  </a>
                  {content.image_alt ? (
                    <span className="text-emerald-400 font-medium">(Alt: &quot;{content.image_alt}&quot;)</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">(Missing Alt Text - VIS-2)</span>
                  )}
                </div>
              )}
              {content.text_color && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span>Color palette:</span>
                  <span
                    className="px-2 py-0.5 rounded border border-slate-700"
                    style={{ backgroundColor: content.bg_color || '#000', color: content.text_color }}
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
          {/* Findings Header with Category Filters & Batch Action */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Findings ({openFindings.length} Active)
            </span>

            {openFindings.length > 1 && canReviseContent && (
              <button
                onClick={handleAcceptAllRuleFixes}
                disabled={isSubmittingFix}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 text-[11px] font-bold transition-all shadow-sm"
              >
                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Accept All Rule Fixes</span>
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800 text-[10px]">
            {['all', 'terminology', 'claim', 'tone', 'accessibility', 'visual'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-md font-semibold capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredOpenFindings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-emerald-900/40 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">
                {openFindings.length === 0
                  ? 'All Governance Checks Passed!'
                  : `No open ${categoryFilter} findings.`}
              </h3>
              <p className="text-xs text-slate-400">
                {openFindings.length === 0
                  ? `Zero brand violations or factual issues remaining on Version v${currentVersion.version_no}.`
                  : 'Check other category filters above.'}
              </p>
              {content.status !== 'approved' && content.status !== 'in_review' && openFindings.length === 0 && (
                <button
                  onClick={handleSubmitForApproval}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
              {filteredOpenFindings.map((finding) => {
                const isSelected = selectedFindingId === finding.id;

                const severityBadge = {
                  high: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
                  medium: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
                  low: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
                }[finding.severity];

                const isNeedsHumanCheck =
                  finding.status === 'needs_human_check' || finding.confidence < 0.6;

                return (
                  <div
                    key={finding.id}
                    id={`finding-${finding.id}`}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {finding.category}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${severityBadge}`}>
                          {finding.severity.toUpperCase()}
                        </span>

                        {finding.is_ai ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/70">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI-assisted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/70">
                            <Cpu className="w-2.5 h-2.5" />
                            Rule-based
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isNeedsHumanCheck && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            Needs human check
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">
                          {Math.round(finding.confidence * 100)}% conf
                        </span>
                      </div>
                    </div>

                    {/* Cited Source */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400">Cited Standard:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSourceCode(finding.source_code);
                        }}
                        className="font-mono font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                        title="Click to view full guideline or fact definition"
                      >
                        <span>{finding.source_code}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-slate-300 leading-relaxed">{finding.explanation}</p>

                    {/* Suggested Fix Diff */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Suggested Resolution (Intent-Preserving Diff)
                      </span>
                      <DiffViewer
                        original={finding.quoted_span}
                        modified={finding.suggested_fix}
                        mode="split"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectFix(finding);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                      >
                        Reject
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptFix(finding);
                          }}
                          disabled={isSubmittingFix || !canReviseContent}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950"
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

          {/* Resolved Findings Accordion / Summary */}
          {resolvedFindings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800/70 space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">
                Resolved Issues ({resolvedFindings.length})
              </span>
              <div className="space-y-1.5">
                {resolvedFindings.map((rf) => (
                  <div key={rf.id} className="text-xs text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[200px]">{rf.quoted_span}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        rf.status === 'accepted'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4">
            <h3 className="text-lg font-bold text-white">Manual Content Revision (Create New Version)</h3>
            <p className="text-xs text-slate-400">
              Refine the content text directly. Saving will create Version v{currentVersion.version_no + 1} and re-audit it.
            </p>

            <textarea
              rows={10}
              value={manualEditText}
              onChange={(e) => setManualEditText(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualEdit}
                disabled={isSubmittingFix}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading governance audit results...</p>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
