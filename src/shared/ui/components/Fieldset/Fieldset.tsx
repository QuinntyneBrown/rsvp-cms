import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import './Fieldset.css';

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
