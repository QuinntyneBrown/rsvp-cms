import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast, ToastRegion } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/toast.html (region, tones, action, dismiss).
describe('Toast', () => {
  it('ToastRegion is a polite status region that is present even when empty', () => {
    render(<ToastRegion />);
    const region = screen.getByRole('status');
    expect(region.className).toBe('toast-region');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.childElementCount).toBe(0);
  });

  it('ToastRegion can sit at the top', () => {
    render(<ToastRegion position="top" />);
    expect(screen.getByRole('status').className).toBe('toast-region toast-region--top');
  });

  it.each([
    ['info', 'toast toast--info'],
    ['success', 'toast toast--success'],
    ['warning', 'toast toast--warning'],
  ] as const)('renders the %s tone with its icon', (tone, className) => {
    const { container } = render(<ToastRegion><Toast tone={tone} title="Invite window updated" text="Invites now close on Sat 7 Nov." /></ToastRegion>);
    const toast = container.querySelector('.toast')!;
    expect(toast.className).toBe(className);
    expect(toast.getAttribute('role')).toBeNull();
    expect(toast.querySelector('svg')!.getAttribute('data-icon')).toBe(tone);
    expect(screen.getByText('Invites now close on Sat 7 Nov.').className).toBe('toast__text');
  });

  it('danger toasts are assertive (role="alert")', () => {
    render(<ToastRegion><Toast tone="danger" title="Couldn’t save your changes" /></ToastRegion>);
    expect(screen.getByRole('alert').className).toBe('toast toast--danger');
  });

  it('action and dismiss buttons call their callbacks', () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<Toast tone="success" title="Guest removed" actionLabel="Undo" onAction={onAction} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has no buttons without callbacks', () => {
    render(<Toast title="Saved" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('legacy message prop: renders the region with one plain toast, or an empty region for null', () => {
    const { rerender, container } = render(<Toast message="Removed 2 guests" />);
    expect(screen.getByRole('status').textContent).toBe('Removed 2 guests');
    expect(container.querySelector('.toast')!.className).toBe('toast');
    rerender(<Toast message={null} />);
    expect(screen.getByRole('status').childElementCount).toBe(0);
  });
});
