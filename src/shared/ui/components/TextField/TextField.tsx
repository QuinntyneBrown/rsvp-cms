import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FormField } from '../index.js';
import './TextField.css';

export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel' | 'date' | 'time';
export type TextFieldSize = 'sm' | 'md' | 'lg';
export type TextFieldVariant = 'default' | 'search';

export interface TextFieldProps
  extends Omit<ComponentPropsWithRef<'input'>, 'className' | 'style' | 'type' | 'size' | 'children' | 'aria-invalid'> {
  label: ReactNode;
  type?: TextFieldType;
  size?: TextFieldSize;
  /** `search` adds the leading search icon (.search); pair it with `hideLabel` when the icon makes the purpose plain. */
  variant?: TextFieldVariant;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  counter?: ReactNode;
  /** Invalid without an error message of its own. */
  invalid?: boolean;
  hideLabel?: boolean;
}

/** Single-line text input with its label, help, counter and error. Design system: docs/design-system/components/text-field.html. */
export function TextField({ label, id, type = 'text', size = 'md', variant = 'default', hint, error, optional, counter, invalid, hideLabel, ...rest }: TextFieldProps) {
  const classes = ['input'];
  if (size !== 'md') classes.push(`input--${size}`);
  return (
    <FormField label={label} id={id} hint={hint} error={error} optional={optional} counter={counter} invalid={invalid} hideLabel={hideLabel}>
      {(control) => {
        const input = <input {...rest} {...control} type={type} className={classes.join(' ')} />;
        if (variant !== 'search') return input;
        return (
          <div className="search">
            <svg className="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" />
            </svg>
            {input}
          </div>
        );
      }}
    </FormField>
  );
}
