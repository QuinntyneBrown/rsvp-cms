import type { HTMLAttributes, ReactNode } from 'react';
import './Container.css';

export type ContainerElement = 'div' | 'main' | 'section';

export interface ContainerProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** Reading width for forms and guest pages. */
  narrow?: boolean;
  /** Use `main` (with `id="main"`) for the page's main landmark. */
  as?: ContainerElement;
  children: ReactNode;
}

/** Centres page content. Design system: docs/design-system/components/container.html. */
export function Container({ narrow, as = 'div', children, ...rest }: ContainerProps) {
  const Tag = as;
  return (
    <Tag {...rest} className={narrow ? 'container container--narrow' : 'container'}>
      {children}
    </Tag>
  );
}
