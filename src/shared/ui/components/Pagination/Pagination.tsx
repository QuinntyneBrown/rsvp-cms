import type { MouseEvent, ReactNode } from 'react';
import type { NavigateHandler } from '../index.js';
import './Pagination.css';

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  /** Button mode: called with the page to show. */
  onPageChange?: (page: number) => void;
  /** Link mode: builds each page's href (takes precedence over button mode). */
  hrefFor?: (page: number) => string;
  /** Link mode: lets a client-side router intercept plain clicks. */
  onNavigate?: NavigateHandler;
  /** Range text such as "Showing 1–20 of 40". */
  summary?: ReactNode;
  /** Accessible name of the navigation landmark. */
  label?: string;
}

type Slot = number | 'gap-start' | 'gap-end';

/** Pages to show: all of them up to 7, otherwise first, last and the current page's neighbours with gaps. */
function slots(page: number, pageCount: number): Slot[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return [1, ...(start > 2 ? ['gap-start' as const] : []), ...middle, ...(end < pageCount - 1 ? ['gap-end' as const] : []), pageCount];
}

/** Moves through a long list a page at a time. Design system: docs/design-system/components/pagination.html. */
export function Pagination({ page, pageCount, onPageChange, hrefFor, onNavigate, summary, label = 'Pagination' }: PaginationProps) {
  const control = (target: number, content: ReactNode, options: { label?: string; disabled?: boolean; current?: boolean } = {}) => {
    const current = options.current ? ('page' as const) : undefined;
    if (hrefFor) {
      if (options.disabled) {
        return <a role="link" aria-label={options.label} aria-disabled="true">{content}</a>;
      }
      const href = hrefFor(target);
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        onNavigate(href, event);
      };
      return <a href={href} aria-label={options.label} aria-current={current} onClick={handleClick}>{content}</a>;
    }
    return (
      <button type="button" aria-label={options.label} aria-current={current} disabled={options.disabled} onClick={() => onPageChange?.(target)}>
        {content}
      </button>
    );
  };

  return (
    <nav className="pagination-nav" aria-label={label}>
      {summary && <span className="pagination-nav__summary">{summary}</span>}
      {pageCount > 1 && (
        <ul className="pagination">
          <li>{control(page - 1, '‹', { label: 'Previous page', disabled: page <= 1 })}</li>
          {slots(page, pageCount).map((slot) =>
            typeof slot === 'number' ? (
              <li key={slot}>{control(slot, slot, { current: slot === page })}</li>
            ) : (
              <li key={slot}><span className="pagination__gap" aria-hidden="true">…</span></li>
            ),
          )}
          <li>{control(page + 1, '›', { label: 'Next page', disabled: page >= pageCount })}</li>
        </ul>
      )}
    </nav>
  );
}
