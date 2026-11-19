-- ==============================================================================
-- BrandSentry: Pre-Publication Brand Governance Database Schema
-- Compatible with Supabase Postgres
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if re-running
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS findings CASCADE;
DROP TABLE IF EXISTS versions CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS facts CASCADE;
DROP TABLE IF EXISTS guidelines CASCADE;

-- 1. Guidelines Table (code like "TONE-1", category, text)
CREATE TABLE guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Approved Facts Table (code like "F-12", statement)
CREATE TABLE facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    statement TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Terms Table (preferred, banned, note)
CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preferred VARCHAR(255) NOT NULL,
    banned VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Content Items Table (title, channel, status, created_by, flags)
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    channel VARCHAR(100) NOT NULL, -- 'Instagram post', 'Press note', 'Email', etc.
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'in_review', 'changes_requested', 'approved'
    created_by VARCHAR(150) NOT NULL,
    is_confidential BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    image_alt TEXT,
    text_color VARCHAR(30),
    bg_color VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Versions Table (content_id, version_no, body, created_at)
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Findings Table (version_id, category, severity, quoted_span, source_code, explanation, suggested_fix, confidence, status)
CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'tone', 'terminology', 'fact', 'claim', 'visual', 'accessibility'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    quoted_span TEXT NOT NULL,
    source_code VARCHAR(50) NOT NULL,
    explanation TEXT NOT NULL,
    suggested_fix TEXT NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- 'open', 'accepted', 'rejected', 'needs_human_check'
    is_ai BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Comments Table (content_id, author, role, text, created_at)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    author VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Log Table (actor, role, action, content_id, created_at)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action TEXT NOT NULL,
    content_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_versions_content_id ON versions(content_id);
CREATE INDEX idx_findings_version_id ON findings(version_id);
CREATE INDEX idx_comments_content_id ON comments(content_id);
CREATE INDEX idx_audit_content_id ON audit_log(content_id);
CREATE INDEX idx_content_status ON content_items(status);
CREATE INDEX idx_guidelines_code ON guidelines(code);
CREATE INDEX idx_facts_code ON facts(code);

-- Enable Row Level Security (RLS)
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for this service-role / mock-auth environment
-- (In enterprise setups, specific JWT policies can be added)
CREATE POLICY "Public full access guidelines" ON guidelines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access facts" ON facts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access terms" ON terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access content_items" ON content_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access versions" ON versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access findings" ON findings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);
