import type { ReactNode } from 'react';
import './InlineStatus.css';

export type InlineStatusTone = 'neutral' | 'success' | 'danger';

export interface InlineStatusProps {
  tone?: InlineStatusTone;
  /** Leading status dot; `pulse` animates it while work is in progress (e.g. "Publishing…"). */
  dot?: 'static' | 'pulse';
  /** Optional leading glyph, e.g. `<Icon name="check" size="sm" />`. */
  icon?: ReactNode;
  /** Makes the text a polite live region so changes ("Saved at 10:42 am") are announced. */
  live?: boolean;
  children: ReactNode;
}

/** Short inline save/progress state next to actions. Design system: docs/design-system/components/inline-status.html. */
export function InlineStatus({ tone = 'neutral', dot, icon, live, children }: InlineStatusProps) {
  const className = tone === 'neutral' ? 'inline-status' : `inline-status inline-status--${tone}`;
  return (
    <span className={className} role={live ? 'status' : undefined}>
      {dot && <span className={dot === 'pulse' ? 'dot dot--pulse' : 'dot'} aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}
