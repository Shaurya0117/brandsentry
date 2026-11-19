// Color Contrast & WCAG 2.1 Luminance Utilities

export interface ContrastResult {
  ratio: number;
  isAccessibleAA: boolean; // >= 4.5:1
  isAccessibleAAA: boolean; // >= 7.0:1
  textColor: string;
  bgColor: string;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) return null;

  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;

  const rLinear = srgbToLinear(rgb.r);
  const gLinear = srgbToLinear(rgb.g);
  const bLinear = srgbToLinear(rgb.b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

export function calculateContrastRatio(textColorHex: string, bgColorHex: string): ContrastResult | null {
  const l1 = getRelativeLuminance(textColorHex);
  const l2 = getRelativeLuminance(bgColorHex);

  if (l1 === null || l2 === null) return null;

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const roundedRatio = Math.round(ratio * 100) / 100;

  return {
    ratio: roundedRatio,
    isAccessibleAA: roundedRatio >= 4.5,
    isAccessibleAAA: roundedRatio >= 7.0,
    textColor: textColorHex,
    bgColor: bgColorHex,
  };
}
