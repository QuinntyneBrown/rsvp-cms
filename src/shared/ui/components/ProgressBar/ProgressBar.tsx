import { useId } from 'react';
import './ProgressBar.css';

export type ProgressBarTone = 'default' | 'success' | 'danger';

export interface ProgressBarProps {
  /** Accessible name, e.g. "Replies received". */
  label: string;
  /** Current value from 0 to `max`. Omit for an indeterminate bar (work of unknown length). */
  value?: number;
  max?: number;
  tone?: ProgressBarTone;
  /** Shows the label and the percentage above the bar instead of only naming it for screen readers. */
  showLabel?: boolean;
  /** Human-readable value for screen readers, e.g. "49 of 81 added". */
  valueText?: string;
}

/**
 * Progress towards completion. Determinate bars are a native <progress> (implicit role="progressbar" and value),
 * so the width needs no inline style. Design system: docs/design-system/components/progress-bar.html.
 */
export function ProgressBar({ label, value, max = 100, tone = 'default', showLabel, valueText }: ProgressBarProps) {
  const labelId = useId();
  const indeterminate = value === undefined;
  const classes = ['progress'];
  if (indeterminate) classes.push('progress--indeterminate');
  if (tone !== 'default') classes.push(`progress--${tone}`);
  const name = showLabel ? { 'aria-labelledby': labelId } : { 'aria-label': label };
  const bar = indeterminate ? (
    <div {...name} className={classes.join(' ')} role="progressbar" aria-valuetext={valueText}>
      <div className="progress__bar" />
    </div>
  ) : (
    <progress {...name} className={classes.join(' ')} value={Math.min(Math.max(value, 0), max)} max={max} aria-valuetext={valueText} />
  );
  if (!showLabel) return bar;
  return (
    <div className="progress-group">
      <div className="progress-group__header">
        <span id={labelId}>{label}</span>
        {!indeterminate && <span aria-hidden="true">{Math.round((Math.min(Math.max(value, 0), max) / max) * 100)}%</span>}
      </div>
      {bar}
    </div>
  );
}
