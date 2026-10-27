import type { ReactNode } from 'react';
import type { EvidenceStatus, Fact, Tone } from '../../types/domain';
import { STATUS } from '../../features/reference';

export function Chip({ tone = 'muted', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className={`chip chip-${tone}`} title={title}>{children}</span>;
}

export function StatusChip({ status }: { status: EvidenceStatus }) {
  return <Chip tone={STATUS[status].tone}>{STATUS[status].label}</Chip>;
}

/** Inline field value underlined in its evidence-status colour. */
export function FactInline({ f }: { f: Fact }) {
  if (!f.value) return <span className="fact-mark st-unknown">unknown</span>;
  return <span className={`fact-mark st-${f.status}`} title={STATUS[f.status].label}>{f.value}</span>;
}

export function StatusLegend() {
  return (
    <p className="fine legend">
      Field markers:{' '}
      {(Object.keys(STATUS) as EvidenceStatus[]).map((k) => <span key={k} className={`fact-mark st-${k}`}>{STATUS[k].label}</span>)}
    </p>
  );
}
