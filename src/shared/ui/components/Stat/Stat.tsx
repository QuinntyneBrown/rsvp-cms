import type { ReactNode } from 'react';
import { Card, VisuallyHidden } from '../index.js';
import './Stat.css';

export type StatTrend = 'up' | 'down';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Change since the previous period, e.g. "+4 this week". */
  delta?: ReactNode;
  /** Direction of the delta; colours it and is announced as "Up" / "Down" (colour alone is not enough). */
  trend?: StatTrend;
  /** Shows the stat on its own card, as on the dashboard and event overview. */
  card?: boolean;
}

/** A labelled key number with an optional change. Design system: docs/design-system/components/stat.html. */
export function Stat({ label, value, delta, trend, card }: StatProps) {
  const content = (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {delta !== undefined && (
        <span className={trend ? `stat__delta stat__delta--${trend}` : 'stat__delta'}>
          {trend && (
            <>
              <span aria-hidden="true">{trend === 'up' ? '↑' : '↓'}</span>
              <VisuallyHidden>{trend === 'up' ? 'Up' : 'Down'}</VisuallyHidden>
            </>
          )}
          {delta}
        </span>
      )}
    </div>
  );
  return card ? <Card>{content}</Card> : content;
}
