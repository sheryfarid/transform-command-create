import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DocumentSpec, EvidenceStatus, FieldKey, Programme, ProgrammeState, Region, Role, StrategyRecommendation } from '../types/domain';
import { DEFAULT_CONSTRAINTS, DEFAULT_SCORES, FIELD_LABEL, SAMPLE_CSV, SAMPLE_DOCS, STAGES } from '../features/reference';
import { assessmentState, gapsFor, runImport } from '../features/inventory';
import { computeMetric } from '../features/metrics';
import { generateRecommendations } from '../features/recommendations';
import type { ProposedRequest } from '../features/topics';
import { isMissing, norm, now, uid } from '../features/utils';

/**
 * Client-side stand-in for the backend. Each action corresponds to one API call in
 * the blueprint and writes an audit event. Replace action bodies with TanStack Query
 * mutations against FastAPI when the backend exists; component code can stay the same.
 */
export interface ProgrammeActions {
  seedDemo: () => void;
  setRole: (role: Role) => void;
  setRegion: (region: Region | 'All') => void;
  createProgramme: (p: Omit<Programme, 'id' | 'tenant' | 'createdAt'>) => void;
  importInventory: (csv: string, source: string) => void;
  resolveValidation: (sid: string) => void;
  uploadDocument: (spec: DocumentSpec) => string;
  advancePipeline: () => void;
  reviewEvidence: (docId: string, candidateId: string, decision: 'accept' | 'reject' | 'revoke') => void;
  generateDiscoveryWork: () => void;
  answerQuestion: (questionId: string, value: string, status: EvidenceStatus) => void;
  approveBaseline: () => void;
  createConsultantRequests: (topic: string, requests: ProposedRequest[]) => void;
  runAssessment: () => void;
  reviewRecommendation: (recId: string, decision: 'approved' | 'rejected', reason?: string) => void;
  requestEvidence: (rec: StrategyRecommendation) => void;
  decide: (decisionId: string, outcome: 'approved' | 'rejected') => void;
  resolveRisk: (riskId: string) => void;
  setScore: (scenarioId: string, criterionId: string, value: number | null) => void;
  markDashboardSeen: () => void;
  reset: () => void;
}

export const initialState = (): ProgrammeState => ({
  version: 1,
  role: 'Programme Lead',
  region: 'All',
  programme: null,
  systems: [],
  importReport: null,
  docs: [],
  questions: [],
  recs: [],
  decisions: [],
  risks: [],
  baselines: [],
  scores: structuredClone(DEFAULT_SCORES),
  constraints: structuredClone(DEFAULT_CONSTRAINTS),
  flags: { dashboardAfterReview: false, aiRuns: 0 },
  audit: [],
});

const audit = (s: ProgrammeState, action: string, entity: string, actor: string = s.role) =>
  s.audit.unshift({ id: uid('ae'), ts: now(), actor, action, entity });

