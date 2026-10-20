import type { AnchorHTMLAttributes, ReactNode } from 'react';
import './SkipLink.css';

export interface SkipLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'style'> {
  /** Fragment of the main landmark to jump to. */
  href?: string;
  children?: ReactNode;
}

/** First focusable element on every page; jumps past the navigation (WCAG 2.4.1). Design system: docs/design-system/components/skip-link.html. */
export function SkipLink({ href = '#main', children = 'Skip to content', ...rest }: SkipLinkProps) {
  return (
    <a {...rest} href={href} className="skip-link">
      {children}
    </a>
  );
}
