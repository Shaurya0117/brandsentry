import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  Guideline,
  Fact,
  Term,
  ContentItem,
  ContentVersion,
  Finding,
  Comment,
  AuditLogEntry,
  ContentStatus,
  FindingStatus,
  UserRole,
} from './types';
import {
  SAMPLE_GUIDELINES,
  SAMPLE_FACTS,
  SAMPLE_TERMS,
  SAMPLE_CONTENT_ITEMS,
  SAMPLE_VERSIONS,
  SAMPLE_FINDINGS,
  SAMPLE_COMMENTS,
  SAMPLE_AUDIT_LOGS,
} from './seed-data';

// Determine if real Supabase environment variables are provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-supabase')
);

let supabaseInstance: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn('[BrandSentry DB] Failed to init Supabase client, using local store fallback:', err);
    supabaseInstance = null;
  }
}

// Fallback Store for zero-setup execution & testing
interface LocalStore {
  guidelines: Guideline[];
  facts: Fact[];
  terms: Term[];
  content_items: ContentItem[];
  versions: ContentVersion[];
  findings: Finding[];
  comments: Comment[];
  audit_log: AuditLogEntry[];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const PRIMARY_STORE_FILE = IS_SERVERLESS
  ? '/tmp/brandsentry_store.json'
  : path.join(process.cwd(), 'data', 'store.json');
const FALLBACK_STORE_FILE = '/tmp/brandsentry_store.json';

function initDefaultStore(): LocalStore {
  const defaultGuidelines: Guideline[] = SAMPLE_GUIDELINES.map((g, idx) => ({
    ...g,
    id: `g-${idx + 1}`,
    created_at: new Date().toISOString(),
  }));

  const defaultFacts: Fact[] = SAMPLE_FACTS.map((f, idx) => ({
    ...f,
    id: `f-${idx + 1}`,
    created_at: new Date().toISOString(),
  }));

  const defaultTerms: Term[] = SAMPLE_TERMS.map((t, idx) => ({
    ...t,
    id: `t-${idx + 1}`,
    created_at: new Date().toISOString(),
  }));

  return {
    guidelines: defaultGuidelines,
    facts: defaultFacts,
    terms: defaultTerms,
    content_items: [...SAMPLE_CONTENT_ITEMS],
    versions: [...SAMPLE_VERSIONS],
    findings: [...SAMPLE_FINDINGS],
    comments: [...SAMPLE_COMMENTS],
    audit_log: [
      {
        id: generateId(),
        actor: 'System',
        role: 'Admin',
        action: 'System initialized with default Nova Bank brand pack and sample campaigns.',
        created_at: new Date().toISOString(),
      },
      ...SAMPLE_AUDIT_LOGS,
    ],
  };
}

let inMemoryStore: LocalStore | null = null;

function getStore(): LocalStore {
  let store: LocalStore | null = null;
  try {
    if (fs.existsSync(PRIMARY_STORE_FILE)) {
      const data = fs.readFileSync(PRIMARY_STORE_FILE, 'utf-8');
      store = JSON.parse(data);
    }
  } catch (e) {}

  if (!store) {
    try {
      if (fs.existsSync(FALLBACK_STORE_FILE)) {
        const data = fs.readFileSync(FALLBACK_STORE_FILE, 'utf-8');
        store = JSON.parse(data);
      }
    } catch (e) {}
  }

  if (!store) {
    store = inMemoryStore || initDefaultStore();
  }

  if (!store.content_items || store.content_items.length === 0) {
    store.content_items = [...SAMPLE_CONTENT_ITEMS];
    store.versions = [...(store.versions || []), ...SAMPLE_VERSIONS];
    store.findings = [...(store.findings || []), ...SAMPLE_FINDINGS];
    store.comments = [...(store.comments || []), ...SAMPLE_COMMENTS];
    store.audit_log = [...(store.audit_log || []), ...SAMPLE_AUDIT_LOGS];
    saveStore(store);
  } else {
    inMemoryStore = store;
  }

  return store;
}

function saveStore(store: LocalStore) {
  inMemoryStore = store;
  const json = JSON.stringify(store, null, 2);
  try {
    const dir = path.dirname(PRIMARY_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRIMARY_STORE_FILE, json, 'utf-8');
  } catch (e) {}

  try {
    fs.writeFileSync(FALLBACK_STORE_FILE, json, 'utf-8');
  } catch (e) {}
}

// ==============================================================================
// Guidelines DAO
// ==============================================================================

export async function getGuidelines(): Promise<Guideline[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('guidelines')
        .select('*')
        .order('code', { ascending: true });
      if (!error && data) return data as Guideline[];
    } catch (e) {
      console.warn('[BrandSentry DB] Falling back to local store for guidelines:', e);
    }
  }
  const store = getStore();
  return [...store.guidelines];
}

