import type { ComponentPropsWithRef, ReactNode } from 'react';
import './Switch.css';

export interface SwitchProps extends Omit<ComponentPropsWithRef<'input'>, 'className' | 'style' | 'type' | 'role' | 'children' | 'onChange'> {
  label: ReactNode;
  checked: boolean;
  /** Called with the new on/off state. Takes effect immediately; do not use inside a form that needs a submit. */
  onChange: (checked: boolean) => void;
}

/** An instant on/off setting (role="switch", toggled with Space). Design system: docs/design-system/components/switch.html. */
export function Switch({ label, checked, onChange, ...rest }: SwitchProps) {
  return (
    <label className="switch">
      <input {...rest} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
