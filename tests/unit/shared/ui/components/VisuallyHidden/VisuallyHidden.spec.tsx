import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/visually-hidden.html.
describe('VisuallyHidden', () => {
  it('renders a span with the visually-hidden class by default, keeping the text accessible', () => {
    render(<VisuallyHidden>Actions</VisuallyHidden>);
    const el = screen.getByText('Actions');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('visually-hidden');
  });

  it.each(['p', 'div', 'h2'] as const)('renders as %s', (as) => {
    render(<VisuallyHidden as={as}>Loading</VisuallyHidden>);
    expect(screen.getByText('Loading').tagName).toBe(as.toUpperCase());
  });

  it('as a label it names its form control', () => {
    render(
      <>
        <VisuallyHidden as="label" htmlFor="q">Search guests</VisuallyHidden>
        <input id="q" type="search" />
      </>,
    );
    expect(screen.getByRole('searchbox', { name: 'Search guests' })).toBeTruthy();
  });

  it('as a caption it names its table', () => {
    render(
      <table>
        <VisuallyHidden as="caption">Scheduled emails</VisuallyHidden>
        <tbody><tr><td>x</td></tr></tbody>
      </table>,
    );
    expect(screen.getByRole('table', { name: 'Scheduled emails' })).toBeTruthy();
  });
});