export const useProgrammeStore = create<ProgrammeState & ProgrammeActions>()(
  persist(
    immer((set, get) => ({
      ...initialState(),

      seedDemo: () => set((s) => {
        if (s.programme || s.systems.length) return;
        s.programme = { id: uid('prg'), tenant: 'tenant-demo', name: 'Global ERP Consolidation', sponsor: 'CFO', objectives: 'Consolidate SAP landscapes; De-risk ECC exit', scope: 'Global', createdAt: now() };
        audit(s, 'Programme created', 'Global ERP Consolidation');
        const { systems, report } = runImport(SAMPLE_CSV, 'sample.csv');
        Object.assign(s, { systems, importReport: report, docs: [], questions: [], recs: [], decisions: [], baselines: [], risks: [] });
        const ecc = systems.filter((x) => x.product === 'SAP ECC').length;
        if (ecc) s.risks.push({ id: uid('risk'), title: ecc + ' systems run SAP ECC; mainstream maintenance ends in 2027', severity: 'Critical', source: 'Inventory', status: 'open', createdAt: now() } as any);
        if (report.warnings.length) s.risks.push({ id: uid('risk'), title: 'Shared SID may make the "24 systems" count misleading for wave planning', severity: 'High', source: 'Import validation', status: 'open', createdAt: now() } as any);
        const noOwnerCount: any = systems.filter((x) => isMissing(x.facts.owner.value)).length;
        if (noOwnerCount) { (s.risks as any[]).push({ id: uid('risk'), title: String(noOwnerCount) + ' systems have no accountable source owner', severity: 'High', source: 'Inventory', status: 'open', createdAt: now() }); }
        audit(s, 'Inventory imported', 'sample.csv');
        SAMPLE_DOCS.forEach((doc: any) => {
          const id = uid('doc');
          s.docs.unshift({
            id, name: doc.name, type: doc.type, size: String(1024), classification: doc.classification, injection: (doc.injection as any) ?? null,
            status: 'review', rejectReason: null, stage: STAGES.length,
            uploadedAt: now(),
            candidates: doc.candidates.map((c: any) => {
              const sys = s.systems.find((x: any) => x.id === c.systemId);
              const cand: any = { ...c, id: uid('ev'), state: 'pending', conflict: false, unmatched: false };
              if (!sys) { cand.unmatched = true; return cand; }
              const f = sys.facts[c.field as FieldKey];
              cand.conflict = !isMissing(f.value) && norm(f.value) !== norm(c.value);
              return cand;
            }),
          });
          audit(s, 'Document uploaded', doc.name);
        });
      }),

      setRole: (role) => set((s) => { s.role = role; }),
      setRegion: (region) => set((s) => { s.region = region; }),

      createProgramme: (p) => set((s) => {
        s.programme = { ...p, id: uid('prg'), tenant: 'tenant-demo', createdAt: now() };
        audit(s, 'Programme created', p.name);
      }),

      importInventory: (csv, source) => set((s) => {
        const { systems, report } = runImport(csv, source);
        Object.assign(s, { systems, importReport: report, docs: [], questions: [], recs: [], decisions: [], baselines: [], risks: [] });
        const ecc = systems.filter((x) => x.product === 'SAP ECC').length;
        if (ecc) s.risks.push({ id: uid('risk'), title: `${ecc} systems run SAP ECC; mainstream maintenance ends in 2027`, severity: 'Critical', source: 'Inventory', status: 'open', createdAt: now() });
        if (report.warnings.length) s.risks.push({ id: uid('risk'), title: 'Shared SID may make the “24 systems” count misleading for wave planning', severity: 'High', source: 'Import validation', status: 'open', createdAt: now() });
        const noOwner = systems.filter((x) => isMissing(x.facts.owner.value)).length;
        if (noOwner) s.risks.push({ id: uid('risk'), title: `${noOwner} systems have no accountable source owner`, severity: 'High', source: 'Inventory', status: 'open', createdAt: now() });
        audit(s, 'Inventory imported', source);
      }),

      resolveValidation: (sid) => set((s) => {
        s.systems.forEach((x) => { if (x.facts.sid.value === sid) x.validationResolved = true; });
        audit(s, 'Validation resolved', sid);
      }),

      uploadDocument: (spec) => {
        const id = uid('doc');
        set((s) => {
          s.docs.unshift({
            id, name: spec.name, type: spec.type, size: spec.size, classification: spec.classification, injection: spec.injection,
            status: spec.rejected ? 'rejected' : 'processing', rejectReason: spec.rejected ?? null, stage: 0, uploadedAt: now(),
            candidates: spec.candidates.map((c) => ({ ...c, id: uid('ev'), state: 'pending', conflict: false, unmatched: false })),
          });
          audit(s, 'Document uploaded', spec.name);
        });
        return id;
      },

      /** One tick of the simulated ingestion worker. Production: Celery job progress polled by TanStack Query. */
      advancePipeline: () => set((s) => {
        s.docs.forEach((d) => {
          if (d.status !== 'processing') return;
          d.stage += 1;
          if (d.stage < STAGES.length) return;
          d.status = 'review';
          d.candidates.forEach((c) => {
            const sys = s.systems.find((x) => x.id === c.systemId);
            if (!sys) { c.unmatched = true; return; }
            const f = sys.facts[c.field];
            c.conflict = !isMissing(f.value) && norm(f.value) !== norm(c.value);
          });
          audit(s, 'Document processed', d.name, 'Ingestion worker');
          if (d.injection) {
            s.risks.unshift({ id: uid('risk'), title: `Prompt-injection attempt in ${d.name}; instruction ignored`, severity: 'Critical', source: 'Evidence pipeline', status: 'open', createdAt: now() });
            audit(s, 'Embedded instruction blocked', d.name, 'Guardrails');
          }
        });
      }),

      reviewEvidence: (docId, candidateId, decision) => set((s) => {
        const d = s.docs.find((x) => x.id === docId);
        const c = d?.candidates.find((x) => x.id === candidateId);
        const sys = c && s.systems.find((x) => x.id === c.systemId);
        if (!d || !c || !sys) return;
        const f = sys.facts[c.field];
        c.reviewedBy = s.role; c.reviewedAt = now();
        if (decision === 'accept') {
          f.history.push({ ts: now(), value: f.value, status: f.status, note: c.conflict ? `Superseded by ${d.name}.` : `Confirmed by ${d.name}.` });
          f.value = c.value; f.status = 'verified'; f.evidence.push(c.id); c.state = 'accepted';
        } else if (decision === 'reject') {
          c.state = 'rejected';
        } else {
          // Revoked evidence returns the fact to review without deleting its history.
          c.state = 'revoked';
          f.history.push({ ts: now(), value: f.value, status: f.status, note: `Evidence from ${d.name} revoked; fact returned to review.` });
          f.evidence = f.evidence.filter((x) => x !== c.id);
          if (!f.evidence.length) f.status = 'disputed';
        }
        const label = { accept: 'Evidence accepted', reject: 'Evidence rejected', revoke: 'Evidence revoked' }[decision];
        audit(s, label, `${c.systemId} ${FIELD_LABEL[c.field]}`);
      }),

      generateDiscoveryWork: () => set((s) => {
        const gaps = s.systems.flatMap(gapsFor);
        gaps.forEach((g) => {
          if (s.questions.some((q) => q.status === 'open' && q.systemId === g.systemId && q.field === g.field)) return;
          const sys = s.systems.find((x) => x.id === g.systemId)!;
          s.questions.push({
            id: uid('q'), systemId: g.systemId, field: g.field, category: 'Inventory gap', severity: g.severity,
            text: g.kind === 'Disputed'
              ? `The ${g.label.toLowerCase()} for ${g.systemId} is disputed. What is the correct value, and which document confirms it?`
              : `What is the ${g.label.toLowerCase()} for ${g.systemId}? Attach a source document if one exists.`,
            owner: sys.facts.owner.value || `Landscape lead, ${sys.landscape}`, status: 'open', createdAt: now(),
          });
        });
        audit(s, 'Discovery work generated', `${gaps.length} gaps`);
      }),

      answerQuestion: (questionId, value, status) => set((s) => {
        const q = s.questions.find((x) => x.id === questionId);
        if (!q) return;
        Object.assign(q, { status: 'answered', answer: value || '(unknown)', answerStatus: status, answeredBy: s.role, answeredAt: now() });
        if (q.systemId && q.field && status !== 'unknown' && value) {
          const f = s.systems.find((x) => x.id === q.systemId)!.facts[q.field as FieldKey];
          f.history.push({ ts: now(), value: f.value, status: f.status, note: 'Updated by discovery answer.' });
          f.value = value; f.status = status;
        }
        audit(s, 'Discovery answer submitted', q.systemId ? `${q.systemId} ${q.field ? FIELD_LABEL[q.field] : ''}` : q.category);
      }),

      approveBaseline: () => set((s) => {
        const ids = s.systems.filter((x) => assessmentState(x, s) === 'Assessed').map((x) => x.id);
        const verifiedPct = computeMetric('inventory_completeness', s, s.systems).value;
        const version = s.baselines.length + 1;
        s.baselines.unshift({ version, at: now(), by: s.role, systemIds: ids, total: s.systems.length, verifiedPct });
        audit(s, 'Baseline approved', `v${version}`);
      }),

      createConsultantRequests: (topic, requests) => set((s) => {
        requests.forEach((p) => s.questions.push({
          id: uid('q'), systemId: p.systemId, field: null, category: 'Consultant request', text: p.text,
          owner: p.systemId ? s.systems.find((x) => x.id === p.systemId)?.facts.owner.value || 'Regional lead' : 'Process owner',
          status: 'open', createdAt: now(),
        }));
        audit(s, 'Evidence requests created', topic);
      }),

      runAssessment: () => set((s) => {
        const kept = s.recs.filter((r) => r.status === 'approved' || r.status === 'rejected');
        const fresh = generateRecommendations(get()).filter((r) => !kept.some((k) => k.title === r.title));
        s.recs = [...fresh, ...kept];
        s.flags.aiRuns += 1;
        audit(s, 'Strategy assessment run', `${fresh.length} drafts`);
      }),

      reviewRecommendation: (recId, decision, reason) => set((s) => {
        const r = s.recs.find((x) => x.id === recId);
        if (!r) return;
        r.status = decision; r.reviewedBy = s.role; r.reviewedAt = now();
        if (decision === 'rejected') r.rejectReason = reason || 'No reason given';
        if (decision === 'approved') s.decisions.unshift({
          id: uid('dec'), title: r.title, sourceRecId: r.id, constraintId: r.constraintId ?? null, status: 'pending',
          requiredRole: 'Executive Sponsor', createdAt: now(), history: [{ ts: now(), by: s.role, action: 'Raised from accepted recommendation' }],
        });
        audit(s, decision === 'approved' ? 'Recommendation accepted' : 'Recommendation rejected', r.title);
      }),

      requestEvidence: (rec) => set((s) => {
        rec.missingEvidence.forEach((m) => s.questions.push({
          id: uid('q'), systemId: null, field: null, category: 'Assurance request', text: `${m}. Needed for: ${rec.title}.`,
          owner: 'Programme Lead', status: 'open', createdAt: now(),
        }));
        audit(s, 'Evidence requested', rec.title);
      }),

      decide: (decisionId, outcome) => set((s) => {
        const d = s.decisions.find((x) => x.id === decisionId);
        if (!d) return;
        d.status = outcome;
        d.history.push({ ts: now(), by: s.role, action: outcome === 'approved' ? 'Approved' : 'Rejected' });
        if (outcome === 'approved' && d.constraintId) {
          const c = s.constraints.find((x) => x.id === d.constraintId);
          if (c) c.status = 'approved';
        }
        audit(s, outcome === 'approved' ? 'Decision approved' : 'Decision rejected', d.title);
      }),

      resolveRisk: (riskId) => set((s) => {
        const r = s.risks.find((x) => x.id === riskId);
        if (!r) return;
        r.status = 'resolved';
        audit(s, 'Risk resolved', r.title);
      }),

      setScore: (scenarioId, criterionId, value) => set((s) => {
        s.scores[scenarioId][criterionId] = value;
        audit(s, 'Scenario score changed', `${scenarioId} ${criterionId}`);
      }),

      markDashboardSeen: () => set((s) => { s.flags.dashboardAfterReview = true; }),

      reset: () => set(() => initialState()),
    })),
    {
      name: 'edtcc-slice',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Systems filtered by the global region context. */
export const useScopedSystems = () => {
  const systems = useProgrammeStore((s) => s.systems);
  const region = useProgrammeStore((s) => s.region);
  return region === 'All' ? systems : systems.filter((x) => x.region === region);
};
