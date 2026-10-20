import type { HTMLAttributes, ReactNode } from 'react';
import './Cluster.css';

export type ClusterJustify = 'start' | 'between' | 'end';

export interface ClusterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  justify?: ClusterJustify;
  children: ReactNode;
}

/** Lays children out in a wrapping row. Design system: docs/design-system/components/cluster.html. */
export function Cluster({ justify = 'start', children, ...rest }: ClusterProps) {
  return (
    <div {...rest} className={justify === 'start' ? 'cluster' : `cluster cluster--${justify}`}>
      {children}
    </div>
  );
}
