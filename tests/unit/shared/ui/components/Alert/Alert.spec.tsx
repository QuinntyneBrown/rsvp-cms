import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert, Button } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/alert.html (tones, banner, dismissible, actions, live).
describe('Alert', () => {
  it.each([
    ['info', 'alert', 'info'],
    ['success', 'alert alert--success', 'success'],
    ['warning', 'alert alert--warning', 'warning'],
    ['danger', 'alert alert--danger', 'danger'],
  ] as const)('renders the %s tone with its icon', (tone, className, icon) => {
    const { container } = render(<Alert tone={tone} title="RSVP closes tomorrow">Last chance.</Alert>);
    expect(screen.getByRole('status').className).toBe(className);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-icon')).toBe(icon);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows title, text and actions', () => {
    render(<Alert title="Import failed" actions={<Button size="sm">Retry</Button>}>2 rows have no email.</Alert>);
    expect(screen.getByText('Import failed').className).toBe('alert__title');
    expect(screen.getByText('2 rows have no email.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' }).closest('.alert__actions')).not.toBeNull();
  });

  it('banner: adds the page-banner modifier', () => {
    render(<Alert tone="warning" banner title="RSVP closes tomorrow" />);
    expect(screen.getByRole('status').className).toBe('alert alert--warning banner');
  });

  it('live: uses role="alert"; otherwise role="status"', () => {
    render(<Alert tone="danger" live title="RSVPs are closed." />);
    expect(screen.getByRole('alert').textContent).toContain('RSVPs are closed.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('dismissible: a labelled close button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Alert title="Saved" onDismiss={onDismiss} dismissLabel="Dismiss message" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('is not dismissible without onDismiss', () => {
    render(<Alert title="Saved" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('passes through id and tabIndex for a focusable error summary', () => {
    render(<Alert tone="danger" live id="form-errors" tabIndex={-1} title="Fix 2 errors" />);
    const el = screen.getByRole('alert');
    expect(el.id).toBe('form-errors');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });
});
