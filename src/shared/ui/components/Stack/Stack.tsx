import type { FormHTMLAttributes, ReactNode } from 'react';
import './Stack.css';

export type StackGap = 'sm' | 'md' | 'lg';
export type StackElement = 'div' | 'section' | 'ul' | 'ol' | 'form';

export interface StackProps extends Omit<FormHTMLAttributes<HTMLElement>, 'className' | 'style'> {
  gap?: StackGap;
  /** Element to render; lists drop their bullets and padding. Form attributes apply only with `as="form"`. */
  as?: StackElement;
  children: ReactNode;
}

/** Lays children out in a column with a token gap. Design system: docs/design-system/components/stack.html. */
export function Stack({ gap = 'md', as = 'div', children, ...rest }: StackProps) {
  const Tag = as as 'form';
  return (
    <Tag {...rest} className={gap === 'md' ? 'stack' : `stack stack--${gap}`}>
      {children}
    </Tag>
  );
}
