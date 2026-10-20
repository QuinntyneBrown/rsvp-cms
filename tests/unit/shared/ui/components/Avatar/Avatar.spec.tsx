import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar, initialsOf } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/avatar.html (initials, image, sizes).
describe('Avatar', () => {
  it.each([
    ['sm', 'avatar avatar--sm'],
    ['md', 'avatar'],
    ['lg', 'avatar avatar--lg'],
  ] as const)('renders the %s size', (size, className) => {
    render(<Avatar name="Priya Natarajan" size={size} />);
    expect(screen.getByRole('img', { name: 'Priya Natarajan' }).className).toBe(className);
  });

  it('initials: shows up to two initials, named by the full name', () => {
    render(<Avatar name="Priya Natarajan" />);
    expect(screen.getByRole('img', { name: 'Priya Natarajan' }).textContent).toBe('PN');
  });

  it.each([
    ['Priya Natarajan', 'PN'],
    ['Cher', 'C'],
    ['  mei  de la rodríguez ', 'MR'],
    ['', ''],
  ])('initialsOf(%j) is %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });

  it('image: shows the photo instead of initials', () => {
    const { container } = render(<Avatar name="Priya Natarajan" src="/p.jpg" />);
    expect(screen.getByRole('img', { name: 'Priya Natarajan' }).textContent).toBe('');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/p.jpg');
  });

  it('decorative: hidden from assistive technology', () => {
    const { container } = render(<Avatar name="Priya Natarajan" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('with onClick it is a labelled button', () => {
    const onClick = vi.fn();
    render(<Avatar name="Priya Natarajan" size="sm" label="Account menu for Priya Natarajan" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Account menu for Priya Natarajan' });
    expect(button.className).toBe('avatar avatar--sm');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
