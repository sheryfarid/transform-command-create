import type { Constraint, ScenarioScores } from '../types/domain';
import { COVERAGE_MIN, CRITERIA, SCENARIOS } from './reference';

export interface ScenarioScore { score: number | null; coverage: number; unassessed: string[] }

/**
 * S = Σ wᵢrᵢ ÷ Σ wᵢ over assessed criteria only, rᵢ normalised to 0–100.
 * Unassessed criteria are excluded (never scored as zero or average), so coverage is always reported with the score.
 */
export function scoreScenario(scores: Record<string, number | null>): ScenarioScore {
  const totalW = CRITERIA.reduce((a, c) => a + c.w, 0);
  let assessedW = 0;
  let weighted = 0;
  for (const c of CRITERIA) {
    const v = scores[c.id];
    if (v == null) continue;
    assessedW += c.w;
    weighted += c.w * (((v - 1) / 4) * 100);
  }
  return {
    score: assessedW ? Math.round(weighted / assessedW) : null,
    coverage: Math.round((assessedW / totalW) * 100),
    unassessed: CRITERIA.filter((c) => scores[c.id] == null).map((c) => c.name),
  };
}

/** Hard constraints apply separately from the weighted score. */
export function evaluateScenarios(scores: ScenarioScores, constraints: Constraint[]) {
  const results = SCENARIOS.map((sc) => {
    const r = scoreScenario(scores[sc.id]);
    const breaches = constraints.filter((c) => c.breachedBy.includes(sc.id));
    const infeasible = breaches.some((c) => c.status === 'approved');
    return { ...sc, ...r, breaches, infeasible, rankable: !infeasible && r.coverage >= COVERAGE_MIN };
  });
  const ranked = results.filter((r) => r.rankable).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return results.map((r) => ({ ...r, rank: r.rankable ? ranked.findIndex((x) => x.id === r.id) + 1 : null }));
}
