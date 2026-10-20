import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import './Table.css';

export interface TableProps {
  /** Names the table for assistive technology. */
  caption: ReactNode;
  /** Keeps the caption for screen readers only, when a visible heading already introduces the table. */
  captionHidden?: boolean;
  /** TableHead and TableBody. */
  children: ReactNode;
}

/**
 * Rows of records in a scrollable, bordered wrapper. Compose it from TableHead, TableBody, TableRow,
 * TableHeaderCell and TableCell. Design system: docs/design-system/components/table.html.
 */
export function Table({ caption, captionHidden, children }: TableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className={captionHidden ? 'visually-hidden' : undefined}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/** The header row group (<thead>). */
export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

/** The body row group (<tbody>). */
export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export interface TableRowProps {
  /** Highlights the row and sets aria-selected (e.g. checked in a bulk selection). */
  selected?: boolean;
  children: ReactNode;
}

/** One row (<tr>). */
export function TableRow({ selected, children }: TableRowProps) {
  return <tr aria-selected={selected === undefined ? undefined : selected}>{children}</tr>;
}

export type TableSort = 'ascending' | 'descending' | 'none';

export interface TableHeaderCellProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'className' | 'style' | 'scope'> {
  /** Right-aligns with tabular figures for numbers. */
  numeric?: boolean;
  /** Makes the column sortable: the header becomes a button and aria-sort reports the state. */
  sort?: TableSort;
  /** Called when the sort button is pressed; the page decides the next direction. */
  onSort?: () => void;
  /** 'row' for a header cell that names its row; defaults to 'col'. */
  scope?: 'col' | 'row';
  /** Visually hides the header text (e.g. an "Actions" column) while keeping it for screen readers. */
  labelHidden?: boolean;
  children: ReactNode;
}

/** A header cell (<th>), optionally sortable. */
export function TableHeaderCell({ numeric, sort, onSort, scope = 'col', labelHidden, children, ...rest }: TableHeaderCellProps) {
  const label = labelHidden ? <span className="visually-hidden">{children}</span> : children;
  const sortable = onSort !== undefined;
  return (
    <th {...rest} scope={scope} className={numeric ? 'num' : undefined} aria-sort={sortable ? (sort ?? 'none') : undefined}>
      {sortable ? (
        <button type="button" onClick={onSort}>
          {label}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'className' | 'style'> {
  /** Right-aligns with tabular figures for numbers. */
  numeric?: boolean;
  /** A cell of row actions: fades in on row hover or focus (always shown on touch screens). */
  actions?: boolean;
  children?: ReactNode;
}

/** A data cell (<td>). */
export function TableCell({ numeric, actions, children, ...rest }: TableCellProps) {
  const classes: string[] = [];
  if (numeric) classes.push('num');
  if (actions) classes.push('row-actions');
  return (
    <td {...rest} className={classes.length ? classes.join(' ') : undefined}>
      {children}
    </td>
  );
}
