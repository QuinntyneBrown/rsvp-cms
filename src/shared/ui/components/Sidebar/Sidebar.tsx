import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { NavLink, type NavigateHandler } from '../index.js';
import './Sidebar.css';

export interface SidebarItem {
  href: string;
  label: ReactNode;
  /** Decorative leading icon. */
  icon?: ReactNode;
  /** Trailing count or badge with its own accessible text. */
  badge?: ReactNode;
  current?: boolean;
}

export interface SidebarGroup {
  /** Group heading (e.g. "Account"); the first group usually has none. */
  heading?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  /** id for the TopBar menu button's aria-controls. */
  id?: string;
  /** Accessible name of the navigation landmark. */
  label?: string;
  /** Brand slot shown above the groups, usually a `<TopBarBrand>`. */
  brand?: ReactNode;
  groups: SidebarGroup[];
  /** Shown on small screens when true; the sidebar is always shown from the lg breakpoint. */
  open?: boolean;
  /** Called when Escape is pressed inside the sidebar, so the caller can close it and return focus to the menu button. */
  onClose?: () => void;
  onNavigate?: NavigateHandler;
}

/** Primary navigation with grouped links. Design system: docs/design-system/components/sidebar.html. */
export function Sidebar({ id, label = 'Primary', brand, groups, open = false, onClose, onNavigate }: SidebarProps) {
  const baseId = useId();
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && onClose) {
      event.stopPropagation();
      onClose();
    }
  };
  return (
    <nav id={id} className="sidebar" aria-label={label} data-open={open} onKeyDown={handleKeyDown}>
      {brand && <div className="sidebar__brand">{brand}</div>}
      {groups.map((group, index) => {
        const headingId = `${baseId}-group-${index}`;
        return (
          <div key={group.heading ?? index} className="sidebar__section" role={group.heading ? 'group' : undefined} aria-labelledby={group.heading ? headingId : undefined}>
            {group.heading && <div className="sidebar__group" id={headingId}>{group.heading}</div>}
            {group.items.map((item) => (
              <NavLink key={item.href} href={item.href} current={item.current} icon={item.icon} badge={item.badge} onNavigate={onNavigate}>
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export interface SidebarLayoutProps {
  /** The `<Sidebar>`. */
  sidebar: ReactNode;
  /** TopBar and main content. */
  children: ReactNode;
}

/** Two-column shell: sidebar beside the content from the lg breakpoint, stacked below it. */
export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  return (
    <div className="sidebar-layout">
      {sidebar}
      <div className="sidebar-layout__content">{children}</div>
    </div>
  );
}
