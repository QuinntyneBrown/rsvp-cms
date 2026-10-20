import { useEffect, useRef, type ReactNode } from 'react';

export function Field(props: { label: string; id: string; error?: string; hint?: string; optional?: boolean; counter?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={props.id}>
        {props.label} {props.optional && <span className="optional">(optional)</span>}
      </label>
      {props.children}
      {props.hint && !props.error && <p className="field__help">{props.hint}</p>}
      {props.counter && <p className="field__counter">{props.counter}</p>}
      {props.error && (
        <p className="field__error" id={`${props.id}-error`} role="alert">
          {props.error}
        </p>
      )}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && <div className="toast">{message}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card stack" role="alert">
      <p>{message}</p>
      <div>
        <button className="btn" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 24, background: 'var(--color-border, #dfe3e8)', borderRadius: 6 }} />
      ))}
    </div>
  );
}

/** Modal dialog; focus moves into it on open and Escape closes it. */
export function Dialog(props: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);
  return (
    <div className="dialog-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={props.title} className="card stack" style={{ maxWidth: 480, width: '92%', maxHeight: '90vh', overflow: 'auto' }}>
        <h2>{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}
