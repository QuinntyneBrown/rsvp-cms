import type { ReactNode } from 'react';
import { Icon } from '../../primitives/index.js';
import './Chip.css';

interface ChipBaseProps {
  /** Visible text of the chip. */
  children: ReactNode;
  /** Optional leading glyph (decorative). */
  icon?: ReactNode;
}

export interface StaticChipProps extends ChipBaseProps {
  pressed?: undefined;
  onToggle?: undefined;
  onRemove?: undefined;
}

export interface FilterChipProps extends ChipBaseProps {
  /** Toggle state, announced through aria-pressed. */
  pressed: boolean;
  onToggle: (pressed: boolean) => void;
  disabled?: boolean;
  onRemove?: undefined;
}

export interface RemovableChipProps extends ChipBaseProps {
  /** Called by the remove button, which is named "Remove {removeLabel}". */
  onRemove: () => void;
  /** Text naming the chip in the remove button; defaults to the children when they are a string. */
  removeLabel?: string;
  pressed?: undefined;
  onToggle?: undefined;
}

export type ChipProps = StaticChipProps | FilterChipProps | RemovableChipProps;

/** A compact label, filter toggle or removable value. Design system: docs/design-system/components/chip.html. */
export function Chip(props: ChipProps) {
  const { children, icon } = props;
  if (props.onToggle) {
    const { pressed, onToggle, disabled } = props;
    return (
      <button className="chip" type="button" aria-pressed={pressed} disabled={disabled} onClick={() => onToggle(!pressed)}>
        {icon}
        {children}
      </button>
    );
  }
  if (props.onRemove) {
    const name = props.removeLabel ?? (typeof children === 'string' ? children : '');
    return (
      <span className="chip">
        {icon}
        {children}
        <button className="remove" type="button" aria-label={`Remove ${name}`.trim()} onClick={props.onRemove}>
          <Icon name="close" size="sm" />
        </button>
      </span>
    );
  }
  return (
    <span className="chip">
      {icon}
      {children}
    </span>
  );
}
