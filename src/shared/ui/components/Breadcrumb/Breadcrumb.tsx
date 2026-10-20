import type { MouseEvent, ReactNode } from 'react';
import type { NavigateHandler } from '../index.js';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Omit for the current page. */
  href?: string;
  /** Marks the current page; an item without `href` is treated as current. */
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Accessible name of the navigation landmark. */
  label?: string;
  onNavigate?: NavigateHandler;
}

/** Shows where the page sits in the hierarchy. Design system: docs/design-system/components/breadcrumb.html. */
export function Breadcrumb({ items, label = 'Breadcrumb', onNavigate }: BreadcrumbProps) {
  const handleClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onNavigate(href, event);
  };
  return (
    <nav aria-label={label}>
      <ol className="breadcrumb">
        {items.map((item, index) =>
          item.current || !item.href ? (
            <li key={index} aria-current="page">{item.label}</li>
          ) : (
            <li key={index}>
              <a href={item.href} onClick={handleClick(item.href)}>{item.label}</a>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
