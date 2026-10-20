import type { HTMLAttributes, ReactNode } from 'react';
import './Well.css';

export interface WellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  children: ReactNode;
}

/** A sunken, borderless area that sets secondary content apart (previews, summaries). Design system: docs/design-system/components/well.html. */
export function Well({ children, ...rest }: WellProps) {
  return (
    <div {...rest} className="well">
      {children}
    </div>
  );
}
