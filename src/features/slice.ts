import type { ProgrammeState } from '../types/domain';

export type ComponentId = 'web' | 'api' | 'portfolio' | 'discovery' | 'ai' | 'gov' | 'pg' | 'blob' | 'vec' | 'jobs' | 'llm' | 'audit';

export const LAYERS = ['Client', 'Edge', 'Domain modules (modular monolith)', 'Platform services'];
export const COMPONENTS: { id: ComponentId; name: string; note: string; layer: number }[] = [
  { id: 'web', name: 'React web app', note: 'TanStack Query, Zustand, React Flow', layer: 0 },
  { id: 'api', name: 'FastAPI gateway', note: 'Entra ID auth, RBAC, tenant isolation, idempotency', layer: 1 },
  { id: 'portfolio', name: 'Portfolio', note: 'Programmes, KPIs, metric registry', layer: 2 },
  { id: 'discovery', name: 'Discovery', note: 'Inventory, assertions, gaps, baselines', layer: 2 },
  { id: 'ai', name: 'AI strategy', note: 'Orchestrator and five specialists', layer: 2 },
  { id: 'gov', name: 'Governance', note: 'Decisions, approvals, risks', layer: 2 },
  { id: 'pg', name: 'PostgreSQL + RLS', note: 'Business records', layer: 3 },
  { id: 'blob', name: 'Blob storage', note: 'Encrypted evidence files', layer: 3 },
  { id: 'vec', name: 'pgvector', note: 'Tenant-filtered retrieval', layer: 3 },
  { id: 'jobs', name: 'Worker jobs', note: 'Ingestion and extraction', layer: 3 },
  { id: 'llm', name: 'LLM endpoint', note: 'Region-pinned, structured output', layer: 3 },
  { id: 'audit', name: 'Event and audit', note: 'Append-only history', layer: 3 },
];

export interface SliceStep { title: string; path: string; done: (st: ProgrammeState) => boolean; comps: ComponentId[]; api: string[]; what: string }

/** The first development milestone: one complete vertical slice against persisted records. */
export const SLICE: SliceStep[] = [
  { title: 'Create programme', path: '/programmes/new', done: (st) => !!st.programme, comps: ['web', 'api', 'portfolio', 'pg', 'audit'], api: ['POST /api/v1/programmes'], what: 'Programme, objectives and scope are written in one transaction with a tenant ID and an audit event.' },
  { title: 'Import ERP inventory', path: '/landscapes', done: (st) => st.systems.length > 0, comps: ['web', 'api', 'discovery', 'jobs', 'pg', 'audit'], api: ['POST /api/v1/programmes/{id}/imports', 'GET /api/v1/imports/{id}'], what: 'A worker validates rows, rejects duplicates and invalid countries, flags shared SIDs, and stores every value as a user-asserted fact.' },
  { title: 'Upload supporting document', path: '/documents', done: (st) => st.docs.some((d) => d.status !== 'processing'), comps: ['web', 'api', 'discovery', 'blob', 'jobs', 'vec', 'audit'], api: ['POST /api/v1/documents/upload-session', 'GET /api/v1/documents/{id}/evidence'], what: 'The file is scanned and stored encrypted; a worker extracts candidate facts with source locations and confidence, and flags embedded instructions.' },
  { title: 'Receive evidence-backed finding', path: '/documents', done: (st) => st.docs.some((d) => d.candidates.some((c) => c.state === 'accepted')), comps: ['web', 'api', 'discovery', 'pg', 'audit'], api: ['POST /api/v1/evidence/{id}/review'], what: 'A reviewer accepts a fact; the attribute becomes verified and its previous value is kept in history.' },
  { title: 'Review AI-generated question', path: '/strategy', done: (st) => st.recs.length > 0 || st.questions.some((q) => q.category !== 'Inventory gap'), comps: ['web', 'api', 'ai', 'vec', 'llm', 'pg'], api: ['POST /api/v1/programmes/{id}/strategy/sessions', 'POST /api/v1/strategy/sessions/{id}/messages'], what: 'The orchestrator resolves context, retrieves approved evidence, runs rules, and returns structured drafts that the assurance reviewer checks.' },
  { title: 'Accept or reject recommendation', path: '/strategy', done: (st) => st.recs.some((r) => r.status === 'approved' || r.status === 'rejected'), comps: ['web', 'api', 'gov', 'pg', 'audit'], api: ['POST /api/v1/recommendations/{id}/review', 'POST /api/v1/decisions/{id}/approve'], what: 'Only authorised roles can promote a draft. Acceptance raises a decision for the designated approver.' },
  { title: 'See the result in the dashboard', path: '/dashboard', done: (st) => st.flags.dashboardAfterReview, comps: ['web', 'api', 'portfolio', 'pg'], api: ['GET /api/v1/programmes/{id}/dashboard'], what: 'KPIs are recalculated from records through the versioned metric registry, each exposing its definition, scope and sources.' },
];
