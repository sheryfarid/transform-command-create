import { fmt } from '../../features/utils';
import { useProgrammeStore } from '../../stores/programmeStore';
import { Button, Chip, Gate, Section, useCan } from '../ui';

export function GovernancePage() {
  const decisions = useProgrammeStore((s) => s.decisions);
  const risks = useProgrammeStore((s) => s.risks);
  const audit = useProgrammeStore((s) => s.audit);
  const decide = useProgrammeStore((s) => s.decide);
  const resolveRisk = useProgrammeStore((s) => s.resolveRisk);
  const gate = useCan('approveDecision');

  return (
    <div className="stack">
      <Section title={`Decisions (${decisions.length})`}>
        <Gate perm="approveDecision" />
        {!decisions.length && <p className="fine">Decisions are raised when a reviewer accepts a recommendation in the strategy consultant.</p>}
        {decisions.map((d) => (
          <div key={d.id} className="decision">
            <div className="row-wrap">
              <Chip tone={d.status === 'approved' ? 'ok' : d.status === 'rejected' ? 'muted' : 'warn'}>{d.status === 'pending' ? 'Awaiting approval' : d.status}</Chip>
              <b>{d.title}</b>
            </div>
            <p className="fine">Designated approver: {d.requiredRole}.{d.constraintId ? ' Approving makes the related constraint binding in scenario scoring.' : ''}</p>
            {d.history.map((h, i) => <div key={i} className="fine">{fmt(h.ts)}: {h.action} by {h.by}</div>)}
            {d.status === 'pending' && (
              <div className="row-wrap">
                <Button kind="primary" small disabled={!gate.allowed} title={gate.title} onClick={() => decide(d.id, 'approved')}>Approve decision</Button>
                <Button small disabled={!gate.allowed} title={gate.title} onClick={() => decide(d.id, 'rejected')}>Reject decision</Button>
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Risk register">
        {risks.map((r) => (
          <div key={r.id} className="line">
            <Chip tone={r.status === 'resolved' ? 'muted' : r.severity === 'Critical' ? 'bad' : 'warn'}>{r.status === 'resolved' ? 'Resolved' : r.severity}</Chip>
            <span>{r.title} <span className="fine">({r.source})</span></span>
            {r.status === 'open' && <Button small onClick={() => resolveRisk(r.id)}>Mark resolved</Button>}
          </div>
        ))}
        {!risks.length && <p className="fine">No risks recorded.</p>}
      </Section>

      <Section title={`Audit trail (${audit.length})`} aside={<span className="fine">Append-only. Every state change records actor, action, entity and time.</span>}>
        <div className="scroll-x audit">
          <table className="table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
            <tbody>{audit.slice(0, 80).map((e) => <tr key={e.id}><td className="fine">{fmt(e.ts)}</td><td>{e.actor}</td><td>{e.action}</td><td>{e.entity}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
