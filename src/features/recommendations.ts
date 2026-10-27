import type { ErpSystem, ProgrammeState, StrategyRecommendation } from '../types/domain';
import { allCandidates } from './inventory';
import { isMissing, now, uid } from './utils';

type Draft = Pick<StrategyRecommendation,
  'title' | 'recommendationType' | 'specialist' | 'minVerified' | 'rationale' | 'facts' | 'assumptions' | 'missingEvidence' | 'constraints' | 'alternatives' | 'risks'
> & { constraintId?: string };

function meanConfidence(st: ProgrammeState, ids: string[]): number | null {
  const c = allCandidates(st).filter((x) => ids.includes(x.id));
  return c.length ? c.reduce((a, x) => a + x.confidence, 0) / c.length : null;
}

/**
 * Assurance reviewer plus contract envelope. Strategic-judgement confidence and
 * evidence-extraction confidence are calculated independently.
 */
function finalise(st: ProgrammeState, r: Draft): StrategyRecommendation {
  const verified = r.facts.filter((f) => f.evidenceStatus === 'verified').length;
  const issues: string[] = [];
  if (verified < r.minVerified) issues.push(`Needs at least ${r.minVerified} verified facts; found ${verified}.`);
  if (r.facts.some((f) => f.evidenceStatus === 'disputed')) issues.push('Relies on a disputed fact.');

  const weak = r.facts.some((f) => f.evidenceStatus === 'assumed' || f.evidenceStatus === 'unknown');
  const asserted = r.facts.some((f) => f.evidenceStatus === 'user_asserted');
  const ext = meanConfidence(st, r.facts.flatMap((f) => f.evidenceIds));

  return {
    ...r,
    id: uid('rec'),
    programmeId: st.programme!.id,
    status: issues.length ? 'review' : 'draft',
    assurance: { passed: !issues.length, issues },
    confidence: {
      level: weak ? 'low' : asserted ? 'medium' : 'high',
      basis: weak ? 'At least one supporting fact is assumed or unknown.'
        : asserted ? 'Relies on user-asserted inventory data that has no document evidence.'
        : 'All supporting facts are evidence-verified.',
    },
    extraction: ext == null
      ? { level: 'n/a', basis: 'No document-extracted evidence is used.' }
      : { level: ext >= 0.9 ? 'high' : ext >= 0.8 ? 'medium' : 'low', basis: `Mean extraction confidence ${Math.round(ext * 100)}% across linked evidence.` },
    sourceEvidenceIds: r.facts.flatMap((f) => f.evidenceIds),
    approvalRequired: true,
    modelVersion: 'rules-engine 0.1 (simulated LLM)',
    promptVersion: 'strategy-v0.3',
    createdAt: now(),
  };
}

/**
 * Deterministic stand-in for the specialist agents. In production the orchestrator
 * calls retrieval and an LLM here, but output must still pass `finalise`.
 */
