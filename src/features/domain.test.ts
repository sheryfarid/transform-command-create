import { describe, expect, it } from 'vitest';
import { runImport, gapsFor, assessmentState } from './inventory';
import { scoreScenario, evaluateScenarios } from './scenarios';
import { SAMPLE_CSV, DEFAULT_SCORES, DEFAULT_CONSTRAINTS } from './reference';

describe('inventory import', () => {
  const { systems, report } = runImport(SAMPLE_CSV, 'sample.csv');

  it('accepts 24 systems and rejects the duplicate and invalid rows', () => {
    expect(report.total).toBe(26);
    expect(systems).toHaveLength(24);
    expect(report.errors).toHaveLength(2);
  });

  it('flags a shared SID as ambiguous rather than rejecting it', () => {
    expect(report.warnings).toHaveLength(1);
    const benelux = systems.filter((s) => s.facts.sid.value === 'P21');
    expect(benelux).toHaveLength(2);
    expect(assessmentState(benelux[0], { baselines: [], docs: [] })).toBe('Validation Required');
  });

  it('treats "unknown" as a gap and imported values as user-asserted', () => {
    const es = systems.find((s) => s.id === 'ERP-ES-01')!;
    expect(gapsFor(es).map((g) => g.field)).toContain('release');
    expect(es.facts.owner.status).toBe('user_asserted');
  });
});

describe('scenario scoring', () => {
  it('excludes unassessed criteria and reports coverage', () => {
    const r = scoreScenario({ biz: 5, data: 5, tech: 5, reg: null, ops: 5, cost: 5 });
    expect(r.score).toBe(100);
    expect(r.coverage).toBe(85);
    expect(r.unassessed).toEqual(['Regulatory suitability']);
  });

  it('makes a scenario infeasible when it breaches an approved constraint', () => {
    const approved = DEFAULT_CONSTRAINTS.map((c) => ({ ...c, status: 'approved' as const }));
    const a = evaluateScenarios(DEFAULT_SCORES, approved).find((r) => r.id === 'A')!;
    expect(a.infeasible).toBe(true);
    expect(a.rank).toBeNull();
  });
});
