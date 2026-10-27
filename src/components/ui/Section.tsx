import type { ReactNode } from 'react';

export function Section({ title, aside, children, className = '' }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && <div className="panel-head">{title && <h2>{title}</h2>}{aside}</div>}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}

export function Meter({ value }: { value: number }) {
  return <span className="meter"><span className="meter-track"><i style={{ width: `${value}%` }} /></span>{value}%</span>;
}
