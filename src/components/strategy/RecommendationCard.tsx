import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StrategyRecommendation, Tone } from '../../types/domain';
import { useProgrammeStore } from '../../stores/programmeStore';
import { Button, Chip, Gate, Section, StatusChip, useCan } from '../ui';

const levelTone = (l: string): Tone => (l === 'high' ? 'ok' : l === 'medium' ? 'info' : l === 'n/a' ? 'muted' : 'warn');

function statusChip(r: StrategyRecommendation) {
  if (r.status === 'approved') return <Chip tone="ok">Accepted</Chip>;
  if (r.status === 'rejected') return <Chip tone="muted">Rejected</Chip>;
  if (r.status === 'review') return <Chip tone="bad">Blocked by assurance</Chip>;
  return <Chip tone="info">Draft, awaiting review</Chip>;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><h4>{title}</h4><ul>{items.map((a, i) => <li key={i}>{a}</li>)}</ul></div>;
}

export function RecommendationCard({ rec: r }: { rec: StrategyRecommendation }) {
  const reviewRecommendation = useProgrammeStore((s) => s.reviewRecommendation);
  const requestEvidence = useProgrammeStore((s) => s.requestEvidence);
  const gate = useCan('reviewRec');
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <Section className="rec" title={r.title} aside={statusChip(r)}>
      <p className="fine">{r.specialist}, {r.recommendationType.replace(/_/g, ' ')}. {r.modelVersion}, prompt {r.promptVersion}.</p>
      <p>{r.rationale}</p>

      <div className="conf">
        <div><span className="fine">Strategic judgement</span><Chip tone={levelTone(r.confidence.level)}>{r.confidence.level}</Chip><span className="fine">{r.confidence.basis}</span></div>
        <div><span className="fine">Evidence extraction</span><Chip tone={levelTone(r.extraction.level)}>{r.extraction.level}</Chip><span className="fine">{r.extraction.basis}</span></div>
      </div>

      <div className="facts-list">
        {r.facts.map((f, i) => <div key={i} className={`fact-line st-${f.evidenceStatus}`}><StatusChip status={f.evidenceStatus} /><span>{f.description}</span></div>)}
      </div>

      <div className="rec-meta">
        <List title="Assumptions" items={r.assumptions} />
        <List title="Missing evidence" items={r.missingEvidence} />
        <List title="Alternatives" items={r.alternatives} />
        <List title="Risks" items={r.risks} />
      </div>

      {r.status === 'review' && (
        <div className="callout bad">
          <b>Assurance reviewer: not supported by enough evidence.</b>
          {r.assurance.issues.map((x, i) => <p key={i}>{x}</p>)}
          <Button small disabled={!r.missingEvidence.length} onClick={() => requestEvidence(r)}>Request missing evidence</Button>
        </div>
      )}

      {r.status === 'draft' && (
        <div className="row-wrap">
          <Button kind="primary" disabled={!gate.allowed} title={gate.title} onClick={() => reviewRecommendation(r.id, 'approved')}>Accept recommendation</Button>
          {rejecting ? (
            <>
              <input placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button onClick={() => { reviewRecommendation(r.id, 'rejected', reason); setRejecting(false); }}>Reject recommendation</Button>
            </>
          ) : (
            <Button disabled={!gate.allowed} title={gate.title} onClick={() => setRejecting(true)}>Reject…</Button>
          )}
          <Gate perm="reviewRec" />
        </div>
      )}
      {r.status === 'approved' && (
        <p className="fine">Accepted by {r.reviewedBy}. A decision is waiting for Executive Sponsor approval. <button type="button" className="link" onClick={() => navigate('/governance')}>Open governance</button></p>
      )}
      {r.status === 'rejected' && <p className="fine">Rejected by {r.reviewedBy}: {r.rejectReason}</p>}
    </Section>
  );
}
