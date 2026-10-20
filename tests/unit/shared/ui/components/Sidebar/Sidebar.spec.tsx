import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar, SidebarLayout, TopBarBrand } from '../../../../../../src/shared/ui/components/index.js';

const groups = [
  { items: [{ href: '#/', label: 'Dashboard', current: true }, { href: '#/events', label: 'Events' }] },
  { heading: 'Account', items: [{ href: '#/account', label: 'Account' }] },
];

// Design system: docs/design-system/components/sidebar.html (groups, current link, closed/open on small screens).
describe('Sidebar', () => {
  it('is a labelled navigation landmark of nav links', () => {
    render(<Sidebar groups={groups} />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav.className).toBe('sidebar');
    expect(screen.getAllByRole('link').map((link) => link.className)).toEqual(['nav-link', 'nav-link', 'nav-link']);
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe('page');
  });

  it('labels a group by its heading', () => {
    render(<Sidebar groups={groups} />);
    const group = screen.getByRole('group', { name: 'Account' });
    expect(group.querySelector('.sidebar__group')?.textContent).toBe('Account');
    expect(group.querySelectorAll('a')).toHaveLength(1);
  });

  it.each([
    [undefined, 'false'],
    [false, 'false'],
    [true, 'true'],
  ])('open=%s sets data-open=%s', (open, state) => {
    render(<Sidebar id="primary-nav" groups={groups} open={open} />);
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('data-open')).toBe(state);
    expect(nav.id).toBe('primary-nav');
  });

  it('renders the brand slot', () => {
    render(<Sidebar brand={<TopBarBrand href="#/">Invitely</TopBarBrand>} groups={groups} />);
    expect(screen.getByRole('link', { name: 'Invitely' }).parentElement?.className).toBe('sidebar__brand');
  });

  it('Escape calls onClose', () => {
    const onClose = vi.fn();
    render(<Sidebar groups={groups} open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('link', { name: 'Events' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('passes onNavigate to its links', () => {
    const onNavigate = vi.fn();
    render(<Sidebar groups={groups} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('link', { name: 'Events' }));
    expect(onNavigate).toHaveBeenCalledWith('#/events', expect.anything());
  });

  it('SidebarLayout places the sidebar beside the content', () => {
    const { container } = render(<SidebarLayout sidebar={<Sidebar groups={groups} />}><main>Content</main></SidebarLayout>);
    const layout = container.firstElementChild;
    expect(layout?.className).toBe('sidebar-layout');
    expect(layout?.children[0]?.className).toBe('sidebar');
    expect(layout?.children[1]?.textContent).toBe('Content');
  });
});
