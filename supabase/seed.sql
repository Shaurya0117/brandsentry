-- ==============================================================================
-- BrandSentry: Nova Bank Sample Brand Pack Seed SQL
-- ==============================================================================

-- Clear existing data (optional)
TRUNCATE guidelines, facts, terms RESTART IDENTITY CASCADE;

-- Guidelines
INSERT INTO guidelines (code, category, text) VALUES
('TONE-1', 'Tone and Voice', 'Nova Bank maintains a formal, trustworthy, yet approachable friendly tone. Avoid overly casual slang, hype keywords (e.g. "insane", "crazy low"), and aggressive sales language.'),
('LEGAL-1', 'Regulatory & Claims', 'All statements must comply with financial consumer protection laws. Never guarantee financial returns, never state zero risk, and always include appropriate risk disclosures on yield products.'),
('VIS-1', 'Accessibility (Color Contrast)', 'All visual text content must maintain a minimum contrast ratio of 4.5:1 against its background color to satisfy WCAG 2.1 AA accessibility guidelines.'),
('VIS-2', 'Media Accessibility (Alt Text)', 'Every campaign image, infographic, or product visual must include accurate, descriptive alternative (alt) text for assistive technology users.'),
('CLAIM-1', 'Substantiated Claims', 'Comparative superlatives such as "#1", "the best", or "unbeatable" cannot be used unless explicitly substantiated by a recognized third-party benchmark study cited directly.');

-- Facts
INSERT INTO facts (code, statement) VALUES
('F-12', 'NovaPay uses end-to-end encryption with zero-knowledge architecture.'),
('F-14', 'Nova Bank deposits are FDIC insured up to $250,000 per depositor through our partner banking syndicate.'),
('F-18', 'Nova Bank provides 24/7 dedicated customer concierge support for all premium and tier-1 account holders.'),
('F-22', 'NovaPay contactless transactions are settled within an average of 1.4 seconds across all participating merchant terminals.');

-- Terms (preferred, banned, note)
INSERT INTO terms (preferred, banned, note) VALUES
('NovaPay', 'Nova Pay', 'Product name "NovaPay" must always be written as a single camel-cased word without spaces.'),
('NovaPay', 'nova pay', 'Always capitalize "NovaPay".'),
('Highly secure architecture', '100% secure', 'Never claim 100% security or complete immunity to breaches; no digital financial infrastructure can guarantee absolute invulnerability.'),
('Competitive market returns', 'guaranteed returns', 'Financial returns fluctuate with markets and cannot be legally guaranteed.'),
('Nationally recognized provider', '#1', 'Avoid unverified numeric superlative claims like "#1".'),
('Industry-leading digital banking', 'best in the world', 'Avoid hyperbolic unverified global claims.');
