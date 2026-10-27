import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AssessmentState } from '../../types/domain';
import { ASSESS_TONE, COUNTRIES, EVID_TONE, SAMPLE_CSV } from '../../features/reference';
import { assessmentState, evidenceState, gapsFor } from '../../features/inventory';
import { fmt } from '../../features/utils';
import { useProgrammeStore, useScopedSystems } from '../../stores/programmeStore';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Button, Chip, FactInline, Section, StatusLegend } from '../ui';
import { SystemDrawer } from './SystemDrawer';

const STATE_FILTERS: ('All' | AssessmentState)[] = ['All', 'Validation Required', 'In Assessment', 'Assessed', 'Baseline Approved'];

export function InventoryPage() {
  const st = useProgrammeState();
  const systems = useScopedSystems();
  const importInventory = useProgrammeStore((s) => s.importInventory);
  const { id: selectedId } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [product, setProduct] = useState('All');
  const [state, setState] = useState<(typeof STATE_FILTERS)[number]>('All');

  const products = ['All', ...new Set(st.systems.map((s) => s.product))];
  const needle = q.toLowerCase();
  const rows = systems.filter((s) =>
    (product === 'All' || s.product === product) &&
    (state === 'All' || assessmentState(s, st) === state) &&
    (!needle || `${s.id} ${s.facts.sid.value} ${COUNTRIES[s.country]} ${s.facts.owner.value}`.toLowerCase().includes(needle)));
  const rep = st.importReport;

  return (
    <div className="stack">
      <Section title="Import ERP inventory" aside={<span className="fine">Columns: system_id, sid, landscape, country, product, release, client, company_codes, deployment, owner, domains</span>}>
        <div className="row-wrap">
          <Button kind="primary" onClick={() => importInventory(SAMPLE_CSV, 'sample_inventory.csv')}>
            {st.systems.length ? 'Reimport sample inventory' : 'Import sample inventory (26 rows)'}
          </Button>
          {st.systems.length > 0 && <span className="fine">Reimporting clears documents, decisions and recommendations for this programme.</span>}
        </div>
        {rep && (
          <div className="report">
            <div className="report-stats">
              <span><b>{rep.total}</b> rows read</span>
              <span><b>{rep.accepted}</b> accepted</span>
              <span className={rep.errors.length ? 'bad' : ''}><b>{rep.errors.length}</b> rejected</span>
              <span className={rep.warnings.length ? 'warn' : ''}><b>{rep.warnings.length}</b> warnings</span>
              <span className="fine">{rep.source}, {fmt(rep.at)}</span>
            </div>
            {rep.errors.map((e, i) => <div key={`e${i}`} className="line"><Chip tone="bad">Line {e.line}</Chip><span>{e.msg}</span></div>)}
            {rep.warnings.map((w, i) => <div key={`w${i}`} className="line"><Chip tone="warn">Ambiguous</Chip><span>{w.msg}</span></div>)}
          </div>
        )}
      </Section>

      {st.systems.length > 0 && (
        <Section
          title={`Source systems (${rows.length})`}
          aside={
            <div className="filters">
              <input placeholder="Search ID, SID, country or owner" value={q} onChange={(e) => setQ(e.target.value)} />
              <select value={product} onChange={(e) => setProduct(e.target.value)}>{products.map((p) => <option key={p}>{p}</option>)}</select>
              <select value={state} onChange={(e) => setState(e.target.value as typeof state)}>{STATE_FILTERS.map((p) => <option key={p}>{p}</option>)}</select>
            </div>
          }
        >
          <div className="scroll-x">
            <table className="table hover">
              <thead><tr><th>System</th><th>SID / client</th><th>Country</th><th>Product and release</th><th>Source owner</th><th>Assessment</th><th>Evidence</th><th>Gaps</th></tr></thead>
              <tbody>
                {rows.map((s) => {
                  const a = assessmentState(s, st);
                  const e = evidenceState(s, st);
                  const g = gapsFor(s).length;
                  const open = () => navigate(`/landscapes/${s.id}`);
                  return (
                    <tr key={s.id} onClick={open} tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && open()}>
                      <td><b>{s.id}</b><div className="fine">{s.landscape}</div></td>
                      <td><FactInline f={s.facts.sid} /> / <FactInline f={s.facts.client} /></td>
                      <td>{COUNTRIES[s.country]}</td>
                      <td>{s.product} <FactInline f={s.facts.release} /></td>
                      <td><FactInline f={s.facts.owner} /></td>
                      <td><Chip tone={ASSESS_TONE[a]}>{a}</Chip></td>
                      <td><Chip tone={EVID_TONE[e]}>{e}</Chip></td>
                      <td>{g ? <Chip tone="warn">{g}</Chip> : <span className="fine">None</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <StatusLegend />
        </Section>
      )}

      {selectedId && <SystemDrawer id={selectedId} onClose={() => navigate('/landscapes')} />}
    </div>
  );
}