export function generateRecommendations(st: ProgrammeState): StrategyRecommendation[] {
  const S = st.systems;
  const out: Draft[] = [];

  const bySid: Record<string, ErpSystem[]> = {};
  S.forEach((s) => { const k = s.facts.sid.value; if (k) (bySid[k] ??= []).push(s); });
  Object.entries(bySid).filter(([, g]) => g.length > 1).forEach(([sid, g]) => out.push({
    title: `Treat SID ${sid} (${g.map((s) => s.country).join(' + ')}) as one migration unit`,
    recommendationType: 'consolidation_unit', specialist: 'SAP Migration Adviser', minVerified: g.length,
    rationale: `${g.length} inventory rows share one SAP instance with separate clients. Counting them as separate systems overstates the number of migrations and could split one technical cutover across waves.`,
    facts: g.map((s) => ({ description: `${s.id} runs on SID ${sid}, client ${s.facts.client.value || 'unknown'}`, evidenceStatus: s.facts.client.status, evidenceIds: s.facts.client.evidence })),
    assumptions: ['The clients do not have independent upgrade or support paths.'],
    missingEvidence: g.filter((s) => s.facts.client.status !== 'verified').map((s) => `Verified client mapping for ${s.id}`),
    constraints: [],
    alternatives: ['Split the clients during migration using a client transfer.', 'Keep separate counting but plan a shared cutover window.'],
    risks: ['A cutover for one country forces downtime for the other.'],
  }));

  const ecc = S.filter((s) => s.product === 'SAP ECC');
  if (ecc.length) {
    const vr = ecc.filter((s) => s.facts.release.status === 'verified');
    out.push({
      title: `Sequence the ${ecc.length} SAP ECC systems against the 2027 maintenance deadline`,
      recommendationType: 'wave_planning', specialist: 'Strategy Analyst', minVerified: 2,
      rationale: 'ECC systems carry a fixed end-of-mainstream-maintenance date. Release levels decide whether a system-conversion path is technically viable, so they must be verified before waves are fixed.',
      facts: [
        { description: `${ecc.length} of ${S.length} systems are recorded as SAP ECC`, evidenceStatus: 'user_asserted', evidenceIds: [] },
        { description: `${vr.length} of ${ecc.length} ECC release levels are verified by documents`, evidenceStatus: vr.length ? 'verified' : 'unknown', evidenceIds: vr.flatMap((s) => s.facts.release.evidence) },
        { description: 'SAP ECC 6.0 mainstream maintenance ends 31 December 2027, with optional extended maintenance to 2030', evidenceStatus: 'verified', evidenceIds: ['ref:sap-maintenance-strategy'] },
      ],
      assumptions: ['The programme will not rely on extended maintenance beyond 2030.'],
      missingEvidence: ecc.filter((s) => s.facts.release.status !== 'verified').map((s) => `Verified release level for ${s.id}`).slice(0, 6),
      constraints: ['Mainstream maintenance end date'],
      alternatives: ['Purchase extended maintenance and run a single later wave.'],
      risks: ['Unverified release levels may hide systems that need an intermediate upgrade first.'],
    });
  }

  const noOwner = S.filter((s) => isMissing(s.facts.owner.value));
  if (noOwner.length) out.push({
    title: 'Assign accountable source owners before finalising the governance model',
    recommendationType: 'governance_action', specialist: 'Master Data Adviser', minVerified: 0,
    rationale: 'Ownership gaps block evidence review, discovery answers and data-domain accountability. This is a discovery action, so it may proceed on inventory data alone.',
    facts: [
      { description: `${noOwner.length} systems have no recorded source owner: ${noOwner.map((s) => s.id).join(', ')}`, evidenceStatus: 'user_asserted', evidenceIds: [] },
      { description: `${S.filter((s) => s.facts.owner.status === 'verified').length} source owners are confirmed by documents`, evidenceStatus: 'verified', evidenceIds: S.flatMap((s) => s.facts.owner.evidence) },
    ],
    assumptions: ['Regional leads can nominate owners within two weeks.'],
    missingEvidence: [], constraints: [],
    alternatives: ['Assign interim ownership to regional finance leads.'],
    risks: ['Discovery questions stay unanswered without an accountable owner.'],
  });

  const cn = S.find((s) => s.country === 'CN');
  if (cn) out.push({
    title: 'Treat China data residency as a hard constraint in scenario scoring',
    recommendationType: 'hard_constraint', specialist: 'Strategy Analyst', minVerified: 1,
    rationale: 'If financial records for China must remain in-country, any scenario that hosts them abroad is infeasible regardless of its weighted score.',
    facts: [
      { description: 'Regulated financial data for China must remain in-country', evidenceStatus: 'assumed', evidenceIds: [] },
      { description: `${cn.id} deployment is ${cn.facts.deployment.value || 'unknown'}`, evidenceStatus: cn.facts.deployment.status, evidenceIds: cn.facts.deployment.evidence },
    ],
    assumptions: ['Legal counsel has not yet confirmed the scope of data localisation obligations.'],
    missingEvidence: ['Legal opinion on data localisation for finance data'],
    constraints: ['Data residency'],
    alternatives: ['Use a separate in-country instance integrated through central finance.'],
    risks: ['Scenario A becomes infeasible if this constraint is approved.'],
    constraintId: 'cn_res',
  });

  return out.map((r) => finalise(st, r));
}
