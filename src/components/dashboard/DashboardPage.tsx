import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentState } from '../../types/domain';
import { ASSESS_TONE, FIELD_LABEL, METRICS, REGIONS, type MetricId } from '../../features/reference';
import { allCandidates, assessmentState, gapsFor } from '../../features/inventory';
import { computeMetric } from '../../features/metrics';
import { isMissing, pct } from '../../features/utils';
import { useProgrammeStore, useScopedSystems } from '../../stores/programmeStore';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Button, Chip, Empty, Meter, Section, StatusChip } from '../ui';
import { MetricDrawer } from './MetricDrawer';

const STATES: AssessmentState[] = ['Validation Required', 'In Assessment', 'Assessed', 'Baseline Approved'];

export function DashboardPage() {
  const st = useProgrammeState();
  const systems = useScopedSystems();
  const navigate = useNavigate();
  const markSeen = useProgrammeStore((s) => s.markDashboardSeen);
  const [metric, setMetric] = useState<MetricId | null>(null);

  const anyReviewed = st.recs.some((r) => r.status === 'approved' || r.status === 'rejected');
  useEffect(() => { if (anyReviewed && !st.flags.dashboardAfterReview) markSeen(); }, [anyReviewed, st.flags.dashboardAfterReview, markSeen]);

  if (!st.systems.length) {
    return (
      <Empty title="No ERP inventory yet">
        <p>The executive view is calculated from records. Import the inventory to populate it.</p>
        <Button kind="primary" onClick={() => navigate('/landscapes')}>Go to ERP inventory</Button>
      </Empty>
    );
  }

  const noOwner = systems.filter((s) => isMissing(s.facts.owner.value));
  const candidates = allCandidates(st);
  const recent = candidates.filter((c) => c.state === 'accepted').slice(-5).reverse();
  const openRisks = st.risks.filter((r) => r.status === 'open');

  return (
    <div className="stack">
      <div className="insight">
        <div>
          <strong>Consultant insight</strong>
          <p>
            {noOwner.length
              ? `Source owner is missing in ${noOwner.length} of ${systems.length} systems in scope. Discovery answers and evidence review stall without an accountable owner, so close these gaps before finalising the governance strategy.`
              : 'Every system in scope has a recorded source owner. Focus next on verifying release levels for the ECC estate.'}
          </p>
        </div>
        <Button onClick={() => navigate('/discovery')}>Review gaps</Button>
      </div>

      <div className="kpis">
        {METRICS.map((m) => {
          const r = computeMetric(m.id, st, systems);
          return (
            <button type="button" key={m.id} className="kpi" onClick={() => setMetric(m.id)}>
              <span className="kpi-name">{m.name}</span>
              <span className="kpi-value">{r.value}{m.unit && <small>{m.unit}</small>}</span>
              <span className="kpi-sub">{r.den != null ? `${r.num} of ${r.den}` : 'count'}, v{m.version}</span>
            </button>
          );
        })}
        <div className="kpi kpi-locked">
          <span className="kpi-name">Global readiness score</span>
          <span className="kpi-value muted">Not calculated</span>
          <span className="kpi-sub">Needs an approved weighting model, minimum evidence and hard-stop conditions.</span>
        </div>
      </div>

      <div className="grid-2">
        <Section title="Regional readiness">
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Region</th><th>Systems</th><th>Verified fields</th><th>Assessed</th><th>Open gaps</th></tr></thead>
              <tbody>
                {REGIONS.map((region) => {
                  const sys = st.systems.filter((s) => s.region === region);
                  if (!sys.length) return null;
                  return (
                    <tr key={region}>
                      <td>{region}</td>
                      <td>{sys.length}</td>
                      <td><Meter value={computeMetric('inventory_completeness', st, sys).value} /></td>
                      <td><Meter value={computeMetric('assessment_coverage', st, sys).value} /></td>
                      <td>{sys.reduce((a, s) => a + gapsFor(s).length, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Assessment lifecycle">
          <div className="dist">
            {STATES.map((state) => {
              const n = systems.filter((x) => assessmentState(x, st) === state).length;
              return (
                <div key={state} className="dist-row">
                  <span>{state}</span>
                  <div className="bar"><i className={`tone-${ASSESS_TONE[state]}`} style={{ width: `${pct(n, systems.length)}%` }} /></div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
          <p className="fine">Evidence status is tracked separately from assessment status. A system can be fully assessed on asserted data and still have no verified evidence.</p>
        </Section>
      </div>

      <div className="grid-3">
        <Section title="Critical and high risks" aside={<Button small onClick={() => navigate('/governance')}>All risks</Button>}>
          {openRisks.slice(0, 4).map((r) => (
            <div key={r.id} className="line"><Chip tone={r.severity === 'Critical' ? 'bad' : 'warn'}>{r.severity}</Chip><span>{r.title}</span></div>
          ))}
          {!openRisks.length && <p className="fine">No open risks.</p>}
        </Section>
        <Section title="Governance queue">
          <div className="line"><b>{st.decisions.filter((d) => d.status === 'pending').length}</b><span>decisions awaiting approval</span></div>
          <div className="line"><b>{candidates.filter((c) => c.state === 'pending').length}</b><span>evidence items awaiting review</span></div>
          <div className="line"><b>{st.questions.filter((q) => q.status === 'open').length}</b><span>open discovery questions</span></div>
          <div className="line"><b>{st.recs.filter((r) => r.status === 'draft').length}</b><span>recommendations awaiting review</span></div>
        </Section>
        <Section title="Recently verified evidence">
          {recent.length
            ? recent.map((c) => <div key={c.id} className="line"><StatusChip status="verified" /><span>{c.systemId} {FIELD_LABEL[c.field].toLowerCase()} from {c.docName}</span></div>)
            : <p className="fine">Nothing verified yet. Upload a document and accept its facts.</p>}
        </Section>
      </div>

      {metric && <MetricDrawer id={metric} onClose={() => setMetric(null)} />}
    </div>
  );
}
