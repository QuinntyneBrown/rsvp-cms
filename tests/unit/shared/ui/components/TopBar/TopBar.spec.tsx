import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NavLink, TopBar, TopBarBrand } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/top-bar.html (brand, nav, search, actions, menu closed/open).
describe('TopBar', () => {
  it('is a banner with brand, spacer and actions', () => {
    const { container } = render(
      <TopBar brand={<TopBarBrand href="#/">Invitely</TopBarBrand>} actions={<span>From Priya</span>} />,
    );
    const banner = screen.getByRole('banner');
    expect(banner.className).toBe('topbar');
    expect(screen.getByRole('link', { name: 'Invitely' }).className).toBe('topbar__brand');
    expect(container.querySelector('.topbar__spacer')).not.toBeNull();
    expect(container.querySelector('.topbar__actions')?.textContent).toBe('From Priya');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the nav slot in a labelled navigation landmark', () => {
    render(<TopBar nav={<NavLink href="#/" current>Dashboard</NavLink>} navLabel="Main" />);
    expect(screen.getByRole('navigation', { name: 'Main' }).className).toBe('topbar__nav');
  });

  it('a search slot takes the free space instead of the spacer', () => {
    const { container } = render(<TopBar search={<input aria-label="Search" />} />);
    expect(container.querySelector('.topbar__search')).not.toBeNull();
    expect(container.querySelector('.topbar__spacer')).toBeNull();
  });

  it.each([
    [false, 'false'],
    [true, 'true'],
  ])('menu button reflects open=%s with aria-expanded and aria-controls', (open, expanded) => {
    const onMenuToggle = vi.fn();
    render(<TopBar onMenuToggle={onMenuToggle} menuOpen={open} menuControls="primary-nav" />);
    const button = screen.getByRole('button', { name: 'Open navigation' });
    expect(button.getAttribute('aria-expanded')).toBe(expanded);
    expect(button.getAttribute('aria-controls')).toBe('primary-nav');
    fireEvent.click(button);
    expect(onMenuToggle).toHaveBeenCalledOnce();
  });

  it('brand calls onNavigate on a plain click', () => {
    const onNavigate = vi.fn();
    render(<TopBar brand={<TopBarBrand href="#/" logo={<svg />} onNavigate={onNavigate}>Invitely</TopBarBrand>} />);
    fireEvent.click(screen.getByRole('link', { name: 'Invitely' }));
    expect(onNavigate).toHaveBeenCalledWith('#/', expect.anything());
  });
});
