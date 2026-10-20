import { createElement, type ReactNode } from 'react';
import { Icon } from '../index.js';
import './EmptyState.css';

export type EmptyStateTone = 'default' | 'error';

export interface EmptyStateProps {
  /** Glyph in the round badge, e.g. <Icon name="users" />. The error tone defaults to a warning glyph. */
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  /** Buttons or links, e.g. <Button variant="primary">Add a guest</Button>. */
  actions?: ReactNode;
  /** Less padding, for use inside cards and panels. */
  compact?: boolean;
  /** `error` marks a failed load: danger-tinted icon and role="alert". */
  tone?: EmptyStateTone;
  /** Heading level of the title; use 1 when the state is the whole page. */
  headingLevel?: 1 | 2 | 3;
}

/** Explains why there is nothing to show (or why loading failed) and offers the next step. Design system: docs/design-system/components/empty-state.html. */
export function EmptyState({ icon, title, text, actions, compact, tone = 'default', headingLevel = 2 }: EmptyStateProps) {
  const classes = ['empty'];
  if (compact) classes.push('empty--compact');
  if (tone === 'error') classes.push('empty--error');
  const glyph = icon ?? (tone === 'error' ? <Icon name="warning" /> : null);
  return (
    <div className={classes.join(' ')} role={tone === 'error' ? 'alert' : undefined}>
      {glyph && (
        <span className="empty__icon" aria-hidden="true">
          {glyph}
        </span>
      )}
      {createElement(`h${headingLevel}`, { className: 'empty__title' }, title)}
      {text && <p className="empty__text">{text}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
