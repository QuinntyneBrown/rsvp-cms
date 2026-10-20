import type { ReactNode } from 'react';
import './Stepper.css';

export interface StepperProps {
  /** Step labels in order. */
  steps: ReactNode[];
  /** Zero-based index of the current step; steps before it are complete. `steps.length` means all complete. */
  current: number;
  /** Accessible name of the list. */
  label?: string;
}

/** Shows progress through a multi-step flow. Design system: docs/design-system/components/stepper.html. */
export function Stepper({ steps, current, label = 'Progress' }: StepperProps) {
  return (
    <ol className="stepper" aria-label={label}>
      {steps.map((step, index) => {
        const complete = index < current;
        return (
          <li key={index} aria-current={index === current ? 'step' : undefined} data-complete={complete || undefined}>
            <span className="stepper__label">{step}</span>
            {complete && <span className="stepper__status"> (completed)</span>}
          </li>
        );
      })}
    </ol>
  );
}
