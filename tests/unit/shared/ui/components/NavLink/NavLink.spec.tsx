import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NavLink } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/nav-link.html (default, hover, current; icon and badge).
describe('NavLink', () => {
  it('default: a link with no aria-current', () => {
    render(<NavLink href="#/events">Events</NavLink>);
    const link = screen.getByRole('link', { name: 'Events' });
    expect(link.className).toBe('nav-link');
    expect(link.getAttribute('href')).toBe('#/events');
    expect(link.hasAttribute('aria-current')).toBe(false);
  });

  it('current: marked aria-current="page"', () => {
    render(<NavLink href="#/" current>Dashboard</NavLink>);
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe('page');
  });

  it('renders a decorative icon and a badge', () => {
    render(
      <NavLink href="#/notifications" icon={<svg data-testid="icon" />} badge={<span aria-label="3 unread">3</span>}>
        Notifications
      </NavLink>,
    );
    expect(screen.getByTestId('icon').parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('link').textContent).toBe('Notifications3');
  });

  it('calls onNavigate on a plain click so a router can intercept', () => {
    const onNavigate = vi.fn((_href: string, event: { preventDefault: () => void }) => event.preventDefault());
    render(<NavLink href="#/events" onNavigate={onNavigate}>Events</NavLink>);
    const notPrevented = fireEvent.click(screen.getByRole('link'));
    expect(onNavigate).toHaveBeenCalledWith('#/events', expect.anything());
    expect(notPrevented).toBe(false);
  });

  it('leaves modified clicks (open in new tab) to the browser', () => {
    const onNavigate = vi.fn();
    render(<NavLink href="#/events" onNavigate={onNavigate}>Events</NavLink>);
    fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
    fireEvent.click(screen.getByRole('link'), { metaKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
