import type { ReactNode } from 'react';
import './Text.css';

export type TextVariant = 'body' | 'body-sm' | 'caption' | 'overline' | 'label';
export type TextTone = 'default' | 'muted' | 'subtle';
export type TextElement = 'p' | 'span' | 'div';

export interface TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** One line with an ellipsis; string content is also exposed in full as the title. */
  truncate?: boolean;
  as?: TextElement;
  children: ReactNode;
}

/** Typographic roles that are not headings. Design system: docs/design-system/components/text.html. */
export function Text({ variant = 'body', tone = 'default', truncate, as: Element = 'p', children }: TextProps) {
  const classes = ['text'];
  if (variant !== 'body') classes.push(`text--${variant}`);
  if (tone !== 'default') classes.push(`text--${tone}`);
  if (truncate) classes.push('text--truncate');
  return (
    <Element className={classes.join(' ')} title={truncate && typeof children === 'string' ? children : undefined}>
      {children}
    </Element>
  );
}
