/** Domain types shared by the store, domain logic and UI. Mirrors packages/contracts in the blueprint. */

export type EvidenceStatus = 'verified' | 'user_asserted' | 'ai_inferred' | 'assumed' | 'unknown' | 'disputed';
export type FieldKey = 'sid' | 'release' | 'client' | 'companyCodes' | 'deployment' | 'owner';
export type Region = 'EMEA' | 'MEA' | 'Americas' | 'APAC' | 'Unassigned';
export type Role = 'Executive Sponsor' | 'Programme Lead' | 'Data Steward' | 'SAP Architect';
export type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'violet' | 'muted';

export type AssessmentState = 'Validation Required' | 'In Assessment' | 'Assessed' | 'Baseline Approved';
export type EvidenceState = 'No evidence' | 'Partial' | 'Under review' | 'Verified' | 'Disputed';

export interface FactHistoryEntry { ts: string; value: string; status: EvidenceStatus; note: string }

/** Field-level provenance: the prototype equivalent of an attribute_assertions row. */
export interface Fact { value: string; status: EvidenceStatus; evidence: string[]; history: FactHistoryEntry[] }

export interface ErpSystem {
  id: string;
  landscape: string;
  region: Region;
  country: string;
  product: string;
  domains: string[];
  facts: Record<FieldKey, Fact>;
  validation: string[];
  validationResolved: boolean;
}

export interface Programme {
  id: string;
  tenant: string;
  name: string;
  sponsor: string;
  objectives: string;
  scope: string;
  createdAt: string;
}

export interface ImportReport {
  total: number;
  accepted: number;
  errors: { line: number; msg: string }[];
  warnings: { msg: string }[];
  at: string;
  source: string;
}

export interface CandidateSpec { systemId: string; field: FieldKey; value: string; confidence: number; location: string }

export interface CandidateFact extends CandidateSpec {
  id: string;
  state: 'pending' | 'accepted' | 'rejected' | 'revoked';
  conflict: boolean;
  unmatched: boolean;
  reviewedBy?: Role;
  reviewedAt?: string;
}

export interface DocumentSpec {
  name: string;
  type: string;
  size: string;
  classification: string;
  injection: string | null;
  candidates: CandidateSpec[];
  rejected?: string;
}

export interface EvidenceDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  classification: string;
  injection: string | null;
  status: 'processing' | 'review' | 'rejected';
  rejectReason: string | null;
  stage: number;
  uploadedAt: string;
  candidates: CandidateFact[];
}

export type QuestionCategory = 'Inventory gap' | 'Consultant request' | 'Assurance request';

export interface DiscoveryQuestion {
  id: string;
  systemId: string | null;
  field: FieldKey | null;
  category: QuestionCategory;
  severity?: 'High' | 'Medium';
  text: string;
  owner: string;
  status: 'open' | 'answered';
  answer?: string;
  answerStatus?: EvidenceStatus;
  answeredBy?: Role;
  answeredAt?: string;
  createdAt: string;
}

export interface RecommendationFact { description: string; evidenceStatus: EvidenceStatus; evidenceIds: string[] }
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Recommendation contract from the blueprint, plus assurance and extraction confidence. */
export interface StrategyRecommendation {
  id: string;
  programmeId: string;
  title: string;
  recommendationType: string;
  specialist: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  rationale: string;
  sourceEvidenceIds: string[];
  assumptions: string[];
  missingEvidence: string[];
  constraints: string[];
  alternatives: string[];
  risks: string[];
  confidence: { level: ConfidenceLevel; basis: string };
  extraction: { level: ConfidenceLevel | 'n/a'; basis: string };
  assurance: { passed: boolean; issues: string[] };
  facts: RecommendationFact[];
  minVerified: number;
  constraintId?: string;
  approvalRequired: boolean;
  modelVersion: string;
  promptVersion: string;
  createdAt: string;
  reviewedBy?: Role;
  reviewedAt?: string;
  rejectReason?: string;
}

export interface Decision {
  id: string;
  title: string;
  sourceRecId: string;
  constraintId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requiredRole: Role;
  createdAt: string;
  history: { ts: string; by: Role; action: string }[];
}

export interface Risk {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  source: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface Baseline { version: number; at: string; by: Role; systemIds: string[]; total: number; verifiedPct: number }

export interface Constraint { id: string; text: string; status: 'proposed' | 'approved'; breachedBy: string[] }

export interface AuditEvent { id: string; ts: string; actor: string; action: string; entity: string }

export type ScenarioScores = Record<string, Record<string, number | null>>;

export interface ProgrammeState {
  version: 1;
  role: Role;
  region: Region | 'All';
  programme: Programme | null;
  systems: ErpSystem[];
  importReport: ImportReport | null;
  docs: EvidenceDocument[];
  questions: DiscoveryQuestion[];
  recs: StrategyRecommendation[];
  decisions: Decision[];
  risks: Risk[];
  baselines: Baseline[];
  scores: ScenarioScores;
  constraints: Constraint[];
  flags: { dashboardAfterReview: boolean; aiRuns: number };
  audit: AuditEvent[];
}
