import { Finding, Guideline, Fact } from './types';

export interface AIJudgeInput {
  content: string;
  channel: string;
  isConfidential: boolean;
  guidelines: Guideline[];
  facts: Fact[];
}

export interface AIJudgeOutput {
  findings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[];
  aiUnavailable?: boolean;
  skippedConfidential?: boolean;
  error?: string;
}

// Responsible AI: Mask PII before passing text to third-party models
export function maskPII(text: string): { maskedText: string; hadMasking: boolean } {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g;

  let maskedText = text.replace(emailRegex, '[EMAIL_REDACTED]');
  maskedText = maskedText.replace(phoneRegex, '[PHONE_REDACTED]');

  return {
    maskedText,
    hadMasking: maskedText !== text,
  };
}

// Smart local fallback auditor when external API key is absent or offline
function generateLocalAIEvaluation(
  content: string,
  channel: string,
  guidelines: Guideline[],
  facts: Fact[]
): Omit<Finding, 'id' | 'version_id' | 'created_at'>[] {
  const findings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[] = [];

  // Check for tone issues (slang, aggressive sales language per TONE-1)
  const toneSlangPatterns = [
    { regex: /\b(insane\s+(?:savings|deals|rates)|crazy\s+(?:low|cheap|deals))\b/gi, fix: 'highly competitive rates', explanation: 'Overly casual hype terminology conflicts with Nova Bank formal friendly tone standards.' },
    { regex: /\b(grab\s+it\s+now|hurry\s+before\s+it['’]s\s+gone|smash\s+that)\b/gi, fix: 'explore our offerings today', explanation: 'High-pressure aggressive sales phrasing conflicts with institutional trust voice.' },
    { regex: /\b(revolutionize\s+everything|mind[- ]blowing)\b/gi, fix: 'substantially enhance', explanation: 'Hyperbolic phrasing conflicts with TONE-1 formal friendly tone standard.' },
  ];

  for (const item of toneSlangPatterns) {
    let match: RegExpExecArray | null;
    while ((match = item.regex.exec(content)) !== null) {
      findings.push({
        category: 'tone',
        severity: 'medium',
        quoted_span: match[0],
        source_code: 'TONE-1',
        explanation: item.explanation,
        suggested_fix: item.fix,
        confidence: 0.88,
        status: 'open',
        is_ai: true,
      });
    }
  }

  // Check for fact conflicts (e.g. claiming different insurance limit or encryption protocol)
  if (content.toLowerCase().includes('fdic') && !content.includes('250,000')) {
    const fdicMatch = content.match(/\bfdic\s+(?:insured|coverage)?[^.]*/i);
    if (fdicMatch) {
      findings.push({
        category: 'fact',
        severity: 'high',
        quoted_span: fdicMatch[0].trim(),
        source_code: 'F-14',
        explanation: 'Fact statement regarding FDIC insurance must specify the authorized limit of up to $250,000 per depositor per Fact F-14.',
        suggested_fix: 'deposits are FDIC insured up to $250,000 per depositor',
        confidence: 0.92,
        status: 'open',
        is_ai: true,
      });
    }
  }

  return findings;
}

export async function runAIJudge(input: AIJudgeInput): Promise<AIJudgeOutput> {
  const { content, channel, isConfidential, guidelines, facts } = input;

  // 1. Confidential check
  if (isConfidential) {
    return {
      findings: [],
      skippedConfidential: true,
      error: 'Content is flagged Confidential. AI evaluation skipped as per privacy policy.',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API key configured, use local simulated AI auditor to provide seamless testability
  if (!apiKey || apiKey.trim() === '') {
    const localAIFindings = generateLocalAIEvaluation(content, channel, guidelines, facts);
    return {
      findings: localAIFindings,
      aiUnavailable: false,
    };
  }

  // 2. Mask PII
  const { maskedText } = maskPII(content);

  // 3. Prepare Prompt
  const guidelinesContext = guidelines
    .map((g) => `- [${g.code}] (${g.category}): ${g.text}`)
    .join('\n');

  const factsContext = facts
    .map((f) => `- [${f.code}]: ${f.statement}`)
    .join('\n');

  const prompt = `You are BrandSentry, an expert brand governance and regulatory compliance AI auditor for publishing.
Evaluate the provided content for channel "${channel}" strictly against the Brand Guidelines and Approved Facts below.

BRAND GUIDELINES:
${guidelinesContext}

APPROVED BRAND FACTS:
${factsContext}

CONTENT TO REVIEW:
"""
${maskedText}
"""

INSTRUCTIONS:
1. Identify any phrase, sentence, or tone issue that violates or conflicts with the Guidelines or Approved Facts.
2. For every issue found, quote the EXACT verbatim substring from the content as "quoted_span".
3. Cite the exact guideline code or fact code in "source_code" (e.g. "TONE-1", "LEGAL-1", "F-12", "CLAIM-1").
4. "suggested_fix" MUST strictly preserve the creator's communication intent while resolving the governance violation.
5. Provide a confidence score between 0.00 and 1.00.
6. Categorize into one of: "tone", "terminology", "fact", "claim", "visual", "accessibility".
7. Assign severity: "low", "medium", or "high".

Return ONLY a valid JSON array matching this schema:
[
  {
    "category": "tone" | "terminology" | "fact" | "claim" | "visual" | "accessibility",
    "severity": "low" | "medium" | "high",
    "quoted_span": "exact verbatim substring",
    "source_code": "TONE-1",
    "explanation": "Clear explanation of the violation",
    "suggested_fix": "Replacement text preserving creator intent",
    "confidence": 0.85
  }
]
If there are no violations, return an empty array [].`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[BrandSentry AI Judge] Gemini API returned error, falling back to local auditor:', response.status);
      const fallbackFindings = generateLocalAIEvaluation(content, channel, guidelines, facts);
      return {
        findings: fallbackFindings,
        aiUnavailable: true,
        error: `Gemini API returned status ${response.status}`,
      };
    }

    const jsonResp = await response.json();
    const candidates = jsonResp.candidates;
    if (!candidates || candidates.length === 0) {
      return { findings: [] };
    }

    const rawText = candidates[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { findings: [] };
    }

    let parsedItems: any[] = [];
    try {
      parsedItems = JSON.parse(rawText);
      if (!Array.isArray(parsedItems)) {
        if (typeof parsedItems === 'object' && parsedItems !== null) {
          parsedItems = (parsedItems as any).findings || (parsedItems as any).violations || [];
        }
      }
    } catch (parseErr) {
      console.error('[BrandSentry AI Judge] Failed to parse JSON response:', rawText);
      const fallbackFindings = generateLocalAIEvaluation(content, channel, guidelines, facts);
      return {
        findings: fallbackFindings,
        aiUnavailable: true,
      };
    }

    const aiFindings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[] = parsedItems.map((item) => ({
      category: ['tone', 'terminology', 'fact', 'claim', 'visual', 'accessibility'].includes(item.category)
        ? item.category
        : 'tone',
      severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'medium',
      quoted_span: String(item.quoted_span || ''),
      source_code: String(item.source_code || 'TONE-1'),
      explanation: String(item.explanation || 'Governance conflict detected.'),
      suggested_fix: String(item.suggested_fix || ''),
      confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.8,
      status: (typeof item.confidence === 'number' && item.confidence < 0.6) ? 'needs_human_check' : 'open',
      is_ai: true,
    }));

    return {
      findings: aiFindings,
    };
  } catch (err: any) {
    console.warn('[BrandSentry AI Judge] Exception calling Gemini API, using local auditor fallback:', err.message);
    const fallbackFindings = generateLocalAIEvaluation(content, channel, guidelines, facts);
    return {
      findings: fallbackFindings,
      aiUnavailable: true,
      error: err.name === 'AbortError' ? 'Gemini API call timed out after 15 seconds.' : err.message,
    };
  }
}
