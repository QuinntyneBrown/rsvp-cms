import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'style' | 'type' | 'children' | 'aria-invalid'> {
  label: ReactNode;
  /** Secondary line under the label (.choice__text small). */
  description?: ReactNode;
  /** Mixed state, e.g. "select all" with some rows selected. */
  indeterminate?: boolean;
  invalid?: boolean;
}

/** A single on/off choice with a visible label. Design system: docs/design-system/components/checkbox.html. */
export function Checkbox({ label, description, indeterminate = false, invalid, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="choice">
      <input {...rest} ref={ref} type="checkbox" aria-invalid={invalid || undefined} />
      <span className="choice__text">
        {label}
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}
