import { VisuallyHidden } from '../../primitives/index.js';
import './Spinner.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Announced to screen readers through a polite status region. */
  label?: string;
}

/** Indeterminate busy indicator. Design system: docs/design-system/components/spinner.html. */
export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps) {
  const className = size === 'md' ? 'spinner' : `spinner spinner--${size}`;
  return (
    <span className={className} role="status">
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
