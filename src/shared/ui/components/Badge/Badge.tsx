import type { ReactNode } from 'react';
import { VisuallyHidden } from '../../primitives/index.js';
import './Badge.css';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeBaseProps {
  tone?: BadgeTone;
  /** Filled, high-emphasis look. */
  solid?: boolean;
}

export interface StatusBadgeProps extends BadgeBaseProps {
  count?: undefined;
  children: ReactNode;
}

export interface CountBadgeProps {
  /** Numeric count (e.g. unread notifications); shown as a red pill without the status dot. */
  count: number;
  /** Accessible name for the count, e.g. "3 unread"; required because a bare number has no meaning. */
  label: string;
}

export type BadgeProps = StatusBadgeProps | CountBadgeProps;

/** A short, non-interactive status label or count. Design system: docs/design-system/components/badge.html. */
export function Badge(props: BadgeProps) {
  if (props.count !== undefined) {
    return (
      // aria-label is not allowed on a generic span, so the name is visually hidden text and the bare number is hidden.
      <span className="badge badge--count">
        <span aria-hidden="true">{props.count}</span>
        <VisuallyHidden>{props.label}</VisuallyHidden>
      </span>
    );
  }
  const { tone = 'neutral', solid, children } = props;
  const classes = ['badge'];
  if (solid) classes.push('badge--solid');
  else if (tone !== 'neutral') classes.push(`badge--${tone}`);
  return <span className={classes.join(' ')}>{children}</span>;
}
