import type { ReactNode } from 'react';
import { EmptyState, Icon, type IconName } from '../index.js';
import './ErrorPage.css';

export type ErrorPageKind = 'not-found' | 'forbidden' | 'server-error' | 'offline';

const defaults: Record<ErrorPageKind, { icon: IconName; title: string; text: string }> = {
  'not-found': { icon: 'search', title: 'We can’t find that page', text: 'The link may be old, or the page moved. Check the address and try again.' },
  forbidden: { icon: 'lock', title: 'You don’t have access to this page', text: 'Ask the organiser to give you access.' },
  'server-error': { icon: 'warning', title: 'Something went wrong on our side', text: 'We’ve logged the problem. Please try again in a moment.' },
  offline: { icon: 'wifi-off', title: 'You’re offline', text: 'Check your connection, then try again.' },
};

export interface ErrorPageProps {
  /** 404 not-found, 403 forbidden, 500 server-error, or offline. */
  kind: ErrorPageKind;
  /** Overrides the default heading for the kind. */
  title?: ReactNode;
  /** Overrides the default explanation for the kind. */
  text?: ReactNode;
  /** Ways out, e.g. <Button variant="primary">Try again</Button>. */
  actions?: ReactNode;
  /** Support reference for server errors, shown as "Reference: INV-7C41." */
  reference?: string;
}

/**
 * Whole-page error (404, 403, 500, offline), built on EmptyState with an h1. Render it inside the page's <main>.
 * Design system: docs/design-system/components/error-page.html.
 */
export function ErrorPage({ kind, title, text, actions, reference }: ErrorPageProps) {
  const d = defaults[kind];
  return (
    <div className="error-page">
      <EmptyState
        icon={<Icon name={d.icon} />}
        tone={kind === 'server-error' ? 'error' : 'default'}
        headingLevel={1}
        title={title ?? d.title}
        text={
          <>
            {text ?? d.text}
            {reference && <> Reference: {reference}.</>}
          </>
        }
        actions={actions}
      />
    </div>
  );
}
