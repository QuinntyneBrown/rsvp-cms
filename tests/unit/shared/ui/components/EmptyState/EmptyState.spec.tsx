import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, EmptyState } from '../../../../../../src/shared/ui/components/index.js';
import { Icon } from '../../../../../../src/shared/ui/primitives/index.js';

// Design system: docs/design-system/components/empty-state.html (default, compact, error).
describe('EmptyState', () => {
  it('default: icon, heading, text and actions; not a live region', () => {
    const onAdd = vi.fn();
    const { container } = render(
      <EmptyState
        icon={<Icon name="users" />}
        title="No guests yet"
        text="Add guests one by one or import a CSV."
        actions={<Button variant="primary" onClick={onAdd}>Add a guest</Button>}
      />,
    );
    expect(container.firstElementChild!.className).toBe('empty');
    expect(container.querySelector('.empty__icon')!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('heading', { level: 2, name: 'No guests yet' }).className).toBe('empty__title');
    expect(screen.getByText('Add guests one by one or import a CSV.').className).toBe('empty__text');
    fireEvent.click(screen.getByRole('button', { name: 'Add a guest' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('compact: adds the compact modifier', () => {
    const { container } = render(<EmptyState compact title="No invitees" />);
    expect(container.firstElementChild!.className).toBe('empty empty--compact');
  });

  it('omits the icon badge when no icon is given', () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(container.querySelector('.empty__icon')).toBeNull();
  });

  it('error tone: role="alert", danger modifier, warning icon by default; covers the old ErrorState with a retry', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <EmptyState tone="error" title="We couldn’t load your guests" actions={<Button onClick={onRetry}>Try again</Button>} />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.className).toBe('empty empty--error');
    expect(container.querySelector('.empty__icon svg')!.getAttribute('data-icon')).toBe('warning');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it.each([1, 2, 3] as const)('renders the title as an h%i', (level) => {
    render(<EmptyState headingLevel={level} title="You’re all caught up" />);
    expect(screen.getByRole('heading', { level, name: 'You’re all caught up' })).toBeTruthy();
  });
});
