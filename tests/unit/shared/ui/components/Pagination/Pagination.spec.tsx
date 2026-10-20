import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '../../../../../../src/shared/ui/components/index.js';

const labels = () => Array.from(document.querySelectorAll('.pagination li')).map((li) => li.textContent);

// Design system: docs/design-system/components/pagination.html (buttons and links; current, disabled, gaps).
describe('Pagination', () => {
  it('is a labelled nav with a summary and page buttons', () => {
    render(<Pagination page={1} pageCount={2} summary="Showing 1–20 of 40" onPageChange={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav.textContent).toContain('Showing 1–20 of 40');
    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: '2' }).hasAttribute('aria-current')).toBe(false);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} pageCount={2} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(false);
    rerender(<Pagination page={2} pageCount={2} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls onPageChange with the chosen page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageCount={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1], [3]]);
  });

  it.each([
    [1, ['‹', '1', '2', '3', '4', '5', '…', '20', '›']],
    [10, ['‹', '1', '…', '9', '10', '11', '…', '20', '›']],
    [20, ['‹', '1', '…', '16', '17', '18', '19', '20', '›']],
  ])('collapses long ranges with gaps (page %i of 20)', (page, expected) => {
    render(<Pagination page={page} pageCount={20} onPageChange={() => {}} />);
    expect(labels()).toEqual(expected);
  });

  it('shows only the summary for a single page', () => {
    render(<Pagination page={1} pageCount={1} summary="Showing 1–5 of 5" />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('navigation').textContent).toBe('Showing 1–5 of 5');
  });

  it('link mode: renders hrefs, a disabled link and calls onNavigate', () => {
    const onNavigate = vi.fn();
    render(<Pagination page={1} pageCount={2} hrefFor={(p) => `#/events?page=${p}`} onNavigate={onNavigate} />);
    expect(screen.getByRole('link', { name: '1' }).getAttribute('aria-current')).toBe('page');
    const previous = screen.getByRole('link', { name: 'Previous page' });
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    expect(previous.hasAttribute('href')).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
    expect(onNavigate).toHaveBeenCalledWith('#/events?page=2', expect.anything());
  });
});
