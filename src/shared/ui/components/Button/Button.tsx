import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'secondary' | 'primary' | 'ghost' | 'link' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'onClick'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretches to the full width of its container. */
  block?: boolean;
  /** Shows a spinner, keeps the width and blocks clicks; sets aria-busy. */
  loading?: boolean;
  /** Icon-only button; `aria-label` is required so it has a name. */
  iconOnly?: boolean;
  /** Renders a link that looks like a button, for actions that navigate. */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}

/** Triggers an action. Design system: docs/design-system/components/button.html. */
export function Button({ variant = 'secondary', size = 'md', block, loading, iconOnly, href, type = 'button', children, onClick, ...rest }: ButtonProps) {
  const classes = ['btn'];
  if (variant !== 'secondary') classes.push(`btn--${variant}`);
  if (size !== 'md') classes.push(`btn--${size}`);
  if (block) classes.push('btn--block');
  if (iconOnly) classes.push('btn--icon');
  if (href !== undefined) {
    return (
      <a href={href} className={classes.join(' ')} aria-label={rest['aria-label']} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button
      {...rest}
      type={type}
      className={classes.join(' ')}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
    >
      {children}
    </button>
  );
}
