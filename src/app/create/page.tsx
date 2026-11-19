'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useRole } from '@/lib/context/role-context';
import { useToast } from '@/components/Toast';
import { calculateContrastRatio } from '@/lib/contrast';

export default function CreatePage() {
  const router = useRouter();
  const { role, userName } = useRole();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Instagram post');
  const [body, setBody] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { label: 'Nova Dark (AAA)', text: '#ffffff', bg: '#020617' },
    { label: 'Nova Blue (AA)', text: '#ffffff', bg: '#0284c7' },
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
    toast('Loaded compliant draft adhering to all brand guidelines.', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      toast('Title and content body are required.', 'error');
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

      toast(
        `Audit finished! Identified ${data.findings.length} findings. Redirecting to review workbench...`,
        'success'
      );

      router.push(`/review/${data.content_id}`);
    } catch (err: any) {
      toast(err.message || 'Error running review.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              <PlusCircle className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
              Pre-Publication Authoring & Audit
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Submit Content for Review</h1>
          <p className="text-sm text-slate-400">
            Audit copy against brand guidelines, verified facts, terminology restrictions, and visual contrast.
          </p>
        </div>

        {/* Quick sample buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSampleViolationDraft}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            Load Test Draft (Violations)
          </button>
          <button
            type="button"
            onClick={loadCleanDraft}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            Load Compliant Draft
          </button>
        </div>
      </div>

      {/* Responsible AI Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 border border-cyan-800/50 shadow-sm flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <span>Responsible AI Disclosure & Privacy Guarantee</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-900 text-cyan-200 border border-cyan-700">
              Gemini 2.5 Flash
            </span>
          </div>
          <p className="leading-relaxed">
            AI (Google Gemini) is used to review content. Mark content <strong className="text-cyan-300">Confidential</strong> to skip AI and use rule-based checks only.
            Before any prompt is transmitted to Gemini, emails and phone numbers are automatically redacted using client-safe regex masking.
            AI suggestions never modify content or approve publication automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content Form (Left 2 cols) */}
          <div className="md:col-span-2 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Content Title / Campaign Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 NovaPay Feature Release Announcement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              />
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Publication Channel <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Instagram post', 'Press note', 'Email'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      channel === ch
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-950'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Body with Live Scan Alert */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Content Body to Audit <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {liveScan.count > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold animate-in fade-in">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      Live check: {liveScan.count} potential rule hit{liveScan.count > 1 ? 's' : ''} ({liveScan.matches.slice(0, 2).join(', ')})
                    </span>
                  )}
                  <span>{body.length} characters</span>
                </div>
              </div>
              <textarea
                required
                rows={8}
                placeholder="Paste the proposed publication text here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm leading-relaxed placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-sans"
              />
            </div>

            {/* Confidentiality Toggle */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <input
                id="confidential-checkbox"
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-950 cursor-pointer"
              />
              <label htmlFor="confidential-checkbox" className="text-xs cursor-pointer select-none">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Mark content Confidential
                </span>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Skips all external Google Gemini LLM API calls. Review pipeline will execute strictly using the local rule engine (banned terminology, absolute claims regex, and accessibility contrast standards).
                </p>
              </label>
            </div>
          </div>

          {/* Media & Visual Accessibility Panel (Right 1 col) */}
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Visual Media & Accessibility
                </h3>
              </div>

              {/* Image URL / Preview */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Image Alt Text */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Image Alt Text (Required if image provided)
                </label>
                <input
                  type="text"
                  placeholder="Describe image for screen readers (VIS-2)..."
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                {imageUrl && !imageAlt && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Missing alt text will trigger a VIS-2 accessibility finding.
                  </span>
                )}
              </div>

              {/* Color Contrast Tester with Preset Palette Chips */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    Color Contrast (VIS-1)
                  </span>
                  {contrastResult && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        contrastResult.isAccessibleAA
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
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
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 border border-slate-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Contrast Preview Box */}
                <div
                  className="p-3 rounded-lg text-center font-semibold text-xs border border-slate-700 shadow-inner"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  Live Contrast Preview: Nova Bank Copy
                </div>
              </div>
            </div>

            {/* Authoring Info */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div>Submitting as: <strong className="text-slate-200">{userName}</strong></div>
              <div>Active role: <strong className="text-cyan-400">{role}</strong></div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950" />
                <span>Executing 3-Step Audit Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Review Pipeline</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
