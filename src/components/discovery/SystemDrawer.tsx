import { useState } from 'react';
import { ASSESS_TONE, COUNTRIES, EVID_TONE, FIELD_LABEL, MANDATORY, STATUS } from '../../features/reference';
import { allCandidates, assessmentState, evidenceState, gapsFor } from '../../features/inventory';
import { fmt } from '../../features/utils';
import { useProgrammeStore } from '../../stores/programmeStore';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Button, Chip, Drawer, Gate, StatusChip, useCan } from '../ui';

const TABS = ['Overview', 'Structure', 'Evidence', 'Findings'] as const;

/** ERP detail. Production adds the Architecture, Modules, Master Data and Interfaces tabs. */
export function SystemDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useProgrammeState();
  const resolveValidation = useProgrammeStore((s) => s.resolveValidation);
  const gate = useCan('resolveValidation');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const s = st.systems.find((x) => x.id === id);
  if (!s) return null;

  const a = assessmentState(s, st);
  const e = evidenceState(s, st);
  const cands = allCandidates(st).filter((c) => c.systemId === id);
  const gaps = gapsFor(s);
  const siblings = st.systems.filter((o) => o.id !== s.id && o.facts.sid.value && o.facts.sid.value === s.facts.sid.value);
  const codes = s.facts.companyCodes.value ? s.facts.companyCodes.value.split(';') : ['unknown'];

  return (
    <Drawer title={s.id} onClose={onClose}>
      <div className="row-wrap">
        <Chip tone={ASSESS_TONE[a]}>{a}</Chip>
        <Chip tone={EVID_TONE[e]}>Evidence: {e}</Chip>
        <span className="fine">{COUNTRIES[s.country]}, {s.product}</span>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button type="button" key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div className="facts">
          {MANDATORY.map((m) => {
            const f = s.facts[m.key];
            return (
              <div key={m.key} className={`fact st-${f.status}`}>
                <div className="fact-top"><span className="fact-label">{m.label}</span><StatusChip status={f.status} /></div>
                <div className="fact-value">{f.value || '—'}</div>
                {f.history.length > 0 && (
                  <details>
                    <summary>History ({f.history.length})</summary>
                    {f.history.map((h, i) => <div key={i} className="fine">{fmt(h.ts)}: “{h.value || 'blank'}” ({STATUS[h.status].label}). {h.note}</div>)}
                  </details>
                )}
              </div>
            );
          })}
          <div className="fact st-user_asserted">
            <div className="fact-top"><span className="fact-label">Data domains</span><Chip tone="info">Provisional</Chip></div>
            <div className="fact-value">{s.domains.join(', ') || '—'}</div>
          </div>
        </div>
      )}

      {tab === 'Structure' && (
        <div>
          <p className="fine">Landscape, SID, client, company code and legal entity are separate records, so one row in the inventory is never assumed to be one migration.</p>
          <ul className="tree">
            <li><span>Landscape</span> {s.landscape} <span className="fine">({s.region})</span>
              <ul><li><span>SAP instance (SID)</span> {s.facts.sid.value || 'unknown'}
                <ul><li><span>Client</span> {s.facts.client.value || 'unknown'}
                  <ul>{codes.map((cc) => (
                    <li key={cc}><span>Company code</span> {cc}
                      <ul><li><span>Legal entity</span> {cc === 'unknown' ? 'unknown' : `Northwind ${COUNTRIES[s.country]} ${cc.slice(-2)} (provisional)`}</li></ul>
                    </li>
                  ))}</ul>
                </li></ul>
              </li></ul>
            </li>
          </ul>
          {siblings.map((o) => <p key={o.id} className="callout warn">Shares SID {s.facts.sid.value} with {o.id} (client {o.facts.client.value || 'unknown'}).</p>)}
        </div>
      )}

      {tab === 'Evidence' && (cands.length
        ? cands.map((c) => (
          <div key={c.id} className="line">
            <Chip tone={c.state === 'accepted' ? 'ok' : c.state === 'pending' ? 'violet' : 'muted'}>{c.state}</Chip>
            <span>{FIELD_LABEL[c.field]} “{c.value}” from {c.docName}, {c.location} ({Math.round(c.confidence * 100)}%)</span>
          </div>
        ))
        : <p className="fine">No document evidence references this system yet.</p>)}

      {tab === 'Findings' && (
        <div className="stack-sm">
          {s.validation.map((v, i) => (
            <div key={i} className="callout warn">
              <p>{v}</p>
              {s.validationResolved
                ? <p className="fine">Confirmed as separate clients on a shared instance.</p>
                : <>
                  <Button small disabled={!gate.allowed} title={gate.title} onClick={() => resolveValidation(s.facts.sid.value)}>Confirm separate clients on one instance</Button>
                  <Gate perm="resolveValidation" />
                </>}
            </div>
          ))}
          {gaps.map((g) => <div key={g.field} className="line"><Chip tone={g.kind === 'Disputed' ? 'bad' : 'warn'}>{g.kind}</Chip><span>{g.label} ({g.severity} priority)</span></div>)}
          {!gaps.length && !s.validation.length && <p className="fine">No open findings.</p>}
        </div>
      )}
    </Drawer>
  );
}
