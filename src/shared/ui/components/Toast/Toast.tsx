import type { ReactNode } from 'react';
import { Icon } from '../index.js';
import './Toast.css';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastRegionProps {
  /** Corner the stack sits in. */
  position?: 'bottom' | 'top';
  /** The <Toast> items currently shown. */
  children?: ReactNode;
}

/**
 * Polite live region that hosts toasts. Render it once per page and keep it mounted (even when empty) so screen
 * readers announce toasts added later. Design system: docs/design-system/components/toast.html.
 */
export function ToastRegion({ position = 'bottom', children }: ToastRegionProps) {
  return (
    <div className={position === 'top' ? 'toast-region toast-region--top' : 'toast-region'} role="status" aria-live="polite">
      {children}
    </div>
  );
}

export interface ToastItemProps {
  /** Omit for a plain, icon-less toast. `danger` toasts use role="alert". */
  tone?: ToastTone;
  title: ReactNode;
  text?: ReactNode;
  /** One short action such as "Undo" or "Try again"; shown when `onAction` is given. */
  actionLabel?: string;
  onAction?: () => void;
  /** Shows a close button that calls this. Auto-dismiss timing belongs to the caller. */
  onDismiss?: () => void;
  dismissLabel?: string;
}

/** Legacy single-message form: renders a ToastRegion holding one plain toast when `message` is set. */
export interface ToastMessageProps {
  message: string | null;
}

export type ToastProps = ToastItemProps | ToastMessageProps;

function ToastItem({ tone, title, text, actionLabel, onAction, onDismiss, dismissLabel = 'Dismiss' }: ToastItemProps) {
  return (
    <div className={tone ? `toast toast--${tone}` : 'toast'} role={tone === 'danger' ? 'alert' : undefined}>
      {tone && <Icon name={tone} />}
      <div className="toast__body">
        <div className="toast__title">{title}</div>
        {text && <div className="toast__text">{text}</div>}
        {actionLabel && onAction && (
          <button className="toast__action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button className="close" type="button" aria-label={dismissLabel} onClick={onDismiss}>
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}

/** Brief, non-blocking feedback after an action. Place inside a <ToastRegion>. Design system: docs/design-system/components/toast.html. */
export function Toast(props: ToastProps) {
  if ('message' in props) {
    return <ToastRegion>{props.message && <ToastItem title={props.message} />}</ToastRegion>;
  }
  return <ToastItem {...props} />;
}
