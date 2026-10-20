import { useId, type ReactNode } from 'react';
import './FormField.css';

/** Props FormField hands to its control so label, help, counter and error are announced with it. */
export interface FormFieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FormFieldProps {
  label: ReactNode;
  /** Id of the control. Generated with useId when omitted; the control MUST use it (see the render prop). */
  id?: string;
  /** Help text under the control. */
  hint?: ReactNode;
  /** Error message; marks the control invalid and is announced (role="alert"). */
  error?: ReactNode;
  /** Adds "(optional)" after the label. */
  optional?: boolean;
  /** Character counter, e.g. "0 of 280". */
  counter?: ReactNode;
  /** Marks the control invalid without an error message (e.g. the message lives elsewhere). */
  invalid?: boolean;
  /** Keeps the label for assistive technology but hides it visually (e.g. a search box with a visible icon). */
  hideLabel?: boolean;
  /**
   * The control. Pass a function to receive the id and ARIA wiring:
   * `{(control) => <input className="input" {...control} />}`. Plain children must use the same `id` themselves.
   */
  children: ReactNode | ((control: FormFieldControlProps) => ReactNode);
}

/** Ids FormField derives for its parts from the control id. */
export function formFieldIds(id: string) {
  return { help: `${id}-help`, counter: `${id}-counter`, error: `${id}-error` };
}

/**
 * Label, control, help, counter and error for one form control. TextField, Textarea and Select render it for you;
 * use it directly to wrap a custom control. Design system: docs/design-system/components/form-field.html.
 */
export function FormField({ label, id, hint, error, optional, counter, invalid, hideLabel, children }: FormFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const ids = formFieldIds(controlId);
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const describedBy = [hasError && ids.error, hint && ids.help, counter && ids.counter].filter(Boolean).join(' ');
  const control: FormFieldControlProps = { id: controlId };
  if (describedBy) control['aria-describedby'] = describedBy;
  if (hasError || invalid) control['aria-invalid'] = true;
  return (
    <div className="field">
      <label className={hideLabel ? 'field__label field__label--hidden' : 'field__label'} htmlFor={controlId}>
        {label}
        {optional && <span className="optional">(optional)</span>}
      </label>
      {typeof children === 'function' ? children(control) : children}
      {hint && <span className="field__help" id={ids.help}>{hint}</span>}
      {counter && <span className="field__counter" id={ids.counter}>{counter}</span>}
      {hasError && <span className="field__error" id={ids.error} role="alert">{error}</span>}
    </div>
  );
}
