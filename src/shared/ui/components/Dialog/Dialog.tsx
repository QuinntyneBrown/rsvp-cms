import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../index.js';
import { Icon } from '../../primitives/index.js';
import './Dialog.css';

export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogTone = 'default' | 'danger';

export interface DialogProps {
  /** Heading of the dialog; it is also the dialog's accessible name. */
  title: ReactNode;
  /** Called by Escape and the close button (not while busy). */
  onClose: () => void;
  /** Supporting line under the title; becomes the accessible description. */
  description?: ReactNode;
  /** Body content. */
  children: ReactNode;
  /** Action buttons, shown in the sticky footer (cancel first, primary last). */
  footer?: ReactNode;
  size?: DialogSize;
  /** 'danger' adds a warning icon for destructive confirmations. */
  tone?: DialogTone;
  /** An action is running: sets aria-busy and ignores Escape and the close button. */
  busy?: boolean;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** 'footer' focuses the first footer action on open: the safe action of a confirmation without fields (Cancel, Keep editing). */
  initialFocus?: 'body' | 'footer';
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/** Dialogs open right now, innermost last; only the innermost one reacts to Escape. */
const openDialogs: symbol[] = [];

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert]'));
}

/**
 * Modal dialog rendered into document.body. Focus moves in on open (first focusable in the body, or in the
 * footer with initialFocus="footer", else the panel), Tab and Shift+Tab are trapped, Escape closes, and focus returns to the opener on unmount.
 * Design system: docs/design-system/components/dialog.html.
 */
export function Dialog({ title, onClose, description, children, footer, size = 'md', tone = 'default', busy, closeLabel = 'Close', initialFocus = 'body' }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest callbacks/state in refs so the mount effect runs once and focus never jumps on re-render.
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const body = panel.querySelector<HTMLElement>(initialFocus === 'footer' ? '.dialog__footer' : '.dialog__body');
      const first = body ? focusables(body)[0] : undefined;
      (first ?? panel).focus();
    }
    const token = Symbol('dialog');
    openDialogs.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || openDialogs[openDialogs.length - 1] !== token) return;
      e.preventDefault();
      if (!busyRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openDialogs.splice(openDialogs.indexOf(token), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  function trapTab(e: ReactKeyboardEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (e.key !== 'Tab' || !panel) return;
    const items = focusables(panel);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  const panelClass = size === 'md' ? 'dialog__panel' : `dialog__panel dialog__panel--${size}`;
  return createPortal(
    <>
      <div className="backdrop" />
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={trapTab}
      >
        <div ref={panelRef} className={panelClass} tabIndex={-1} aria-busy={busy || undefined}>
          <div className="dialog__header">
            {tone === 'danger' && (
              <div className="dialog__icon dialog__icon--danger" aria-hidden="true">
                <Icon name="warning" />
              </div>
            )}
            <div className="dialog__heading">
              <h2 className="dialog__title" id={titleId}>
                {title}
              </h2>
              {description && (
                <p className="dialog__description" id={descriptionId}>
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" iconOnly aria-label={closeLabel} disabled={busy} onClick={() => onCloseRef.current()}>
              <Icon name="close" />
            </Button>
          </div>
          <div className="dialog__body">{children}</div>
          {footer && <div className="dialog__footer">{footer}</div>}
        </div>
      </div>
    </>,
    document.body,
  );
}
