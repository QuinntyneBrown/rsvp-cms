import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../index.js';
import './Alert.css';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'title' | 'role'> {
  tone?: AlertTone;
  /** Bold lead line. */
  title?: ReactNode;
  /** Supporting text. */
  children?: ReactNode;
  /** Action buttons or links, e.g. <Button size="sm">Retry</Button>. */
  actions?: ReactNode;
  /** Full-width page banner under the top bar instead of an inline box. */
  banner?: boolean;
  /** Interrupts the screen reader (role="alert"); use for errors that just happened. Otherwise role="status". */
  live?: boolean;
  /** Shows a close button that calls this. */
  onDismiss?: () => void;
  /** Accessible name of the close button. */
  dismissLabel?: string;
}

/** In-page message with a tone. Design system: docs/design-system/components/alert.html. */
export function Alert({ tone = 'info', title, children, actions, banner, live, onDismiss, dismissLabel = 'Dismiss', ...rest }: AlertProps) {
  const classes = ['alert'];
  if (tone !== 'info') classes.push(`alert--${tone}`);
  if (banner) classes.push('banner');
  return (
    <div {...rest} className={classes.join(' ')} role={live ? 'alert' : 'status'}>
      <Icon name={tone} />
      <div className="alert__body">
        {title && <span className="alert__title">{title}</span>}
        {children && <div>{children}</div>}
        {actions && <div className="alert__actions">{actions}</div>}
      </div>
      {onDismiss && (
        <button className="close" type="button" aria-label={dismissLabel} onClick={onDismiss}>
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}
