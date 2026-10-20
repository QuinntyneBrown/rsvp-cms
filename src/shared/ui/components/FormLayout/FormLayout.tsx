import { useEffect, useId, useRef, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';
import './FormLayout.css';

export interface FieldsetProps extends Omit<ComponentPropsWithRef<'fieldset'>, 'className' | 'style' | 'children'> {
  /** Names the group (rendered as <legend>). */
  legend: ReactNode;
  hint?: ReactNode;
  /** Error for the group as a whole; announced (role="alert") and linked with aria-describedby. */
  error?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}

/**
 * Groups related controls under a legend; `disabled` disables every control inside.
 * The `id` lands on the <fieldset> so an ErrorSummary link can target the group.
 * Design system: docs/design-system/components/fieldset.html.
 */
export function Fieldset({ legend, id, hint, error, optional, children, ...rest }: FieldsetProps) {
  const generated = useId();
  const baseId = id ?? generated;
  const helpId = `${baseId}-help`;
  const errorId = `${baseId}-error`;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const describedBy = [hasError && errorId, hint && helpId].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset {...rest} id={id} className="fieldset" aria-describedby={describedBy}>
      <legend>
        {legend}
        {optional && <span className="optional"> (optional)</span>}
      </legend>
      {hint && <span className="field__help fieldset__help" id={helpId}>{hint}</span>}
      {children}
      {hasError && <span className="field__error" id={errorId} role="alert">{error}</span>}
    </fieldset>
  );
}

export type FormActionsAlign = 'end' | 'between' | 'start';

export interface FormActionsProps {
  /** `end` (default) right-aligns the buttons; `between` pushes a secondary action to the start. */
  align?: FormActionsAlign;
  /** Buttons, primary action last. */
  children: ReactNode;
}

/** The row of buttons that ends a form or dialog. Design system: docs/design-system/components/form-actions.html. */
export function FormActions({ align = 'end', children }: FormActionsProps) {
  const className = align === 'end' ? 'form-actions' : `form-actions form-actions--${align}`;
  return <div className={className}>{children}</div>;
}

export interface ErrorSummaryItem {
  /** Id of the field (or fieldset) the error belongs to; the link targets it. */
  fieldId: string;
  message: ReactNode;
}

export interface ErrorSummaryProps {
  errors: ErrorSummaryItem[];
  /** Heading; defaults to "1 thing to fix" / "N things to fix". */
  title?: ReactNode;
  /** Id of the summary box (default "form-errors"). */
  id?: string;
  /** Moves focus to the summary when it appears (default true). */
  autoFocus?: boolean;
}

function focusField(fieldId: string) {
  const target = document.getElementById(fieldId);
  if (!target) return;
  const focusable = target.matches('input, select, textarea, button, [tabindex]')
    ? target
    : target.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
  (focusable ?? target).focus();
  target.scrollIntoView?.({ block: 'center' });
}

/**
 * Lists a form's errors after a failed submit, with links that move focus to each field. Focuses itself when shown.
 * Renders nothing when there are no errors. Design system: docs/design-system/components/error-summary.html.
 */
export function ErrorSummary({ errors, title, id = 'form-errors', autoFocus = true }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = errors.length > 0;
  useEffect(() => {
    if (shown && autoFocus) ref.current?.focus();
  }, [shown, autoFocus]);
  if (!shown) return null;
  const heading = title ?? `${errors.length} ${errors.length === 1 ? 'thing' : 'things'} to fix`;
  const link = (item: ErrorSummaryItem) => (
    <a
      href={`#${item.fieldId}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        focusField(item.fieldId);
      }}
    >
      {item.message}
    </a>
  );
  return (
    <div ref={ref} className="alert alert--danger form-summary" role="alert" tabIndex={-1} id={id}>
      <div className="alert__body">
        <span className="alert__title">{heading}</span>
        {errors.length === 1 && errors[0] ? (
          <span>{link(errors[0])}</span>
        ) : (
          <ul className="form-summary__list">
            {errors.map((item) => <li key={item.fieldId}>{link(item)}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