export async function getGuidelineByCode(code: string): Promise<Guideline | null> {
  const all = await getGuidelines();
  return all.find((g) => g.code.trim().toUpperCase() === code.trim().toUpperCase()) || null;
}

export async function createGuideline(item: Omit<Guideline, 'id' | 'created_at' | 'updated_at'>): Promise<Guideline> {
  const newItem: Guideline = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('guidelines')
        .insert([newItem])
        .select()
        .single();
      if (!error && data) return data as Guideline;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on insert guideline:', e);
    }
  }

  const store = getStore();
  store.guidelines.push(newItem);
  saveStore(store);
  return newItem;
}

export async function updateGuideline(id: string, updates: Partial<Guideline>): Promise<Guideline | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('guidelines')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Guideline;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on update guideline:', e);
    }
  }

  const store = getStore();
  const idx = store.guidelines.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  store.guidelines[idx] = { ...store.guidelines[idx], ...updates, updated_at: new Date().toISOString() };
  saveStore(store);
  return store.guidelines[idx];
}

export async function deleteGuideline(id: string): Promise<boolean> {
  if (supabaseInstance) {
    try {
      const { error } = await supabaseInstance.from('guidelines').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on delete guideline:', e);
    }
  }

  const store = getStore();
  const initialLen = store.guidelines.length;
  store.guidelines = store.guidelines.filter((g) => g.id !== id);
  saveStore(store);
  return store.guidelines.length < initialLen;
}

// ==============================================================================
// Facts DAO
// ==============================================================================

export async function getFacts(): Promise<Fact[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('facts')
        .select('*')
        .order('code', { ascending: true });
      if (!error && data) return data as Fact[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback for facts:', e);
    }
  }
  const store = getStore();
  return [...store.facts];
}

export async function getFactByCode(code: string): Promise<Fact | null> {
  const all = await getFacts();
  return all.find((f) => f.code.trim().toUpperCase() === code.trim().toUpperCase()) || null;
}

export async function createFact(item: Omit<Fact, 'id' | 'created_at' | 'updated_at'>): Promise<Fact> {
  const newItem: Fact = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('facts')
        .insert([newItem])
        .select()
        .single();
      if (!error && data) return data as Fact;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on insert fact:', e);
    }
  }

  const store = getStore();
  store.facts.push(newItem);
  saveStore(store);
  return newItem;
}

export async function updateFact(id: string, updates: Partial<Fact>): Promise<Fact | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('facts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Fact;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on update fact:', e);
    }
  }

  const store = getStore();
  const idx = store.facts.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  store.facts[idx] = { ...store.facts[idx], ...updates, updated_at: new Date().toISOString() };
  saveStore(store);
  return store.facts[idx];
}

export async function deleteFact(id: string): Promise<boolean> {
  if (supabaseInstance) {
    try {
      const { error } = await supabaseInstance.from('facts').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on delete fact:', e);
    }
  }

  const store = getStore();
  const initialLen = store.facts.length;
  store.facts = store.facts.filter((f) => f.id !== id);
  saveStore(store);
  return store.facts.length < initialLen;
}

// ==============================================================================
// Terms DAO
// ==============================================================================

export async function getTerms(): Promise<Term[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('terms')
        .select('*')
        .order('banned', { ascending: true });
      if (!error && data) return data as Term[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback for terms:', e);
    }
  }
  const store = getStore();
  return [...store.terms];
}

export async function createTerm(item: Omit<Term, 'id' | 'created_at' | 'updated_at'>): Promise<Term> {
  const newItem: Term = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('terms')
        .insert([newItem])
        .select()
        .single();
      if (!error && data) return data as Term;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on insert term:', e);
    }
  }

  const store = getStore();
  store.terms.push(newItem);
  saveStore(store);
  return newItem;
}

