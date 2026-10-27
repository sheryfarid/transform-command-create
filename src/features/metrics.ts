import type { ErpSystem, ProgrammeState } from '../types/domain';
import { FIELD_LABEL, MANDATORY, STATUS, type MetricId } from './reference';
import { allCandidates, assessmentState, gapsFor, isAssessed } from './inventory';
import { pct } from './utils';

export interface MetricResult { value: number; num: number; den: number | null }

/** Calculates one registry metric from records. Never from hard-coded frontend numbers. */
export function computeMetric(id: MetricId, st: ProgrammeState, systems: ErpSystem[]): MetricResult {
  switch (id) {
    case 'inventory_completeness': {
      const den = systems.length * MANDATORY.length;
      const num = systems.reduce((a, s) => a + MANDATORY.filter((m) => s.facts[m.key].status === 'verified').length, 0);
      return { value: pct(num, den), num, den };
    }
    case 'assessment_coverage': {
      const num = systems.filter((s) => isAssessed(s, st)).length;
      return { value: pct(num, systems.length), num, den: systems.length };
    }
    case 'evidence_verification': {
      const ids = new Set(systems.map((s) => s.id));
      const c = allCandidates(st).filter((x) => ids.has(x.systemId));
      const num = c.filter((x) => x.state === 'accepted').length;
      return { value: pct(num, c.length), num, den: c.length };
    }
    case 'ownership_coverage': {
      const num = systems.filter((s) => s.facts.owner.status === 'verified').length;
      return { value: pct(num, systems.length), num, den: systems.length };
    }
    case 'open_critical_risks': {
      const n = st.risks.filter((r) => r.status === 'open' && r.severity === 'Critical').length;
      return { value: n, num: n, den: null };
    }
    case 'decision_backlog': {
      const n = st.decisions.filter((d) => d.status === 'pending').length;
      return { value: n, num: n, den: null };
    }
  }
}

export interface MetricExplanation { question: string; rows: { id: string; text: string }[] }

/** Context for the AI insight drawer: the source records behind a KPI. */
export function explainMetric(id: MetricId, st: ProgrammeState, systems: ErpSystem[]): MetricExplanation {
  switch (id) {
    case 'inventory_completeness':
      return {
        question: 'Which systems have the fewest verified fields?',
        rows: systems
          .map((s) => ({ id: s.id, n: MANDATORY.filter((m) => s.facts[m.key].status === 'verified').length }))
          .sort((a, b) => a.n - b.n)
          .map((r) => ({ id: r.id, text: `${r.n} of ${MANDATORY.length} mandatory fields verified` })),
      };
    case 'assessment_coverage':
      return {
        question: 'Why is assessment incomplete?',
        rows: systems.filter((s) => !isAssessed(s, st)).map((s) => ({
          id: s.id,
          text: assessmentState(s, st) === 'Validation Required'
            ? 'Open validation warning: shared SID needs confirmation'
            : `Missing or disputed: ${gapsFor(s).map((g) => g.label).join(', ')}`,
        })),
      };
    case 'evidence_verification': {
      const ids = new Set(systems.map((s) => s.id));
      return {
        question: 'Which evidence items still need review?',
        rows: allCandidates(st).filter((c) => ids.has(c.systemId) && c.state !== 'accepted').map((c) => ({ id: c.systemId, text: `${FIELD_LABEL[c.field]} = “${c.value}” from ${c.docName} (${c.state})` })),
      };
    }
    case 'ownership_coverage':
      return {
        question: 'Which source owners are unconfirmed?',
        rows: systems.filter((s) => s.facts.owner.status !== 'verified').map((s) => ({
          id: s.id,
          text: s.facts.owner.value ? `“${s.facts.owner.value}” is ${STATUS[s.facts.owner.status].label.toLowerCase()}, not evidence-verified` : 'No source owner recorded',
        })),
      };
    case 'open_critical_risks':
      return { question: 'What are the open critical risks?', rows: st.risks.filter((r) => r.status === 'open' && r.severity === 'Critical').map((r) => ({ id: r.source, text: r.title })) };
    case 'decision_backlog':
      return { question: 'Which decisions are waiting?', rows: st.decisions.filter((d) => d.status === 'pending').map((d) => ({ id: d.requiredRole, text: d.title })) };
  }
}
