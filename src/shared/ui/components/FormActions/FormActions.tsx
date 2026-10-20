import type { ReactNode } from 'react';
import './FormActions.css';

export type FormActionsAlign = 'end' | 'between' | 'start';

export interface FormActionsProps {
  /** `end` (default) right-aligns the buttons; `between` pushes a secondary action to the start. */
  align?: FormActionsAlign;
  /** Buttons, primary action last. */
  children: ReactNode;
}

/** The row of buttons that ends a form or dialog. Design system: docs/design-system/components/form-actions.html. */
export function FormActions({ align = 'end', children }: FormActionsProps) {
  const className = align === 'end' ? 'form-actions' : `form-actions form-actions--${align}`;
  return <div className={className}>{children}</div>;
}