export async function updateTerm(id: string, updates: Partial<Term>): Promise<Term | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('terms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Term;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on update term:', e);
    }
  }

  const store = getStore();
  const idx = store.terms.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  store.terms[idx] = { ...store.terms[idx], ...updates, updated_at: new Date().toISOString() };
  saveStore(store);
  return store.terms[idx];
}

export async function deleteTerm(id: string): Promise<boolean> {
  if (supabaseInstance) {
    try {
      const { error } = await supabaseInstance.from('terms').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on delete term:', e);
    }
  }

  const store = getStore();
  const initialLen = store.terms.length;
  store.terms = store.terms.filter((t) => t.id !== id);
  saveStore(store);
  return store.terms.length < initialLen;
}

// ==============================================================================
// Seed Brand Pack DAO
// ==============================================================================

export async function seedBrandPack(): Promise<{ guidelines: number; facts: number; terms: number }> {
  if (supabaseInstance) {
    try {
      await supabaseInstance.from('guidelines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseInstance.from('facts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseInstance.from('terms').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await supabaseInstance.from('guidelines').insert(SAMPLE_GUIDELINES);
      await supabaseInstance.from('facts').insert(SAMPLE_FACTS);
      await supabaseInstance.from('terms').insert(SAMPLE_TERMS);

      await addAuditLog({
        actor: 'Admin',
        role: 'Admin',
        action: 'Loaded Nova Bank sample brand pack into Supabase knowledge base.',
      });

      return {
        guidelines: SAMPLE_GUIDELINES.length,
        facts: SAMPLE_FACTS.length,
        terms: SAMPLE_TERMS.length,
      };
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on seedBrandPack to local store:', e);
    }
  }

  const store = getStore();
  store.guidelines = SAMPLE_GUIDELINES.map((g, idx) => ({
    ...g,
    id: `g-${Date.now()}-${idx}`,
    created_at: new Date().toISOString(),
  }));

  store.facts = SAMPLE_FACTS.map((f, idx) => ({
    ...f,
    id: `f-${Date.now()}-${idx}`,
    created_at: new Date().toISOString(),
  }));

  store.terms = SAMPLE_TERMS.map((t, idx) => ({
    ...t,
    id: `t-${Date.now()}-${idx}`,
    created_at: new Date().toISOString(),
  }));

  if (store.content_items.length === 0) {
    store.content_items = [...SAMPLE_CONTENT_ITEMS];
    store.versions = [...(store.versions || []), ...SAMPLE_VERSIONS];
    store.findings = [...(store.findings || []), ...SAMPLE_FINDINGS];
    store.comments = [...(store.comments || []), ...SAMPLE_COMMENTS];
    store.audit_log = [...(store.audit_log || []), ...SAMPLE_AUDIT_LOGS];
  }

  saveStore(store);

  await addAuditLog({
    actor: 'Admin',
    role: 'Admin',
    action: 'Loaded Nova Bank sample brand pack into local knowledge base.',
  });

  return {
    guidelines: store.guidelines.length,
    facts: store.facts.length,
    terms: store.terms.length,
  };
}

// ==============================================================================
// Content Items DAO
// ==============================================================================

export async function getContentItems(status?: string): Promise<ContentItem[]> {
  if (supabaseInstance) {
    try {
      let query = supabaseInstance
        .from('content_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (!error && data) return data as ContentItem[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getContentItems:', e);
    }
  }

  const store = getStore();
  let list = [...store.content_items];
  if (status) {
    list = list.filter((item) => item.status === status);
  }
  return list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('content_items')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data as ContentItem;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getContentItem:', e);
    }
  }

  const store = getStore();
  return store.content_items.find((item) => item.id === id) || null;
}

export async function createContentItem(item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<ContentItem> {
  const newItem: ContentItem = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('content_items')
        .insert([newItem])
        .select()
        .single();
      if (!error && data) return data as ContentItem;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on createContentItem:', e);
    }
  }

  const store = getStore();
  store.content_items.unshift(newItem);
  saveStore(store);
  return newItem;
}

