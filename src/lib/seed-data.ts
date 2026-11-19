import { Guideline, Fact, Term } from './types';

export const SAMPLE_GUIDELINES: Omit<Guideline, 'id'>[] = [
  {
    code: 'TONE-1',
    category: 'Tone and Voice',
    text: 'Nova Bank maintains a formal, trustworthy, yet approachable friendly tone. Avoid overly casual slang, emojis in official disclosures, hype keywords (e.g., "insane savings", "crazy low fees"), and aggressive sales language.',
  },
  {
    code: 'LEGAL-1',
    category: 'Regulatory & Consumer Protection',
    text: 'All communications must adhere to financial regulations. Never promise guaranteed financial returns, never state zero risk or risk-free investing, and always clearly disclose the underlying terms.',
  },
  {
    code: 'VIS-1',
    category: 'Visual Accessibility',
    text: 'All visual campaign text must maintain a minimum contrast ratio of at least 4.5:1 against the background color in accordance with WCAG 2.1 AA requirements.',
  },
  {
    code: 'VIS-2',
    category: 'Media Accessibility',
    text: 'All uploaded campaign images, infographics, visual headers, and banners must include clear, descriptive alternative (alt) text for assistive technology users.',
  },
  {
    code: 'CLAIM-1',
    category: 'Substantiated Claims',
    text: 'Never use unsubstantiated absolute superlatives such as "#1", "the best in the world", or "unbeatable" without citing an official third-party audit or benchmark study.',
  },
];

export const SAMPLE_FACTS: Omit<Fact, 'id'>[] = [
  {
    code: 'F-12',
    statement: 'NovaPay uses end-to-end encryption with zero-knowledge architecture.',
  },
  {
    code: 'F-14',
    statement: 'Nova Bank deposits are FDIC insured up to $250,000 per depositor via our partner banking network.',
  },
  {
    code: 'F-18',
    statement: 'Nova Bank provides 24/7 dedicated customer concierge support for all tier-1 and premium account holders.',
  },
  {
    code: 'F-22',
    statement: 'NovaPay contactless point-of-sale transactions settle in an average of 1.4 seconds.',
  },
];

export const SAMPLE_TERMS: Omit<Term, 'id'>[] = [
  {
    preferred: 'NovaPay',
    banned: 'Nova Pay',
    note: 'Product name "NovaPay" must always be written as a single camel-cased word without spaces.',
  },
  {
    preferred: 'NovaPay',
    banned: 'novapay',
    note: 'Always capitalize NovaPay appropriately.',
  },
  {
    preferred: 'Highly secure encryption',
    banned: '100% secure',
    note: 'Never claim "100% secure" or complete immunity to cyber threats; absolute guarantees violate financial compliance.',
  },
  {
    preferred: 'Competitive market yield',
    banned: 'guaranteed returns',
    note: 'Investment yields fluctuate with market conditions and cannot legally be represented as guaranteed.',
  },
  {
    preferred: 'Nationally recognized provider',
    banned: '#1',
    note: 'Avoid unverified numeric superlatives like "#1" without authorized third-party rating citations.',
  },
  {
    preferred: 'Top-tier digital banking',
    banned: 'best in the world',
    note: 'Subjective superlatives violate regulatory fair-advertising guidelines.',
  },
  {
    preferred: 'Ultra-low latency',
    banned: 'instantaneous magic',
    note: 'Describe technological capabilities with factual precision rather than magical or exaggerated phrasing.',
  },
];
