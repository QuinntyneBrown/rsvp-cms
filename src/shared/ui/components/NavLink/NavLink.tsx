import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import './NavLink.css';

/**
 * Called on a plain left click (no modifier keys) of a navigation link, so a client-side router can take over.
 * Call `event.preventDefault()` to stop the browser following `href`; modified clicks (new tab, new window) are left alone.
 */
export type NavigateHandler = (href: string, event: MouseEvent<HTMLAnchorElement>) => void;

export interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'style' | 'href'> {
  href: string;
  /** Marks the link as the current page (aria-current="page"). */
  current?: boolean;
  /** Decorative leading icon, e.g. `<Icon name="home" />`. */
  icon?: ReactNode;
  /** Trailing count or badge, e.g. `<Badge count>3</Badge>`. Give it its own accessible text. */
  badge?: ReactNode;
  onNavigate?: NavigateHandler;
  children: ReactNode;
}

/** A link in the primary or top-bar navigation. Design system: docs/design-system/components/nav-link.html. */
export function NavLink({ href, current, icon, badge, onNavigate, onClick, children, ...rest }: NavLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !onNavigate) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onNavigate(href, event);
  };
  return (
    <a {...rest} href={href} className="nav-link" aria-current={current ? 'page' : undefined} onClick={handleClick}>
      {icon && <span className="nav-link__icon" aria-hidden="true">{icon}</span>}
      {children}
      {badge && <span className="nav-link__badge">{badge}</span>}
    </a>
  );
}
