import { Finding, Term, Guideline } from './types';
import { calculateContrastRatio } from './contrast';

export interface RuleEngineInput {
  content: string;
  channel: string;
  terms: Term[];
  guidelines: Guideline[];
  imageUrl?: string | null;
  imageAlt?: string | null;
  textColor?: string | null;
  bgColor?: string | null;
}

// Preserve case formatting when substituting text
function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function runRuleEngine(input: RuleEngineInput): Omit<Finding, 'id' | 'version_id' | 'created_at'>[] {
  const findings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[] = [];
  const { content, terms, guidelines, imageUrl, imageAlt, textColor, bgColor } = input;

  if (!content) return findings;

  const inactiveGuidelineCodes = new Set(
    (guidelines || []).filter((g) => g.is_active === false).map((g) => g.code.trim().toUpperCase())
  );

  // 1. Banned Terms Check with smart case adaptation
  const activeTerms = (terms || []).filter((t) => t.is_active !== false);
  for (const term of activeTerms) {
    if (!term.banned || !term.banned.trim()) continue;

    const bannedPhrase = term.banned.trim();
    const escaped = bannedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const quotedSpan = match[0];
      const suggested = preserveCase(quotedSpan, term.preferred);
      findings.push({
        category: 'terminology',
        severity: 'medium',
        quoted_span: quotedSpan,
        source_code: 'TERM',
        explanation: `Used banned brand terminology "${quotedSpan}". Authorized brand term is "${term.preferred}". ${term.note ? `(${term.note})` : ''}`,
        suggested_fix: suggested,
        confidence: 1.0,
        status: 'open',
        is_ai: false,
        verified: true,
        flagged_reason: `Matched prohibited brand term "${quotedSpan}". Corporate brand dictionary requires "${term.preferred}".`,
      });
    }
  }

  // 2. Comprehensive Absolute & Regulatory Claims Check
  const absoluteClaimPatterns = [
    {
      regex: /\b(100%\s+secure|100%\s+immunity|100%\s+uptime|100%\s+safe|100%\s+risk[- ]free|100%\s+guaranteed)\b/gi,
      category: 'claim' as const,
      severity: 'high' as const,
      source_code: 'LEGAL-1',
      preferred: 'Highly secure enterprise architecture',
      explanation: 'Absolute security/safety guarantees (e.g. "100% secure") violate financial consumer protection standards.',
    },
    {
      regex: /\b(guaranteed\s+returns?|guaranteed\s+yield|guaranteed\s+growth|risk[- ]free\s+returns?|unconditional\s+guarantee)\b/gi,
      category: 'claim' as const,
      severity: 'high' as const,
      source_code: 'LEGAL-1',
      preferred: 'Competitive historical yield',
      explanation: 'Financial returns fluctuate with markets and cannot legally be represented as guaranteed or risk-free.',
    },
    {
      regex: /(?<=^|\s)#1\b|\b(?:number\s+one|no\.\s*1)\b/gi,
      category: 'claim' as const,
      severity: 'high' as const,
      source_code: 'CLAIM-1',
      preferred: 'Leading provider',
      explanation: 'Unsubstantiated numerical superlative "#1" used without citing authorized independent third-party audit data.',
    },
    {
      regex: /\b(best\s+in\s+the\s+world|best\s+in\s+class|world['’]s\s+best|unbeatable|zero\s+risk|foolproof|can['’]t\s+lose)\b/gi,
      category: 'claim' as const,
      severity: 'high' as const,
      source_code: 'CLAIM-1',
      preferred: 'Industry-leading',
      explanation: 'Subjective superlative statement violates fair-advertising policies unless backed by verifiable public citations.',
    },
  ];

  for (const pattern of absoluteClaimPatterns) {
    if (inactiveGuidelineCodes.has(pattern.source_code.toUpperCase())) continue;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const quotedSpan = match[0];
      const exists = findings.some(
        (f) => f.quoted_span.toLowerCase() === quotedSpan.toLowerCase()
      );
      if (!exists) {
        findings.push({
          category: pattern.category,
          severity: pattern.severity,
          quoted_span: quotedSpan,
          source_code: pattern.source_code,
          explanation: pattern.explanation,
          suggested_fix: pattern.preferred,
          confidence: 1.0,
          status: 'open',
          is_ai: false,
          verified: true,
          flagged_reason: `Matched regulatory restriction for pattern "${quotedSpan}". Standard ${pattern.source_code} prohibits unconditional promises or unsubstantiated claims.`,
        });
      }
    }
  }

  // 3. Visual & Media Accessibility Checks
  if (imageUrl && imageUrl.trim() && !inactiveGuidelineCodes.has('VIS-2')) {
    if (!imageAlt || !imageAlt.trim()) {
      findings.push({
        category: 'accessibility',
        severity: 'high',
        quoted_span: '[Uploaded Visual Media / Header Image]',
        source_code: 'VIS-2',
        explanation: 'Campaign visual or banner was provided without descriptive alternative text (alt text) for screen readers.',
        suggested_fix: 'Add concise descriptive alt text explaining the graphic context and purpose.',
        confidence: 1.0,
        status: 'open',
        is_ai: false,
        verified: true,
        flagged_reason: 'Missing alternative text for screen readers. Web accessibility guideline VIS-2 mandates descriptive alt attributes on all non-decorative visual content.',
      });
    }
  }

  // 4. Color Contrast Check (WCAG 2.1 AA)
  if (textColor && bgColor && !inactiveGuidelineCodes.has('VIS-1')) {
    const contrast = calculateContrastRatio(textColor, bgColor);
    if (contrast && !contrast.isAccessibleAA) {
      findings.push({
        category: 'visual',
        severity: 'high',
        quoted_span: `Color scheme: Text ${textColor} on ${bgColor}`,
        source_code: 'VIS-1',
        explanation: `Calculated contrast ratio is ${contrast.ratio}:1, which is below the WCAG AA minimum required ratio of 4.5:1.`,
        suggested_fix: 'Adjust text or background color brightness to achieve at least 4.5:1 contrast.',
        confidence: 1.0,
        status: 'open',
        is_ai: false,
        verified: true,
        flagged_reason: `Calculated contrast ratio is ${contrast.ratio}:1, below WCAG 2.1 AA minimum required ratio of 4.5:1. Guideline VIS-1 requires compliant foreground/background color contrast.`,
      });
    }
  }

  return findings;
}

// Fast live checker for as-you-type feedback
export function quickScanText(text: string, terms: Term[]): { count: number; matches: string[] } {
  if (!text) return { count: 0, matches: [] };
  const matches: string[] = [];

  for (const term of terms) {
    if (!term.banned) continue;
    const escaped = term.banned.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      matches.push(term.banned);
    }
  }

  const claimRegex = /\b(100%\s+secure|guaranteed\s+returns?|#1|best\s+in\s+the\s+world|zero\s+risk)\b/i;
  const claimMatch = text.match(claimRegex);
  if (claimMatch && !matches.includes(claimMatch[0])) {
    matches.push(claimMatch[0]);
  }

  return {
    count: matches.length,
    matches,
  };
}
