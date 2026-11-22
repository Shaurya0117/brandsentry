'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Sparkles,
  Shield,
  Eye,
  Lock,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Palette,
  Image as ImageIcon,
  ArrowRight,
  Info,
  Zap,
  Check,
  FileUp,
  X,
  Loader2,
} from 'lucide-react';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';
import { calculateContrastRatio } from '@/lib/contrast';

export default function CreatePage() {
  const router = useRouter();
  const { role, userName } = useRole();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Instagram post');
  const [body, setBody] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#09090b');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Live pre-flight scan state
  const [liveScan, setLiveScan] = useState<{ count: number; matches: string[] }>({ count: 0, matches: [] });

  // Debounced live scan
  useEffect(() => {
    if (!body.trim()) {
      setLiveScan({ count: 0, matches: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/review/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body }),
        });
        if (res.ok) {
          const data = await res.json();
          setLiveScan(data);
        }
      } catch (e) {}
    }, 350);

    return () => clearTimeout(timer);
  }, [body]);

  // Live contrast calculation
  const contrastResult = calculateContrastRatio(textColor, bgColor);

  // Accessible color presets
  const colorPresets = [
    { label: 'Obsidian (AAA)', text: '#ffffff', bg: '#09090b' },
    { label: 'Deep Blue (AA)', text: '#ffffff', bg: '#0284c7' },
    { label: 'Emerald Trust (AA)', text: '#ffffff', bg: '#065f46' },
    { label: 'Low Contrast Hazard', text: '#94a3b8', bg: '#cbd5e1' },
  ];

  // Sample quick-fill templates
  const loadSampleViolationDraft = () => {
    setTitle('NovaPay Global Savings Launch Campaign');
    setChannel('Instagram post');
    setBody(
      `Introducing the revolutionary new Nova Pay digital wallet! Our platform offers 100% secure encrypted accounts with guaranteed returns on every high-yield deposit. Nova Bank is #1 best in the world for rapid payments. Join today or contact our team at support@novabank.com or call +1 800 555 0199 to start saving immediately!`
    );
    setImageUrl('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80');
    setImageAlt(''); // intentionally empty to test VIS-2
    setTextColor('#94a3b8');
    setBgColor('#cbd5e1'); // contrast ~1.5:1 -> triggers VIS-1
    setUploadedFileName(null);
    toast('Loaded test draft with intentional terminology & contrast violations.', 'info');
  };

  const loadCleanDraft = () => {
    setTitle('NovaPay Enterprise Security Architecture Announcement');
    setChannel('Press note');
    setBody(
      `Nova Bank has released NovaPay, featuring verified end-to-end encryption with zero-knowledge architecture. Deposits are FDIC insured up to $250,000 per depositor. Contact our 24/7 dedicated customer concierge support for integration guidance.`
    );
    setImageUrl('https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80');
    setImageAlt('NovaPay digital mobile interface showing zero-knowledge encryption badge');
    setTextColor('#ffffff');
    setBgColor('#0284c7');
    setUploadedFileName(null);
    toast('Loaded compliant draft adhering to all brand guidelines.', 'info');
  };

  // Handle PDF / DOCX file upload
  const handleFileProcess = async (file: File) => {
    if (!file) return;

    // Check size limit: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`, 'error');
      return;
    }

    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.pdf') && !nameLower.endsWith('.docx') && !nameLower.endsWith('.txt')) {
      toast('Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).', 'error');
      return;
    }

    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract text from document.');
      }

      setBody(data.text);
      setUploadedFileName(file.name);

      // Auto-populate title if blank
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const capitalised = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        setTitle(capitalised);
      }

      toast(`Extracted ${data.characterCount.toLocaleString()} characters from "${file.name}"!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Error processing document.', 'error');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast('Content title is required.', 'error');
      return;
    }

    if (!body.trim()) {
      toast('Content body to audit cannot be empty.', 'error');
      return;
    }

    if (body.trim().length > 50000) {
      toast(`Content body exceeds maximum allowed length of 50,000 characters (${body.trim().length} characters).`, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          channel,
          body,
          created_by: userName,
          role,
          is_confidential: isConfidential,
          image_url: imageUrl.trim() || null,
          image_alt: imageAlt.trim() || null,
          text_color: textColor,
          bg_color: bgColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute review pipeline.');
      }

      // Cache locally to guarantee instant recovery across stateless serverless lambdas
      if (typeof window !== 'undefined' && data.content_id) {
        try {
          const cachedItem = {
            content: data.content || {
              id: data.content_id,
              title,
              channel,
              status: 'draft',
              created_by: userName,
              is_confidential: Boolean(isConfidential),
              image_url: imageUrl.trim() || null,
              image_alt: imageAlt.trim() || null,
              text_color: textColor,
              bg_color: bgColor,
              created_at: new Date().toISOString(),
            },
            currentVersion: data.currentVersion || {
              id: data.version_id,
              content_id: data.content_id,
              version_no: 1,
              body,
              created_at: new Date().toISOString(),
            },
            versions: data.versions || [
              {
                id: data.version_id,
                content_id: data.content_id,
                version_no: 1,
                body,
                created_at: new Date().toISOString(),
              },
            ],
            findings: data.findings || [],
            comments: [],
            auditLogs: [],
          };
          localStorage.setItem(`brandsentry_content_${data.content_id}`, JSON.stringify(cachedItem));

          const listStr = localStorage.getItem('brandsentry_items_cache');
          const list = listStr ? JSON.parse(listStr) : [];
          localStorage.setItem(
            'brandsentry_items_cache',
            JSON.stringify([cachedItem.content, ...list.filter((x: any) => x.id !== data.content_id)])
          );
        } catch (e) {
          console.warn('LocalStorage cache write error:', e);
        }
      }

      toast(
        `Audit finished! Identified ${data.findings?.length || 0} findings. Redirecting to review workbench...`,
        'success'
      );

      router.push(`/review/${data.content_id}`);
    } catch (err: any) {
      toast(err.message || 'Error running review.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Step Journey Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
              <PlusCircle className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Step 1 of 3 &bull; Authoring & Pre-Flight
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1 tracking-tight">Submit Content for Review</h1>
          <p className="text-xs text-zinc-400">
            Audit proposed publication copy against brand voice guidelines, verified facts, and WCAG accessibility standards.
          </p>
        </div>

        {/* Quick sample buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSampleViolationDraft}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
          >
            Load Violations Test
          </button>
          <button
            type="button"
            onClick={loadCleanDraft}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
          >
            Load Compliant Draft
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content Form (Left 2 cols) */}
          <div className="md:col-span-2 space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="content-title" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Content Title / Campaign Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="content-title"
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Q4 NovaPay Feature Release Announcement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111113] border border-white/[0.08] text-zinc-100 text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/25"
              />
            </div>

            {/* Channel Selection */}
            <div>
              <label id="channel-group-label" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Publication Channel <span className="text-rose-400">*</span>
              </label>
              <div role="group" aria-labelledby="channel-group-label" className="grid grid-cols-3 gap-2.5">
                {['Instagram post', 'Press note', 'Email'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      channel === ch
                        ? 'bg-zinc-800 text-zinc-100 border-white/25 shadow-sm'
                        : 'bg-[#111113] text-zinc-400 border-white/[0.08] hover:border-white/[0.15] hover:text-zinc-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* PDF / DOCX Document Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              className={`p-4 rounded-xl border border-dashed transition-all text-center space-y-2 ${
                isDragOver
                  ? 'border-blue-400 bg-blue-500/[0.05]'
                  : 'border-white/[0.12] bg-[#111113] hover:border-white/[0.2]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="doc-upload-input"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onFileInputChange}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-zinc-400">
                <FileUp className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-medium text-zinc-200">
                  Import document to audit (PDF or DOCX, max 5MB)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Drag and drop your marketing brochure, policy draft, or release notes here, or browse files.
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting text...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose PDF / DOCX File</span>
                    </>
                  )}
                </button>
                {uploadedFileName && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" />
                    {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Content Body with Live Scan Alert */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="content-body" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Content Body to Audit <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {liveScan.count > 0 && (
                    <span
                      aria-live="polite"
                      className="flex items-center gap-1 text-amber-400 font-medium text-[11px] animate-in fade-in"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      Live check: {liveScan.count} potential hit{liveScan.count > 1 ? 's' : ''} ({liveScan.matches.slice(0, 2).join(', ')})
                    </span>
                  )}
                  <span className="font-mono text-[11px]">{body.length} / 50,000 chars</span>
                </div>
              </div>
              <textarea
                id="content-body"
                required
                rows={8}
                maxLength={50000}
                placeholder="Paste or type proposed publication copy here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#111113] border border-white/[0.08] text-zinc-100 text-xs sm:text-sm leading-relaxed placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/25 font-sans"
              />
            </div>
          </div>

          {/* Media & Visual Accessibility Panel (Right 1 col) */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-3.5 top-highlight">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Visual Accessibility
                </h3>
              </div>

              {/* Image URL / Preview */}
              <div>
                <label htmlFor="image-url-input" className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  id="image-url-input"
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>

              {/* Image Alt Text */}
              <div>
                <label htmlFor="image-alt-input" className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Alt Text (Required if image present)
                </label>
                <input
                  id="image-alt-input"
                  type="text"
                  placeholder="Describe image for screen readers (VIS-2)..."
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                {imageUrl && !imageAlt && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Missing alt text triggers a VIS-2 finding.
                  </span>
                )}
              </div>

              {/* Color Contrast Tester with Preset Palette Chips */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-zinc-400" />
                    Color Contrast (VIS-1)
                  </span>
                  {contrastResult && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        contrastResult.isAccessibleAA
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {contrastResult.ratio}:1 {contrastResult.isAccessibleAA ? 'Pass (AA)' : 'Fail'}
                    </span>
                  )}
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTextColor(preset.text);
                        setBgColor(preset.bg);
                      }}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 border border-white/[0.06] transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="text-color-hex" className="text-[10px] font-mono text-zinc-400 block mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="text-color-picker"
                        type="color"
                        aria-label="Text color picker"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        id="text-color-hex"
                        type="text"
                        aria-label="Text color hex"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full px-2 py-1 bg-[#09090b] border border-white/[0.08] rounded text-[11px] font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bg-color-hex" className="text-[10px] font-mono text-zinc-400 block mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="bg-color-picker"
                        type="color"
                        aria-label="Background color picker"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        id="bg-color-hex"
                        type="text"
                        aria-label="Background color hex"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-full px-2 py-1 bg-[#09090b] border border-white/[0.08] rounded text-[11px] font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Contrast Preview Box */}
                <div
                  className="p-2.5 rounded-lg text-center font-medium text-xs border border-white/[0.1] shadow-inner"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  Live Contrast Preview: Nova Bank
                </div>
              </div>
            </div>

            {/* Authoring Info */}
            <div className="p-3.5 rounded-xl bg-[#111113] border border-white/[0.08] text-xs text-zinc-400 space-y-1">
              <div>Submitting as: <strong className="text-zinc-200">{userName}</strong></div>
              <div>Active role: <strong className="text-zinc-300 font-mono">{role}</strong></div>
            </div>
          </div>
        </div>

        {/* Audit Execution & Privacy Settings - Prominently right above the Run button */}
        <div className="p-5 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-4 top-highlight">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Audit Execution & Privacy Settings
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
              Gemini 2.5 Flash + Rule Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* AI-use notice */}
            <div className="text-xs text-zinc-400 space-y-1">
              <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Responsible AI & Automatic PII Masking</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Phone numbers and email addresses are automatically redacted via regex before sending prompts to Gemini.
                AI suggestions never modify drafts or authorize publication autonomously.
              </p>
            </div>

            {/* Confidential toggle */}
            <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] flex items-start gap-3">
              <input
                id="confidential-checkbox"
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 text-zinc-100 bg-[#09090b] cursor-pointer"
              />
              <label htmlFor="confidential-checkbox" className="text-xs cursor-pointer select-none">
                <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Mark Content Confidential
                </span>
                <p className="text-zinc-400 mt-0.5 text-[11px] leading-relaxed">
                  Bypasses all external Google Gemini LLM API calls. Executes strictly with the local deterministic rule engine.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-zinc-950" />
                <span>Executing 3-Step Audit Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Review Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
