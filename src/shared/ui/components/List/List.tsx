import type { ReactNode } from 'react';
import './List.css';

export interface ListProps {
  /** Renders an ordered list (<ol>), e.g. an event schedule. */
  ordered?: boolean;
  /** Names the list when it is not introduced by a visible heading. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** ListItem elements. */
  children: ReactNode;
}

/** A vertical list of rows separated by rules. Design system: docs/design-system/components/list.html. */
export function List({ ordered, children, ...aria }: ListProps) {
  const Element = ordered ? 'ol' : 'ul';
  return (
    <Element {...aria} className="list">
      {children}
    </Element>
  );
}

export interface ListItemProps {
  /** Main line of the row. */
  title?: ReactNode;
  /** Secondary line under the title. */
  meta?: ReactNode;
  /** Content before the body, e.g. an Avatar or a time. */
  leading?: ReactNode;
  /** Content after the body, e.g. a Badge or row actions. */
  trailing?: ReactNode;
  /** Free content instead of (or after) title/meta. */
  children?: ReactNode;
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button (or runs alongside `href`). */
  onClick?: () => void;
}

/** One row of a List; with `href` or `onClick` the whole row is one link or button. */
export function ListItem({ title, meta, leading, trailing, children, href, onClick }: ListItemProps) {
  const content = (
    <>
      {leading}
      {(title !== undefined || meta !== undefined) && (
        <div className="list__body">
          {title !== undefined && <div className="list__title">{title}</div>}
          {meta !== undefined && <div className="list__meta">{meta}</div>}
        </div>
      )}
      {children}
      {trailing}
    </>
  );
  if (href !== undefined) {
    return (
      <li>
        <a className="list__item list__item--interactive" href={href} onClick={onClick}>
          {content}
        </a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button className="list__item list__item--interactive" type="button" onClick={onClick}>
          {content}
        </button>
      </li>
    );
  }
  return <li className="list__item">{content}</li>;
}
