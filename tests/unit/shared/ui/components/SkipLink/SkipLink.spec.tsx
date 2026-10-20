import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkipLink } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/skip-link.html.
describe('SkipLink', () => {
  it('targets #main with default copy', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to content' });
    expect(link.getAttribute('href')).toBe('#main');
    expect(link.className).toBe('skip-link');
  });

  it('accepts another target and label', () => {
    render(<SkipLink href="#rsvp-form">Skip to the RSVP form</SkipLink>);
    expect(screen.getByRole('link', { name: 'Skip to the RSVP form' }).getAttribute('href')).toBe('#rsvp-form');
  });
});
