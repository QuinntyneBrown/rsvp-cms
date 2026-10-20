import type { ComponentPropsWithRef, ReactNode } from 'react';
import './Link.css';

export type LinkVariant = 'inline' | 'standalone';

export interface LinkProps extends Omit<ComponentPropsWithRef<'a'>, 'className' | 'style' | 'target' | 'rel' | 'href'> {
  href: string;
  /** `inline` sits in running text (underlined); `standalone` stands on its own line with a larger target. */
  variant?: LinkVariant;
  /** Opens in a new tab (target _blank, rel noopener noreferrer) and says so to assistive technology. */
  external?: boolean;
  /** Decorative leading icon for the standalone variant. */
  icon?: ReactNode;
  children: ReactNode;
}

/** Navigates to another page or place. Design system: docs/design-system/components/link.html. */
export function Link({ href, variant = 'inline', external, icon, children, ...rest }: LinkProps) {
  const classes = ['link'];
  if (variant !== 'inline') classes.push(`link--${variant}`);
  return (
    <a {...rest} href={href} className={classes.join(' ')} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {icon}
      {children}
      {external && (
        <>
          <span className="link__external" aria-hidden="true">↗</span>
          <span className="link__hint"> (opens in new tab)</span>
        </>
      )}
    </a>
  );
}
