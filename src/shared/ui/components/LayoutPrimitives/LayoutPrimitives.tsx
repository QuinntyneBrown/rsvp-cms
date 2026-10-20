import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import './LayoutPrimitives.css';

export type StackGap = 'sm' | 'md' | 'lg';
export type StackElement = 'div' | 'section' | 'ul' | 'ol' | 'form';

export interface StackProps extends Omit<FormHTMLAttributes<HTMLElement>, 'className' | 'style'> {
  gap?: StackGap;
  /** Element to render; lists drop their bullets and padding. Form attributes apply only with `as="form"`. */
  as?: StackElement;
  children: ReactNode;
}

/** Lays children out in a column with a token gap. Design system: docs/design-system/components/stack.html. */
export function Stack({ gap = 'md', as = 'div', children, ...rest }: StackProps) {
  const Tag = as as 'form';
  return (
    <Tag {...rest} className={gap === 'md' ? 'stack' : `stack stack--${gap}`}>
      {children}
    </Tag>
  );
}

export type ClusterJustify = 'start' | 'between' | 'end';

export interface ClusterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  justify?: ClusterJustify;
  children: ReactNode;
}

/** Lays children out in a wrapping row. Design system: docs/design-system/components/cluster.html. */
export function Cluster({ justify = 'start', children, ...rest }: ClusterProps) {
  return (
    <div {...rest} className={justify === 'start' ? 'cluster' : `cluster cluster--${justify}`}>
      {children}
    </div>
  );
}

export type ContainerElement = 'div' | 'main' | 'section';

export interface ContainerProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** Reading width for forms and guest pages. */
  narrow?: boolean;
  /** Use `main` (with `id="main"`) for the page's main landmark. */
  as?: ContainerElement;
  children: ReactNode;
}

/** Centres page content. Design system: docs/design-system/components/container.html. */
export function Container({ narrow, as = 'div', children, ...rest }: ContainerProps) {
  const Tag = as;
  return (
    <Tag {...rest} className={narrow ? 'container container--narrow' : 'container'}>
      {children}
    </Tag>
  );
}

export type GridElement = 'div' | 'section' | 'ul';

export interface GridProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** Auto-fill columns of at least 18rem (cards) instead of the 4/8/12-column layout grid. */
  auto?: boolean;
  /** With `auto`, columns of at least 10rem (stat tiles). */
  compact?: boolean;
  as?: GridElement;
  children: ReactNode;
}

/** Lays children out in columns. Design system: docs/design-system/components/grid.html. */
export function Grid({ auto, compact, as = 'div', children, ...rest }: GridProps) {
  const Tag = as;
  const classes = ['grid'];
  if (auto) classes.push(compact ? 'grid--auto-compact' : 'grid--auto');
  return (
    <Tag {...rest} className={classes.join(' ')}>
      {children}
    </Tag>
  );
}

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
