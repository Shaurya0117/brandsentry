import { describe, it, expect } from 'vitest';
import { runRuleEngine, RuleEngineInput } from '@/lib/rule-engine';
import { Term, Guideline } from '@/lib/types';

describe('Rule Engine - Deterministic Compliance & Guardrails', () => {
  const sampleTerms: Term[] = [
    {
      id: 'term-1',
      banned: 'bulletproof',
      preferred: 'resilient',
      note: 'Avoid militaristic or absolute security claims',
    },
    {
      id: 'term-2',
      banned: 'cheap',
      preferred: 'cost-effective',
      note: 'Premium brand positioning',
    },
  ];

  const sampleGuidelines: Guideline[] = [
    {
      id: 'g-1',
      code: 'CLAIM-1',
      category: 'claim',
      text: 'Do not use unsubstantiated superlatives like #1 or best in class.',
    },
    {
      id: 'g-2',
      code: 'LEGAL-1',
      category: 'claim',
      text: 'Do not promise 100% security or risk-free returns.',
    },
  ];

  it('detects banned brand terms and suggests preferred replacements', () => {
    const input: RuleEngineInput = {
      content: 'Our cloud platform offers bulletproof defense against intrusions.',
      channel: 'web',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
    };

    const findings = runRuleEngine(input);
    const termFinding = findings.find((f) => f.source_code === 'TERM');

    expect(termFinding).toBeDefined();
    expect(termFinding?.quoted_span.toLowerCase()).toBe('bulletproof');
    expect(termFinding?.suggested_fix.toLowerCase()).toBe('resilient');
    expect(termFinding?.category).toBe('terminology');
    expect(termFinding?.verified).toBe(true);
    expect(termFinding?.confidence).toBe(1.0);
    expect(termFinding?.flagged_reason).toContain('bulletproof');
  });

  it('preserves casing when substituting banned terms', () => {
    const input: RuleEngineInput = {
      content: 'BULLETPROOF and Cheap solutions for all enterprises.',
      channel: 'social',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
    };

    const findings = runRuleEngine(input);
    const bulletproofFinding = findings.find((f) => f.quoted_span === 'BULLETPROOF');
    const cheapFinding = findings.find((f) => f.quoted_span === 'Cheap');

    expect(bulletproofFinding?.suggested_fix).toBe('RESILIENT');
    expect(cheapFinding?.suggested_fix).toBe('Cost-effective');
  });

  it('detects absolute legal claims such as 100% secure', () => {
    const input: RuleEngineInput = {
      content: 'Our enterprise vault is 100% secure and guarantees zero downtime.',
      channel: 'press',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
    };

    const findings = runRuleEngine(input);
    const legalFinding = findings.find((f) => f.source_code === 'LEGAL-1');

    expect(legalFinding).toBeDefined();
    expect(legalFinding?.severity).toBe('high');
    expect(legalFinding?.quoted_span.toLowerCase()).toContain('100% secure');
    expect(legalFinding?.verified).toBe(true);
  });

  it('detects unsubstantiated superlative claims like #1 provider', () => {
    const input: RuleEngineInput = {
      content: 'We are the #1 provider of data backup solutions in North America.',
      channel: 'social',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
    };

    const findings = runRuleEngine(input);
    const claimFinding = findings.find((f) => f.source_code === 'CLAIM-1');

    expect(claimFinding).toBeDefined();
    expect(claimFinding?.severity).toBe('high');
    expect(claimFinding?.quoted_span).toBe('#1');
  });

  it('flags visual color contrast failure when contrast ratio is below 4.5:1 (VIS-1)', () => {
    const input: RuleEngineInput = {
      content: 'Announcement banner for our upcoming developer summit.',
      channel: 'web',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
      textColor: '#999999',
      bgColor: '#ffffff', // Gray on white: ~2.8:1, fails WCAG AA
    };

    const findings = runRuleEngine(input);
    const visFinding = findings.find((f) => f.source_code === 'VIS-1');

    expect(visFinding).toBeDefined();
    expect(visFinding?.category).toBe('visual');
    expect(visFinding?.severity).toBe('high');
    expect(visFinding?.explanation).toContain('WCAG AA minimum');
    expect(visFinding?.verified).toBe(true);
  });

  it('passes visual check when contrast ratio satisfies WCAG AA (>= 4.5:1)', () => {
    const input: RuleEngineInput = {
      content: 'Accessible banner copy.',
      channel: 'web',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
      textColor: '#ffffff',
      bgColor: '#09090b', // White on near-black: ~18:1, passes
    };

    const findings = runRuleEngine(input);
    const visFinding = findings.find((f) => f.source_code === 'VIS-1');

    expect(visFinding).toBeUndefined();
  });

  it('flags missing image alt text when image URL is provided without alt attribute (VIS-2)', () => {
    const input: RuleEngineInput = {
      content: 'Social post with promotional product hero graphic.',
      channel: 'social',
      terms: sampleTerms,
      guidelines: sampleGuidelines,
      imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df',
      imageAlt: '', // Missing alt text
    };

    const findings = runRuleEngine(input);
    const vis2Finding = findings.find((f) => f.source_code === 'VIS-2');

    expect(vis2Finding).toBeDefined();
    expect(vis2Finding?.category).toBe('accessibility');
    expect(vis2Finding?.severity).toBe('high');
    expect(vis2Finding?.explanation).toContain('descriptive alternative text');
    expect(vis2Finding?.verified).toBe(true);
  });
});
