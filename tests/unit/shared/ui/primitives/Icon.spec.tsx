import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { iconNames } from '../../../../../src/shared/ui/primitives/index.js';
import { Icon } from '../../../../../src/shared/ui/primitives/index.js';

// Design system: docs/design-system/components/icon.html (names, sizes, decorative vs meaningful).
describe('Icon', () => {
  it.each([
    'menu', 'close', 'search', 'plus', 'check', 'info', 'warning', 'danger', 'success', 'chevron-left',
    'chevron-right', 'chevron-down', 'calendar', 'home', 'users', 'mail', 'bell', 'settings', 'more', 'upload',
    'download', 'edit', 'trash', 'eye', 'link', 'gift',
  ] as const)('provides the %s glyph on a 24px grid', (name) => {
    expect(iconNames).toContain(name);
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelector('path')!.getAttribute('d')).toMatch(/^M/);
  });

  it.each([
    ['sm', 'icon icon--sm'],
    ['md', 'icon'],
    ['lg', 'icon icon--lg'],
  ] as const)('renders the %s size', (size, className) => {
    const { container } = render(<Icon name="check" size={size} />);
    expect(container.querySelector('svg')!.getAttribute('class')).toBe(className);
  });

  it('is decorative by default: hidden from assistive technology and not focusable', () => {
    const { container } = render(<Icon name="bell" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('with a label it is an image named by that label', () => {
    render(<Icon name="warning" label="Warning" />);
    const img = screen.getByRole('img', { name: 'Warning' });
    expect(img.getAttribute('aria-hidden')).toBeNull();
  });
});
