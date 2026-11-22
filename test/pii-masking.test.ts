import { describe, it, expect } from 'vitest';
import { maskPII } from '@/lib/ai-judge';

describe('Responsible AI - Client-side PII Masking', () => {
  it('masks standard and corporate email addresses before LLM invocation', () => {
    const text = 'Contact our lead architect at sarah.connor@cyberdyne.systems for technical queries.';
    const result = maskPII(text);

    expect(result.hadMasking).toBe(true);
    expect(result.maskedText).not.toContain('sarah.connor@cyberdyne.systems');
    expect(result.maskedText).toContain('[EMAIL_REDACTED]');
  });

  it('masks multiple telephone numbers across common formats', () => {
    const text = 'Call us at +1-800-555-0199 or direct line 555-234-5678.';
    const result = maskPII(text);

    expect(result.hadMasking).toBe(true);
    expect(result.maskedText).not.toContain('800-555-0199');
    expect(result.maskedText).not.toContain('555-234-5678');
    expect(result.maskedText).toContain('[PHONE_REDACTED]');
  });

  it('leaves clean content unmasked with hadMasking false', () => {
    const text = 'BrandSentry delivers automated brand governance and continuous audit pipelines.';
    const result = maskPII(text);

    expect(result.hadMasking).toBe(false);
    expect(result.maskedText).toBe(text);
  });

  it('preserves surrounding corporate narrative while removing multiple PII entities', () => {
    const text = 'Inquiry from ceo@partner.com or phone 212-555-0144 regarding Q4 press release.';
    const result = maskPII(text);

    expect(result.hadMasking).toBe(true);
    expect(result.maskedText).toContain('Inquiry from [EMAIL_REDACTED] or phone [PHONE_REDACTED] regarding Q4 press release.');
  });
});
