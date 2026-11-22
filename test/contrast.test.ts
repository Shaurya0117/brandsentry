import { describe, it, expect } from 'vitest';
import { calculateContrastRatio, getRelativeLuminance } from '@/lib/contrast';

describe('Color Contrast Utilities - WCAG 2.1 Compliance', () => {
  it('calculates maximum contrast ratio (21:1) between pure black and pure white', () => {
    const result = calculateContrastRatio('#000000', '#ffffff');
    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(21);
    expect(result?.isAccessibleAA).toBe(true);
    expect(result?.isAccessibleAAA).toBe(true);
  });

  it('calculates minimum contrast ratio (1:1) between identical colors', () => {
    const result = calculateContrastRatio('#ffffff', '#ffffff');
    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(1);
    expect(result?.isAccessibleAA).toBe(false);
    expect(result?.isAccessibleAAA).toBe(false);
  });

  it('correctly handles 3-digit hex codes (#fff and #000)', () => {
    const result = calculateContrastRatio('#000', '#fff');
    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(21);
    expect(result?.isAccessibleAA).toBe(true);
  });

  it('correctly determines WCAG AA threshold (4.5:1)', () => {
    // Light gray #a0aec0 on white #ffffff is approximately 2.3:1 -> Fails AA
    const lowContrast = calculateContrastRatio('#a0aec0', '#ffffff');
    expect(lowContrast).not.toBeNull();
    expect(lowContrast!.ratio).toBeLessThan(4.5);
    expect(lowContrast?.isAccessibleAA).toBe(false);

    // Dark charcoal #1a202c on white #ffffff is ~15:1 -> Passes AA and AAA
    const highContrast = calculateContrastRatio('#1a202c', '#ffffff');
    expect(highContrast).not.toBeNull();
    expect(highContrast!.ratio).toBeGreaterThanOrEqual(4.5);
    expect(highContrast?.isAccessibleAA).toBe(true);
  });

  it('returns null gracefully for invalid hex values', () => {
    expect(calculateContrastRatio('not-a-color', '#ffffff')).toBeNull();
    expect(calculateContrastRatio('#12345', '#000000')).toBeNull();
  });

  it('computes relative luminance for known colors', () => {
    const whiteLuminance = getRelativeLuminance('#ffffff');
    const blackLuminance = getRelativeLuminance('#000000');

    expect(whiteLuminance).toBeCloseTo(1.0, 2);
    expect(blackLuminance).toBeCloseTo(0.0, 2);
  });
});
