import type { ReactNode } from 'react';

interface Props {
  kind?: 'primary' | 'secondary';
  small?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  children: ReactNode;
}

export function Button({ kind = 'secondary', small, disabled, title, onClick, children }: Props) {
  return (
    <button type="button" className={`btn btn-${kind}${small ? ' btn-sm' : ''}`} disabled={disabled} title={title} onClick={onClick}>
      {children}
    </button>
  );
}
