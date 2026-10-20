import type { ReactNode } from 'react';
import './AuthLayout.css';

export interface AuthLayoutProps {
  /** Rendered as the page's h1. */
  title: ReactNode;
  /** Short line under the title. */
  description?: ReactNode;
  /** Logo slot centred above the title. */
  logo?: ReactNode;
  /** id of the main landmark, the SkipLink target. */
  mainId?: string;
  /** The form and any links below it. */
  children: ReactNode;
}

/** Centred card shell for sign-in and the guest code-entry page. Design system: docs/design-system/components/auth-layout.html. */
export function AuthLayout({ title, description, logo, mainId = 'main', children }: AuthLayoutProps) {
  return (
    <main id={mainId} className="auth-layout">
      <div className="auth-card">
        {logo && <div className="auth-card__logo">{logo}</div>}
        <div>
          <h1>{title}</h1>
          {description && <p className="auth-card__description">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
