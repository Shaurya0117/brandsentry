import { describe, it, expect } from 'vitest';
import { validateAndMergeFindings, ValidatorInput } from '@/lib/validator';
import { Finding, Guideline, Fact } from '@/lib/types';

describe('Validator - Knowledge Cross-Check & Anti-Hallucination Gate', () => {
  const sampleGuidelines: Guideline[] = [
    {
      id: 'g-1',
      code: 'TONE-1',
      category: 'tone',
      text: 'Maintain an empowering, respectful tone; avoid aggressive jargon.',
    },
    {
      id: 'g-2',
      code: 'CLAIM-1',
      category: 'claim',
      text: 'Do not use unsubstantiated superlatives.',
    },
  ];

  const sampleFacts: Fact[] = [
    {
      id: 'f-1',
      code: 'FACT-1',
      statement: 'Antigravity latency is 12ms',
    },
  ];

  it('drops hallucinated AI findings whose quoted_span does not exist in the source content', () => {
    const content = 'BrandSentry helps marketing teams publish with confidence.';
    const input: ValidatorInput = {
      content,
      ruleFindings: [],
      aiFindings: [
        {
          category: 'claim',
          severity: 'high',
          quoted_span: 'this phrase never appears anywhere in the draft',
          source_code: 'CLAIM-1',
          explanation: 'AI invented a nonexistent phrase.',
          suggested_fix: 'None',
          confidence: 0.9,
          status: 'open',
          is_ai: true,
        },
      ],
      guidelines: sampleGuidelines,
      facts: sampleFacts,
    };

    const results = validateAndMergeFindings(input);
    expect(results).toHaveLength(0);
  });

  it('preserves valid AI findings where quoted_span exists in the content', () => {
    const content = 'BrandSentry offers aggressive sales tactics for enterprise scaling.';
    const input: ValidatorInput = {
      content,
      ruleFindings: [],
      aiFindings: [
        {
          category: 'tone',
          severity: 'medium',
          quoted_span: 'aggressive sales tactics',
          source_code: 'TONE-1',
          explanation: 'Violates our respectful tone guidelines.',
          suggested_fix: 'proactive client outreach',
          confidence: 0.88,
          status: 'open',
          is_ai: true,
        },
      ],
      guidelines: sampleGuidelines,
      facts: sampleFacts,
    };

    const results = validateAndMergeFindings(input);
    expect(results).toHaveLength(1);
    expect(results[0].quoted_span).toBe('aggressive sales tactics');
    expect(results[0].verified).toBe(true);
    expect(results[0].status).toBe('open');
  });

  it('downgrades unverified source codes to needs_human_check (<0.6 confidence)', () => {
    const content = 'Our latency is sub-zero instantaneously across the globe.';
    const input: ValidatorInput = {
      content,
      ruleFindings: [],
      aiFindings: [
        {
          category: 'claim',
          severity: 'high',
          quoted_span: 'sub-zero instantaneously',
          source_code: 'UNKNOWN-RULE-999', // Not in KB guidelines or facts
          explanation: 'Physical impossibility without verification.',
          suggested_fix: 'under 15ms globally',
          confidence: 0.92,
          status: 'open',
          is_ai: true,
        },
      ],
      guidelines: sampleGuidelines,
      facts: sampleFacts,
    };

    const results = validateAndMergeFindings(input);
    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(false);
    expect(results[0].status).toBe('needs_human_check');
    expect(results[0].confidence).toBeLessThanOrEqual(0.55);
    expect(results[0].flagged_reason).toContain('unverified in knowledge base');
  });

  it('deduplicates AI findings that overlap with deterministic rule findings', () => {
    const content = 'Our software is 100% secure against attacks.';

    // Deterministic rule finding from rule-engine
    const ruleFinding: Omit<Finding, 'id' | 'version_id' | 'created_at'> = {
      category: 'claim',
      severity: 'high',
      quoted_span: '100% secure',
      source_code: 'LEGAL-1',
      explanation: 'Absolute guarantee is prohibited.',
      suggested_fix: 'highly resilient',
      confidence: 1.0,
      status: 'open',
      is_ai: false,
      verified: true,
    };

    // AI finding that flags the same span or part of it
    const aiFinding: Omit<Finding, 'id' | 'version_id' | 'created_at'> = {
      category: 'claim',
      severity: 'high',
      quoted_span: '100% secure against attacks',
      source_code: 'CLAIM-1',
      explanation: 'AI also flagged this security claim.',
      suggested_fix: 'robust against attacks',
      confidence: 0.85,
      status: 'open',
      is_ai: true,
    };

    const input: ValidatorInput = {
      content,
      ruleFindings: [ruleFinding],
      aiFindings: [aiFinding],
      guidelines: sampleGuidelines,
      facts: sampleFacts,
    };

    const results = validateAndMergeFindings(input);
    // Should keep only the rule engine's finding
    expect(results).toHaveLength(1);
    expect(results[0].is_ai).toBe(false);
    expect(results[0].source_code).toBe('LEGAL-1');
  });
});
