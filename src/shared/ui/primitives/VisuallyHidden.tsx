import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import './VisuallyHidden.css';

export type VisuallyHiddenElement = 'span' | 'p' | 'div' | 'label' | 'caption' | 'h1' | 'h2' | 'h3';

export interface VisuallyHiddenProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** Element to render; use `label` (with `htmlFor`) for a hidden form label, `caption` inside a table. */
  as?: VisuallyHiddenElement;
  /** Only used when `as="label"`. */
  htmlFor?: string;
  children: ReactNode;
}

/** Text for screen readers only; hidden visually but kept in the accessibility tree. Design system: docs/design-system/components/visually-hidden.html. */
export function VisuallyHidden({ as = 'span', htmlFor, children, ...rest }: VisuallyHiddenProps) {
  return createElement(as, { ...rest, htmlFor: as === 'label' ? htmlFor : undefined, className: 'visually-hidden' }, children);
}
