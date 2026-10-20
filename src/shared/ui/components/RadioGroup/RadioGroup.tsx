import type { ReactNode } from 'react';
import { Fieldset } from '../index.js';
import './RadioGroup.css';

export interface RadioOption {
  value: string;
  label: ReactNode;
  /** Secondary line under the label (.choice__text small). */
  description?: ReactNode;
  disabled?: boolean;
  /** Id of this radio; defaults to `${id}-${value}` when the group has an id. */
  id?: string;
}

export interface RadioGroupProps {
  /** Names the group (rendered as <legend>). */
  legend: ReactNode;
  /** Shared `name` of the radios. */
  name: string;
  options: RadioOption[];
  /** Selected value; '' or undefined means nothing is chosen yet. */
  value?: string;
  onChange: (value: string) => void;
  /** Lands on the <fieldset> (ErrorSummary links target it). The first radio gets `${id}-${value}`. */
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
}

/**
 * One choice from a short list, as native radios in a fieldset (arrow keys move between options).
 * Design system: docs/design-system/components/radio-group.html.
 */
export function RadioGroup({ legend, name, options, value, onChange, id, hint, error, optional, required, disabled }: RadioGroupProps) {
  const invalid = error !== undefined && error !== null && error !== false && error !== '';
  return (
    <Fieldset legend={legend} id={id} hint={hint} error={error} optional={optional} disabled={disabled}>
      <div className="radio-group__options">
        {options.map((option) => (
          <label className="choice" key={option.value}>
            <input
              type="radio"
              id={option.id ?? (id ? `${id}-${option.value}` : undefined)}
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              required={required}
              aria-invalid={invalid || undefined}
              onChange={() => onChange(option.value)}
            />
            <span className="choice__text">
              {option.label}
              {option.description && <small>{option.description}</small>}
            </span>
          </label>
        ))}
      </div>
    </Fieldset>
  );
}
