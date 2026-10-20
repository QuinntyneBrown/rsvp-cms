import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FormField } from '../index.js';
import './Select.css';

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'className' | 'style' | 'aria-invalid'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Invalid without an error message of its own. */
  invalid?: boolean;
  hideLabel?: boolean;
  /** `<option>` (and `<optgroup>`) elements. */
  children: ReactNode;
}

/** Native select with its label, help and error. Design system: docs/design-system/components/select.html. */
export function Select({ label, id, hint, error, optional, invalid, hideLabel, children, ...rest }: SelectProps) {
  return (
    <FormField label={label} id={id} hint={hint} error={error} optional={optional} invalid={invalid} hideLabel={hideLabel}>
      {(control) => (
        <select {...rest} {...control} className="select">
          {children}
        </select>
      )}
    </FormField>
  );
}