export async function updateContentItemStatus(id: string, status: ContentStatus): Promise<ContentItem | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('content_items')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as ContentItem;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on updateContentItemStatus:', e);
    }
  }

  const store = getStore();
  const idx = store.content_items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  store.content_items[idx] = {
    ...store.content_items[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  saveStore(store);
  return store.content_items[idx];
}

// ==============================================================================
// Versions DAO
// ==============================================================================

export async function getVersions(contentId: string): Promise<ContentVersion[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('versions')
        .select('*')
        .eq('content_id', contentId)
        .order('version_no', { ascending: true });
      if (!error && data) return data as ContentVersion[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getVersions:', e);
    }
  }

  const store = getStore();
  return store.versions
    .filter((v) => v.content_id === contentId)
    .sort((a, b) => a.version_no - b.version_no);
}

export async function createVersion(item: Omit<ContentVersion, 'id' | 'created_at'>): Promise<ContentVersion> {
  const newVersion: ContentVersion = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('versions')
        .insert([newVersion])
        .select()
        .single();
      if (!error && data) return data as ContentVersion;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on createVersion:', e);
    }
  }

  const store = getStore();
  store.versions.push(newVersion);
  saveStore(store);
  return newVersion;
}

// ==============================================================================
// Findings DAO
// ==============================================================================

export async function getFindings(versionId: string): Promise<Finding[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('findings')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as Finding[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getFindings:', e);
    }
  }

  const store = getStore();
  return store.findings.filter((f) => f.version_id === versionId);
}

export async function getAllFindings(): Promise<Finding[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance.from('findings').select('*');
      if (!error && data) return data as Finding[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getAllFindings:', e);
    }
  }
  const store = getStore();
  return [...store.findings];
}

export async function saveFindings(findings: Omit<Finding, 'id' | 'created_at'>[]): Promise<Finding[]> {
  const createdFindings: Finding[] = findings.map((f) => ({
    ...f,
    id: generateId(),
    created_at: new Date().toISOString(),
  }));

  if (supabaseInstance && createdFindings.length > 0) {
    try {
      const { data, error } = await supabaseInstance
        .from('findings')
        .insert(createdFindings)
        .select();
      if (!error && data) return data as Finding[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on saveFindings:', e);
    }
  }

  const store = getStore();
  store.findings.push(...createdFindings);
  saveStore(store);
  return createdFindings;
}

export async function updateFindingStatus(id: string, status: FindingStatus): Promise<Finding | null> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('findings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Finding;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on updateFindingStatus:', e);
    }
  }

  const store = getStore();
  const idx = store.findings.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  store.findings[idx] = { ...store.findings[idx], status };
  saveStore(store);
  return store.findings[idx];
}

// ==============================================================================
// Comments DAO
// ==============================================================================

export async function getComments(contentId: string): Promise<Comment[]> {
  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as Comment[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getComments:', e);
    }
  }

  const store = getStore();
  return store.comments
    .filter((c) => c.content_id === contentId)
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
}

export async function addComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> {
  const newComment: Comment = {
    ...comment,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('comments')
        .insert([newComment])
        .select()
        .single();
      if (!error && data) return data as Comment;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on addComment:', e);
    }
  }

  const store = getStore();
  store.comments.push(newComment);
  saveStore(store);
  return newComment;
}

// ==============================================================================
// Audit Log DAO
// ==============================================================================

export async function getAuditLogs(contentId?: string): Promise<AuditLogEntry[]> {
  if (supabaseInstance) {
    try {
      let query = supabaseInstance
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (contentId) {
        query = query.eq('content_id', contentId);
      }
      const { data, error } = await query;
      if (!error && data) return data as AuditLogEntry[];
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on getAuditLogs:', e);
    }
  }

  const store = getStore();
  let list = [...store.audit_log];
  if (contentId) {
    list = list.filter((a) => a.content_id === contentId);
  }
  return list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
}

export async function addAuditLog(entry: {
  actor: string;
  role: UserRole;
  action: string;
  content_id?: string | null;
}): Promise<AuditLogEntry> {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  if (supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('audit_log')
        .insert([newEntry])
        .select()
        .single();
      if (!error && data) return data as AuditLogEntry;
    } catch (e) {
      console.warn('[BrandSentry DB] Fallback on addAuditLog:', e);
    }
  }

  const store = getStore();
  store.audit_log.unshift(newEntry);
  saveStore(store);
  return newEntry;
}
