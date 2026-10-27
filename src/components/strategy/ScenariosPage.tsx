import { COVERAGE_MIN, CRITERIA, SCENARIOS } from '../../features/reference';
import { evaluateScenarios } from '../../features/scenarios';
import { useProgrammeStore } from '../../stores/programmeStore';
import { Chip, Section } from '../ui';

export function ScenariosPage() {
  const scores = useProgrammeStore((s) => s.scores);
  const constraints = useProgrammeStore((s) => s.constraints);
  const setScore = useProgrammeStore((s) => s.setScore);
  const results = evaluateScenarios(scores, constraints);

  return (
    <div className="stack">
      <Section title="Compare target-state scenarios" aside={<span className="fine">Weights are illustrative demo assumptions, not an endorsed methodology.</span>}>
        <div className="scroll-x">
          <table className="table score-table">
            <thead><tr><th>Criterion</th><th>Weight</th>{SCENARIOS.map((s) => <th key={s.id}>{s.id}. {s.name}</th>)}</tr></thead>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.w}%</td>
                  {SCENARIOS.map((s) => {
                    const v = scores[s.id][c.id];
                    return (
                      <td key={s.id}>
                        <select aria-label={`${s.name}, ${c.name}`} className={v == null ? 'unassessed' : ''} value={v ?? ''} onChange={(e) => setScore(s.id, c.id, e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">Unassessed</option>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="total"><td>Weighted score</td><td />{results.map((r) => <td key={r.id}><b>{r.score ?? '—'}</b><span className="fine"> / 100</span></td>)}</tr>
              <tr><td>Assessment coverage</td><td>min {COVERAGE_MIN}%</td>{results.map((r) => <td key={r.id}><Chip tone={r.coverage >= COVERAGE_MIN ? 'ok' : 'warn'}>{r.coverage}%</Chip></td>)}</tr>
              <tr>
                <td>Hard constraints</td><td />
                {results.map((r) => (
                  <td key={r.id}>
                    {r.breaches.length
                      ? r.breaches.map((b) => <Chip key={b.id} tone={b.status === 'approved' ? 'bad' : 'warn'}>{b.status === 'approved' ? 'Breaches approved constraint' : 'Would breach proposed constraint'}</Chip>)
                      : <Chip tone="ok">None breached</Chip>}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Rank</td><td />
                {results.map((r) => <td key={r.id}>{r.infeasible ? <Chip tone="bad">Infeasible</Chip> : r.rank == null ? <Chip tone="warn">Not ranked</Chip> : <b>#{r.rank}</b>}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="fine">S = Σ wᵢrᵢ ÷ Σ wᵢ over assessed criteria only, with rᵢ normalised to 0–100. Because unassessed criteria are left out, coverage is shown beside every score and scenarios under {COVERAGE_MIN}% are not ranked. Hard constraints apply separately: a scenario that breaches an approved constraint is infeasible whatever its score.</p>
      </Section>

      <div className="grid-3">
        {results.map((r) => (
          <Section key={r.id} title={`${r.id}. ${r.name}`}>
            <p>{r.desc}</p>
            {r.unassessed.length > 0 && <p className="fine">Unassessed: {r.unassessed.join(', ')}.</p>}
          </Section>
        ))}
      </div>

      <Section title="Constraints register">
        {constraints.map((c) => (
          <div key={c.id} className="line">
            <Chip tone={c.status === 'approved' ? 'bad' : 'warn'}>{c.status === 'approved' ? 'Approved' : 'Proposed'}</Chip>
            <span>{c.text}. Breached by scenario {c.breachedBy.join(', ')}. {c.status !== 'approved' && 'Becomes binding when the related decision is approved.'}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
