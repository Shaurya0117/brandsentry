// TypeScript Type Definitions for BrandSentry

export type UserRole = 'Admin' | 'Creator' | 'Manager' | 'Reviewer';

export interface UserProfile {
  name: string;
  role: UserRole;
}

export type ContentStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved';

export type FindingCategory = 'tone' | 'terminology' | 'fact' | 'claim' | 'visual' | 'accessibility';

export type FindingSeverity = 'low' | 'medium' | 'high';

export type FindingStatus = 'open' | 'accepted' | 'rejected' | 'needs_human_check';

export interface Guideline {
  id: string;
  code: string; // e.g. "TONE-1", "LEGAL-1", "VIS-1"
  category: string;
  text: string;
  created_at?: string;
  updated_at?: string;
}

export interface Fact {
  id: string;
  code: string; // e.g. "F-12"
  statement: string;
  created_at?: string;
  updated_at?: string;
}

export interface Term {
  id: string;
  preferred: string;
  banned: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  channel: string; // "Instagram post", "Press note", "Email", etc.
  status: ContentStatus;
  created_by: string;
  is_confidential: boolean;
  image_url?: string | null;
  image_alt?: string | null;
  text_color?: string | null;
  bg_color?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_no: number;
  body: string;
  created_at?: string;
}

export interface Finding {
  id: string;
  version_id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  quoted_span: string;
  source_code: string; // Code referencing guideline or fact (e.g. "TONE-1", "F-12", "TERM")
  explanation: string;
  suggested_fix: string;
  confidence: number; // 0.00 to 1.00
  status: FindingStatus;
  is_ai: boolean;
  verified?: boolean; // True if cited source code matches an authoritative guideline or fact
  flagged_reason?: string; // Detailed trigger explanation ("Why this was flagged")
  created_at?: string;
}

export interface Comment {
  id: string;
  content_id: string;
  author: string;
  role: UserRole;
  text: string;
  created_at?: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  content_id?: string | null;
  created_at?: string;
}

export interface ReviewPipelineResult {
  content_id: string;
  version_id: string;
  version_no: number;
  findings: Finding[];
  ai_unavailable?: boolean;
  ai_skipped_confidential?: boolean;
  message?: string;
}

export interface GuidelineHealthItem {
  guideline: Guideline;
  total_triggered: number;
  total_rejected: number;
  rejection_rate: number;
  is_unclear: boolean;
  suggestion: string;
}
