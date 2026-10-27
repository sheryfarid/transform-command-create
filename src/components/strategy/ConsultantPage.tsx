import { useEffect, useState } from 'react';
import { AI_STAGES } from '../../features/reference';
import { computeMetric } from '../../features/metrics';
import { TOPICS } from '../../features/topics';
import { useProgrammeStore } from '../../stores/programmeStore';
import { useProgrammeState } from '../../hooks/useProgramme';
import { Button, Empty, Section } from '../ui';
import { RecommendationCard } from './RecommendationCard';

export function ConsultantPage() {
  const st = useProgrammeState();
  const runAssessment = useProgrammeStore((s) => s.runAssessment);
  const createConsultantRequests = useProgrammeStore((s) => s.createConsultantRequests);
  const [topic, setTopic] = useState<string | null>(null);
  const [stage, setStage] = useState(-1);

  // Visualises the AI pipeline stages; production streams real stage events from the orchestrator.
  useEffect(() => {
    if (stage < 0) return;
    if (stage >= AI_STAGES.length) { runAssessment(); setStage(-1); return; }
    const t = setTimeout(() => setStage(stage + 1), 280);
    return () => clearTimeout(t);
  }, [stage, runAssessment]);

  if (!st.systems.length || !st.programme) {
    return <Empty title="The consultant needs programme context"><p>It reasons only over approved programme records and evidence. Import the inventory first.</p></Empty>;
  }

  const verifiedPct = computeMetric('inventory_completeness', st, st.systems).value;
  const proposed = topic ? TOPICS[topic](st) : [];
  const running = stage >= 0;

  return (
    <div className="stack">
      <div className="context-bar">
        <span>Programme context: <b>{st.programme.name}</b></span>
        <span>{st.systems.length} systems</span>
        <span>{verifiedPct}% of mandatory fields verified</span>
        <span>{st.docs.filter((d) => d.status === 'review').length} documents in evidence scope</span>
      </div>

      <div className="grid-2">
        <Section title="Guided interview">
          <div className="consult-msg">
            <p>Before evaluating global consolidation, I need to establish which systems have mandatory country-specific processes and which share master data.</p>
            <p>Which aspect would you like to investigate first?</p>
          </div>
          <div className="topic-list">
            {Object.keys(TOPICS).map((t) => <button type="button" key={t} className={`topic ${topic === t ? 'on' : ''}`} onClick={() => setTopic(t)}>{t}</button>)}
          </div>
          {topic && (
            <div className="proposed">
              <p className="fine">Proposed evidence requests, generated from current gaps:</p>
              {proposed.length ? <ul>{proposed.map((p, i) => <li key={i}>{p.text}</li>)}</ul> : <p className="fine">No open gaps for this topic.</p>}
              <Button kind="primary" disabled={!proposed.length} onClick={() => createConsultantRequests(topic, proposed)}>Create {proposed.length} evidence requests</Button>
            </div>
          )}
        </Section>

        <Section
          title="Strategy assessment"
          aside={<Button kind="primary" disabled={running} onClick={() => setStage(0)}>{running ? 'Running…' : st.recs.length ? 'Rerun assessment' : 'Run assessment'}</Button>}
        >
          <ol className="ai-stages">
            {AI_STAGES.map((s, i) => <li key={s} className={stage > i || (!running && st.flags.aiRuns > 0) ? 'done' : stage === i ? 'now' : ''}>{s}</li>)}
          </ol>
          <p className="fine">Specialists: Discovery Analyst, Master Data Adviser, SAP Migration Adviser, Strategy Analyst and Assurance Reviewer. Deterministic rules run before synthesis; every output is saved as a draft for human review. Reruns keep reviewed recommendations.</p>
        </Section>
      </div>

      {st.recs.map((r) => <RecommendationCard key={r.id} rec={r} />)}
    </div>
  );
}
