import { Finding, Guideline, Fact } from './types';

export interface ValidatorInput {
  content: string;
  ruleFindings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[];
  aiFindings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[];
  guidelines: Guideline[];
  facts: Fact[];
}

export function validateAndMergeFindings(input: ValidatorInput): Omit<Finding, 'id' | 'version_id' | 'created_at'>[] {
  const { content, ruleFindings, aiFindings, guidelines, facts } = input;

  const validGuidelineCodes = new Set(guidelines.map((g) => g.code.trim().toUpperCase()));
  const validFactCodes = new Set(facts.map((f) => f.code.trim().toUpperCase()));
  validGuidelineCodes.add('TERM');
  validGuidelineCodes.add('CLAIM-1');
  validGuidelineCodes.add('LEGAL-1');
  validGuidelineCodes.add('TONE-1');
  validGuidelineCodes.add('VIS-1');
  validGuidelineCodes.add('VIS-2');

  const validatedAiFindings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[] = [];

  for (const finding of aiFindings) {
    const span = finding.quoted_span.trim();
    if (!span) continue;

    // Check if span is in content
    let exactIndex = content.indexOf(span);
    let matchedSpan = span;

    if (exactIndex === -1) {
      // Try case-insensitive substring search
      const lowerContent = content.toLowerCase();
      const lowerSpan = span.toLowerCase();
      const lowerIndex = lowerContent.indexOf(lowerSpan);

      if (lowerIndex !== -1) {
        // Extract the exact case substring from original content
        matchedSpan = content.slice(lowerIndex, lowerIndex + span.length);
        exactIndex = lowerIndex;
      } else {
        // AI invented a span not present in the content - drop finding as hallucinations are invalid
        console.warn(`[BrandSentry Validator] Dropped AI finding - quoted span "${span}" is not in content.`);
        continue;
      }
    }

    // Check source code validation
    const sourceUpper = finding.source_code.trim().toUpperCase();
    const sourceValid = validGuidelineCodes.has(sourceUpper) || validFactCodes.has(sourceUpper);

    let status = finding.status;
    let confidence = finding.confidence;
    const verified = Boolean(sourceValid);

    if (!sourceValid) {
      // If the source code doesn't exist in our knowledge base, downgrade to needs_human_check
      status = 'needs_human_check';
      confidence = Math.min(confidence, 0.55);
    }

    if (confidence < 0.6) {
      status = 'needs_human_check';
    }

    const flaggedReason = finding.flagged_reason || (
      sourceValid
        ? `Flagged by model against authoritative knowledge standard ${sourceUpper}. Confidence score: ${(confidence * 100).toFixed(0)}%.`
        : `Flagged by model, but cited standard ${sourceUpper} is unverified in knowledge base; flagged for human auditor review.`
    );

    validatedAiFindings.push({
      ...finding,
      quoted_span: matchedSpan,
      source_code: sourceUpper,
      confidence,
      status,
      is_ai: true,
      verified,
      flagged_reason: flaggedReason,
    });
  }

  // De-duplicate: Rule findings take precedence on overlapping or identical spans
  const finalFindings: Omit<Finding, 'id' | 'version_id' | 'created_at'>[] = [...ruleFindings];

  for (const aiFinding of validatedAiFindings) {
    const aiSpanLower = aiFinding.quoted_span.toLowerCase();

    // Check if an existing rule finding already covers this exact span or contains it
    const overlaps = finalFindings.some((rf) => {
      const rfSpanLower = rf.quoted_span.toLowerCase();
      return (
        rfSpanLower === aiSpanLower ||
        rfSpanLower.includes(aiSpanLower) ||
        aiSpanLower.includes(rfSpanLower)
      );
    });

    if (!overlaps) {
      finalFindings.push(aiFinding);
    }
  }

  return finalFindings;
}
