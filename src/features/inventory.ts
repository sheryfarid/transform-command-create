import type { AssessmentState, CandidateFact, ErpSystem, EvidenceState, FieldKey, ImportReport, ProgrammeState } from '../types/domain';
import { COUNTRIES, MANDATORY } from './reference';
import { isMissing, makeFact, now, parseCSV, regionOf } from './utils';

export function runImport(text: string, source: string): { systems: ErpSystem[]; report: ImportReport } {
  const rows = parseCSV(text);
  const report: ImportReport = { total: rows.length, accepted: 0, errors: [], warnings: [], at: now(), source };
  const seen = new Set<string>();
  const systems: ErpSystem[] = [];

  rows.forEach((r, i) => {
    const line = i + 2;
    if (!r.system_id) return void report.errors.push({ line, msg: 'Missing ERP system ID. Row rejected.' });
    if (seen.has(r.system_id)) return void report.errors.push({ line, msg: `Duplicate ERP system ID ${r.system_id}. Row rejected; the first occurrence was kept.` });
    if (!COUNTRIES[r.country]) return void report.errors.push({ line, msg: `${r.system_id}: “${r.country || 'blank'}” is not a recognised ISO 3166-1 country code. Row rejected.` });
    seen.add(r.system_id);
    systems.push({
      id: r.system_id,
      landscape: r.landscape || 'Unassigned',
      region: regionOf(r.landscape || ''),
      country: r.country,
      product: r.product || 'Other',
      domains: (r.domains || '').split(';').filter(Boolean),
      facts: {
        sid: makeFact(r.sid), release: makeFact(r.release), client: makeFact(r.client),
        companyCodes: makeFact(r.company_codes), deployment: makeFact(r.deployment), owner: makeFact(r.owner),
      },
      validation: [],
      validationResolved: false,
    });
  });

  // SID, client and system are separate concepts: a shared SID is ambiguous, not an error.
  const bySid: Record<string, ErpSystem[]> = {};
  systems.forEach((s) => { const k = s.facts.sid.value; if (k) (bySid[k] ??= []).push(s); });
  Object.entries(bySid).forEach(([sid, group]) => {
    if (group.length < 2) return;
    const msg = `SID ${sid} is shared by ${group.map((s) => s.id).join(' and ')} (clients ${group.map((s) => s.facts.client.value || '?').join(', ')}). Confirm whether these are separate systems or clients on one instance.`;
    report.warnings.push({ msg });
    group.forEach((s) => s.validation.push(msg));
  });

  report.accepted = systems.length;
  return { systems, report };
}

export interface Gap { systemId: string; field: FieldKey; label: string; kind: 'Missing' | 'Disputed'; severity: 'High' | 'Medium' }

export function gapsFor(s: ErpSystem): Gap[] {
  return MANDATORY.filter((m) => isMissing(s.facts[m.key].value) || s.facts[m.key].status === 'disputed').map((m) => ({
    systemId: s.id,
    field: m.key,
    label: m.label,
    kind: s.facts[m.key].status === 'disputed' ? 'Disputed' : 'Missing',
    severity: m.key === 'owner' ? 'High' : 'Medium',
  }));
}

type Ctx = Pick<ProgrammeState, 'baselines' | 'docs'>;

export function assessmentState(s: ErpSystem, st: Ctx): AssessmentState {
  if (s.validation.length && !s.validationResolved) return 'Validation Required';
  if (gapsFor(s).length) return 'In Assessment';
  const latest = st.baselines[0];
  return latest && latest.systemIds.includes(s.id) ? 'Baseline Approved' : 'Assessed';
}

export function evidenceState(s: ErpSystem, st: Ctx): EvidenceState {
  const facts = MANDATORY.map((m) => s.facts[m.key]);
  if (facts.some((f) => f.status === 'disputed')) return 'Disputed';
  const pending = st.docs.some((d) => d.status === 'review' && d.candidates.some((c) => c.systemId === s.id && c.state === 'pending' && !c.unmatched));
  if (pending) return 'Under review';
  const verified = facts.filter((f) => f.status === 'verified').length;
  if (verified === facts.length) return 'Verified';
  return verified > 0 ? 'Partial' : 'No evidence';
}

export type CandidateRow = CandidateFact & { docId: string; docName: string };

export const allCandidates = (st: Pick<ProgrammeState, 'docs'>): CandidateRow[] =>
  st.docs.flatMap((d) => (d.status === 'review' ? d.candidates.filter((c) => !c.unmatched).map((c) => ({ ...c, docId: d.id, docName: d.name })) : []));

export const isAssessed = (s: ErpSystem, st: Ctx) => ['Assessed', 'Baseline Approved'].includes(assessmentState(s, st));
