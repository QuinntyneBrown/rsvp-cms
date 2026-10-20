import type { MouseEvent, ReactNode } from 'react';
import { Button, type NavigateHandler } from '../index.js';
import { Icon } from '../../primitives/index.js';
import './TopBar.css';

export interface TopBarProps {
  /** Brand slot, usually a `<TopBarBrand>`. */
  brand?: ReactNode;
  /** Navigation slot (`<NavLink>`s), shown from the md breakpoint up. */
  nav?: ReactNode;
  /** Accessible name of the navigation landmark. */
  navLabel?: string;
  /** Search slot; it takes the free space, so no spacer is added when it is present. */
  search?: ReactNode;
  /** Actions slot at the end of the bar (buttons, account menu, caption). */
  actions?: ReactNode;
  /** Shows the menu button (hidden from the lg breakpoint up) that opens the sidebar on small screens. */
  onMenuToggle?: () => void;
  /** Whether the sidebar the menu button controls is open (aria-expanded). */
  menuOpen?: boolean;
  /** id of the element the menu button controls (aria-controls). */
  menuControls?: string;
  menuLabel?: string;
}

/** Sticky application header. Design system: docs/design-system/components/top-bar.html. */
export function TopBar({ brand, nav, navLabel = 'Main', search, actions, onMenuToggle, menuOpen = false, menuControls, menuLabel = 'Open navigation' }: TopBarProps) {
  return (
    <header className="topbar">
      {onMenuToggle && (
        <span className="topbar__menu">
          <Button variant="ghost" iconOnly aria-label={menuLabel} aria-expanded={menuOpen} aria-controls={menuControls} onClick={onMenuToggle}>
            <Icon name="menu" />
          </Button>
        </span>
      )}
      {brand}
      {nav && (
        <nav className="topbar__nav" aria-label={navLabel}>
          {nav}
        </nav>
      )}
      {search ? <div className="topbar__search">{search}</div> : <span className="topbar__spacer" />}
      {actions && <div className="topbar__actions">{actions}</div>}
    </header>
  );
}

export interface TopBarBrandProps {
  href: string;
  /** Decorative logo mark. */
  logo?: ReactNode;
  onNavigate?: NavigateHandler;
  children: ReactNode;
}

/** The product or event name linking home, for the TopBar or Sidebar brand slot. */
export function TopBarBrand({ href, logo, onNavigate, children }: TopBarBrandProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onNavigate(href, event);
  };
  return (
    <a className="topbar__brand" href={href} onClick={handleClick}>
      {logo && <span className="topbar__brand-logo" aria-hidden="true">{logo}</span>}
      {children}
    </a>
  );
}
