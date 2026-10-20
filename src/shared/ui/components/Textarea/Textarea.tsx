import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FormField } from '../index.js';
import './Textarea.css';

export interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'className' | 'style' | 'children' | 'aria-invalid'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Character counter, e.g. "12 of 280" or "268 characters left". */
  counter?: ReactNode;
  /** Invalid without an error message of its own. */
  invalid?: boolean;
  hideLabel?: boolean;
}

/** Multi-line text input with its label, help, counter and error. Design system: docs/design-system/components/textarea.html. */
export function Textarea({ label, id, hint, error, optional, counter, invalid, hideLabel, ...rest }: TextareaProps) {
  return (
    <FormField label={label} id={id} hint={hint} error={error} optional={optional} counter={counter} invalid={invalid} hideLabel={hideLabel}>
      {(control) => <textarea {...rest} {...control} className="textarea" />}
    </FormField>
  );
}
