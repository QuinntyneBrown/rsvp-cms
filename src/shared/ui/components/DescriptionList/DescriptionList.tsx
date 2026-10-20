import { Fragment, type ReactNode } from 'react';
import './DescriptionList.css';

export interface DescriptionListItem {
  term: ReactNode;
  description: ReactNode;
  /** React key; defaults to the term when it is a string. */
  key?: string;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
}

/** Term and value pairs in two columns (event details, guest details). Design system: docs/design-system/components/description-list.html. */
export function DescriptionList({ items }: DescriptionListProps) {
  return (
    <dl className="dl">
      {items.map((item, i) => (
        <Fragment key={item.key ?? (typeof item.term === 'string' ? item.term : i)}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
