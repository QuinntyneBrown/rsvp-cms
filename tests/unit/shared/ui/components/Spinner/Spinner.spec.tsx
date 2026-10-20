import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/spinner.html (sizes, status label).
describe('Spinner', () => {
  it.each([
    ['sm', 'spinner spinner--sm'],
    ['md', 'spinner'],
    ['lg', 'spinner spinner--lg'],
  ] as const)('renders the %s size', (size, className) => {
    render(<Spinner size={size} />);
    expect(screen.getByRole('status').className).toBe(className);
  });

  it('is a status named "Loading" by default via visually hidden text', () => {
    render(<Spinner />);
    expect(screen.getByRole('status').textContent).toBe('Loading');
    expect(screen.getByText('Loading').className).toBe('visually-hidden');
  });

  it('announces a custom label', () => {
    render(<Spinner label="Saving guest" />);
    expect(screen.getByRole('status').textContent).toBe('Saving guest');
  });
});
