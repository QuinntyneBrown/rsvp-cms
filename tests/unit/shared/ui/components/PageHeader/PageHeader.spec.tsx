import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb, PageHeader } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/page-header.html (title only, subtitle, actions, breadcrumb).
describe('PageHeader', () => {
  it('title only: an h1 and nothing else', () => {
    const { container } = render(<PageHeader title="Events" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeDefined();
    expect(container.firstElementChild?.className).toBe('page-header');
    expect(container.querySelector('.page-header__subtitle')).toBeNull();
    expect(container.querySelector('.page-header__actions')).toBeNull();
  });

  it('subtitle and actions', () => {
    const { container } = render(<PageHeader title="Good morning, Priya" subtitle="1 event is taking invites" actions={<button type="button">New event</button>} />);
    expect(container.querySelector('.page-header__subtitle')?.textContent).toBe('1 event is taking invites');
    expect(screen.getByRole('button', { name: 'New event' }).parentElement?.className).toBe('page-header__actions');
  });

  it('breadcrumb slot sits above the title', () => {
    const { container } = render(
      <PageHeader title="Maya’s 30th" breadcrumb={<Breadcrumb items={[{ href: '#/events', label: 'Events' }, { label: 'Maya’s 30th' }]} />} />,
    );
    const group = container.firstElementChild;
    expect(group?.className).toBe('page-header-group');
    expect(group?.children[0]?.tagName).toBe('NAV');
    expect(group?.children[1]?.className).toBe('page-header');
  });
});
