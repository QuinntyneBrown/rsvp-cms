import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from '../../../../../../src/shared/ui/components/index.js';

const items = [
  { href: '#/', label: 'Dashboard' },
  { href: '#/events', label: 'Events' },
  { label: 'Maya’s 30th birthday' },
];

// Design system: docs/design-system/components/breadcrumb.html (links, current page).
describe('Breadcrumb', () => {
  it('is a labelled nav with an ordered list', () => {
    const { container } = render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeDefined();
    expect(container.querySelector('ol')?.className).toBe('breadcrumb');
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Dashboard', 'Events']);
  });

  it('marks the last item without href as the current page', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.tagName).toBe('LI');
    expect(current?.textContent).toBe('Maya’s 30th birthday');
  });

  it('current flag wins over href', () => {
    const { container } = render(<Breadcrumb items={[{ href: '#/', label: 'Dashboard', current: true }]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('Dashboard');
  });

  it('calls onNavigate on a plain click', () => {
    const onNavigate = vi.fn();
    render(<Breadcrumb items={items} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('link', { name: 'Events' }));
    expect(onNavigate).toHaveBeenCalledWith('#/events', expect.anything());
  });
});
