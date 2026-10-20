import type { ReactNode } from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  /** Rendered as the page's only h1. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Page-level actions, usually Buttons. */
  actions?: ReactNode;
  /** Breadcrumb slot shown above the title, usually a `<Breadcrumb>`. */
  breadcrumb?: ReactNode;
}

/** Title block at the top of a page. Design system: docs/design-system/components/page-header.html. */
export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  const header = (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
  if (!breadcrumb) return header;
  return (
    <div className="page-header-group">
      {breadcrumb}
      {header}
    </div>
  );
}
