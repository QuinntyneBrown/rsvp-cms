import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Link } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/link.html (inline, standalone, external).
describe('Link', () => {
  it.each([
    ['inline', 'link'],
    ['standalone', 'link link--standalone'],
  ] as const)('renders the %s variant', (variant, className) => {
    render(<Link href="/events" variant={variant}>Events</Link>);
    const link = screen.getByRole('link', { name: 'Events' });
    expect(link.className).toBe(className);
    expect(link.getAttribute('href')).toBe('/events');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('external: opens in a new tab safely and says so', () => {
    render(<Link href="https://example.com" external>Venue map</Link>);
    const link = screen.getByRole('link', { name: /^Venue map ?\(opens in new tab\)$/ });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('icon slot renders before the text', () => {
    render(<Link href="/" variant="standalone" icon={<svg aria-hidden="true" data-testid="i" />}>Back</Link>);
    expect(screen.getByRole('link', { name: 'Back' }).firstElementChild?.getAttribute('data-testid')).toBe('i');
  });
});
