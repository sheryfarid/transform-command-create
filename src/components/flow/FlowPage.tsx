import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AI_STAGES, STAGES } from '../../features/reference';
import { COMPONENTS, LAYERS, SLICE } from '../../features/slice';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Button, Section } from '../ui';

const MAPPING: [string, string][] = [
  ['Zustand store persisted to local storage', 'PostgreSQL with tenant IDs, row-level security, optimistic locking'],
  ['Role switcher in the header', 'Microsoft Entra ID groups mapped to programme roles'],
  ['Timed pipeline ticks, sample candidate facts', 'Celery workers extracting from CSV, XLSX, DOCX and text PDFs'],
  ['Deterministic rules engine labelled “simulated LLM”', 'Orchestrator, retrieval and LLM synthesis behind the same assurance checks'],
  ['Field-level fact records with status and history', 'attribute_assertions table linked to evidence_items'],
  ['Audit list in governance', 'Append-only audit_events with immutable decision history'],
];

export function FlowPage() {
  const st = useProgrammeState();
  const navigate = useNavigate();
  const firstOpen = SLICE.findIndex((s) => !s.done(st));
  const [sel, setSel] = useState(firstOpen < 0 ? 0 : firstOpen);
  const step = SLICE[sel];
  const doneCount = SLICE.filter((s) => s.done(st)).length;

  return (
    <div className="stack">
      <Section title="Vertical slice" aside={<span className="fine">{doneCount} of {SLICE.length} steps completed with persisted records</span>}>
        <ol className="slice">
          {SLICE.map((s, i) => {
            const done = s.done(st);
            return (
              <li key={s.title}>
                <button type="button" className={`slice-step ${sel === i ? 'on' : ''} ${done ? 'done' : i === firstOpen ? 'next' : ''}`} onClick={() => setSel(i)}>
                  <span className="slice-n">{done ? '✓' : i + 1}</span><span>{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

      <div className="grid-flow">
        <Section title={`Step ${sel + 1}: ${step.title}`} aside={sel > 0 && <Button small onClick={() => navigate(step.path)}>Open screen</Button>}>
          <p>{step.what}</p>
          <h4>Production endpoints</h4>
          <ul className="mono-list">{step.api.map((a) => <li key={a}><code>{a}</code></li>)}</ul>
          <p className="fine">Highlighted components take part in this step.</p>
        </Section>
        <Section title="Architecture">
          <div className="arch">
            {LAYERS.map((layer, li) => (
              <div key={layer} className="arch-layer">
                <span className="arch-label">{layer}</span>
                <div className="arch-row">
                  {COMPONENTS.filter((c) => c.layer === li).map((c) => (
                    <div key={c.id} className={`arch-box ${step.comps.includes(c.id) ? 'on' : ''}`}><b>{c.name}</b><span>{c.note}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid-2">
        <Section title="Document pipeline">
          <ol className="flow-list">{STAGES.map((s) => <li key={s}>{s}</li>)}<li>Human review: accept, reject or revoke</li><li>Publish accepted facts to the discovery model</li></ol>
        </Section>
        <Section title="AI pipeline">
          <ol className="flow-list">{AI_STAGES.map((s) => <li key={s}>{s}</li>)}<li>Human review and approval</li></ol>
          <p className="fine">If evidence is insufficient, the pipeline creates evidence requests instead of a recommendation.</p>
        </Section>
      </div>

      <Section title="How this prototype maps to Release 1">
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th>Here</th><th>In production</th></tr></thead>
            <tbody>{MAPPING.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
