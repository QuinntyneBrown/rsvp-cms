import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/table.html (caption, sortable headers, selected rows, numeric, row actions).
describe('Table', () => {
  it('renders a captioned table in a scroll wrapper', () => {
    const { container } = render(
      <Table caption="Scheduled emails">
        <TableHead><TableRow><TableHeaderCell>Email</TableHeaderCell></TableRow></TableHead>
        <TableBody><TableRow><TableCell>Invitation</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(container.firstElementChild?.className).toBe('table-wrap');
    const table = screen.getByRole('table', { name: 'Scheduled emails' });
    expect(table.className).toBe('table');
    expect(screen.getByRole('columnheader', { name: 'Email' }).getAttribute('scope')).toBe('col');
    expect(screen.getByRole('cell', { name: 'Invitation' }).className).toBe('');
  });

  it.each([
    [false, ''],
    [true, 'visually-hidden'],
  ])('captionHidden=%s', (hidden, className) => {
    const { container } = render(<Table caption="Guests" captionHidden={hidden}><TableBody>{null}</TableBody></Table>);
    expect(container.querySelector('caption')?.className).toBe(className);
  });

  it.each([
    ['ascending', 'ascending'],
    ['descending', 'descending'],
    ['none', 'none'],
    [undefined, 'none'],
  ] as const)('sortable header (sort=%s) sets aria-sort=%s and calls onSort', (sort, ariaSort) => {
    const onSort = vi.fn();
    render(
      <Table caption="Guests">
        <TableHead><TableRow><TableHeaderCell sort={sort} onSort={onSort}>Name</TableHeaderCell></TableRow></TableHead>
      </Table>,
    );
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header.getAttribute('aria-sort')).toBe(ariaSort);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledOnce();
  });

  it('a header without onSort is not sortable', () => {
    render(<Table caption="Guests"><TableHead><TableRow><TableHeaderCell>Name</TableHeaderCell></TableRow></TableHead></Table>);
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    [true, 'true'],
    [false, 'false'],
    [undefined, null],
  ])('row selected=%s sets aria-selected', (selected, ariaSelected) => {
    render(<Table caption="Guests"><TableBody><TableRow selected={selected}><TableCell>Mei</TableCell></TableRow></TableBody></Table>);
    expect(screen.getAllByRole('row')[0]?.getAttribute('aria-selected')).toBe(ariaSelected);
  });

  it('numeric cells and headers are right-aligned; row actions get their class', () => {
    render(
      <Table caption="Emails">
        <TableHead>
          <TableRow>
            <TableHeaderCell numeric>Recipients</TableHeaderCell>
            <TableHeaderCell labelHidden>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell numeric>84</TableCell>
            <TableCell actions><button type="button">Preview</button></TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('columnheader', { name: 'Recipients' }).className).toBe('num');
    expect(screen.getByRole('cell', { name: '84' }).className).toBe('num');
    expect(screen.getByRole('cell', { name: 'Preview' }).className).toBe('row-actions');
    expect(screen.getByText('Actions').className).toBe('visually-hidden');
  });

  it('a header cell can name its row', () => {
    render(<Table caption="Guests"><TableBody><TableRow><TableHeaderCell scope="row">Mei</TableHeaderCell></TableRow></TableBody></Table>);
    expect(screen.getByRole('rowheader', { name: 'Mei' }).getAttribute('scope')).toBe('row');
  });
});
