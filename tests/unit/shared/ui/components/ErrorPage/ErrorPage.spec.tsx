import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, ErrorPage } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/error-page.html (404, 403, 500, offline).
describe('ErrorPage', () => {
  it.each([
    ['not-found', 'search', 'We can’t find that page', 'empty'],
    ['forbidden', 'lock', 'You don’t have access to this page', 'empty'],
    ['server-error', 'warning', 'Something went wrong on our side', 'empty empty--error'],
    ['offline', 'wifi-off', 'You’re offline', 'empty'],
  ] as const)('%s: default h1, icon and tone', (kind, icon, title, className) => {
    const { container } = render(<ErrorPage kind={kind} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(container.querySelector('.error-page > .empty')!.className).toBe(className);
    expect(container.querySelector('.empty__icon svg')!.getAttribute('data-icon')).toBe(icon);
  });

  it('server-error is announced as an alert; other kinds are not', () => {
    const { rerender } = render(<ErrorPage kind="server-error" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    rerender(<ErrorPage kind="not-found" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts custom title, text, actions and a reference id', () => {
    render(
      <ErrorPage
        kind="server-error"
        title="Something broke"
        text="Your changes are saved."
        reference="INV-7C41"
        actions={<Button variant="primary">Try again</Button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Something broke' })).toBeTruthy();
    expect(screen.getByText(/Your changes are saved\. Reference: INV-7C41\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
