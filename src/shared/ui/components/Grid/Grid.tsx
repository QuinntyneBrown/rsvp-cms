import type { HTMLAttributes, ReactNode } from 'react';
import './Grid.css';

export type GridElement = 'div' | 'section' | 'ul';

export interface GridProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** Auto-fill columns of at least 18rem (cards) instead of the 4/8/12-column layout grid. */
  auto?: boolean;
  /** With `auto`, columns of at least 10rem (stat tiles). */
  compact?: boolean;
  as?: GridElement;
  children: ReactNode;
}

/** Lays children out in columns. Design system: docs/design-system/components/grid.html. */
export function Grid({ auto, compact, as = 'div', children, ...rest }: GridProps) {
  const Tag = as;
  const classes = ['grid'];
  if (auto) classes.push(compact ? 'grid--auto-compact' : 'grid--auto');
  return (
    <Tag {...rest} className={classes.join(' ')}>
      {children}
    </Tag>
  );
}
