import { METRICS, type MetricId } from '../../features/reference';
import { computeMetric, explainMetric } from '../../features/metrics';
import { fmt, now } from '../../features/utils';
import { useScopedSystems } from '../../stores/programmeStore';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Drawer } from '../ui';

/** AIInsightDrawer: KPI definition, provenance and the source records behind it. */
export function MetricDrawer({ id, onClose }: { id: MetricId; onClose: () => void }) {
  const st = useProgrammeState();
  const systems = useScopedSystems();
  const m = METRICS.find((x) => x.id === id)!;
  const r = computeMetric(id, st, systems);
  const ex = explainMetric(id, st, systems);

  return (
    <Drawer title={m.name} onClose={onClose}>
      <div className="metric-big">{r.value}{m.unit}</div>
      <dl className="defs">
        <dt>Calculation</dt><dd>{m.def}</dd>
        <dt>Registry version</dt><dd>{m.version}</dd>
        <dt>Values</dt><dd>{r.den != null ? `${r.num} ÷ ${r.den}` : r.num}</dd>
        <dt>Scope</dt><dd>{st.region === 'All' ? 'All regions' : st.region}, {systems.length} systems</dd>
        <dt>Calculated</dt><dd>{fmt(now())}</dd>
      </dl>
      <div className="ask">
        <p className="ask-q">“{ex.question}”</p>
        {ex.rows.length
          ? <ul className="ask-list">{ex.rows.slice(0, 12).map((row, i) => <li key={i}><b>{row.id}</b> {row.text}</li>)}</ul>
          : <p className="fine">No source records match this question.</p>}
        {ex.rows.length > 12 && <p className="fine">{ex.rows.length - 12} more source records.</p>}
      </div>
    </Drawer>
  );
}
