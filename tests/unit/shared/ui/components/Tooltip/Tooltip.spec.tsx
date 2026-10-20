import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, Tooltip } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/tooltip.html (hidden, hover, focus, dismissed).
function setup() {
  render(
    <Tooltip content="3 unread">
      <Button variant="ghost" iconOnly aria-label="Notifications">!</Button>
    </Tooltip>,
  );
  return { trigger: screen.getByRole('button', { name: 'Notifications' }), tip: screen.getByText('3 unread') };
}

describe('Tooltip', () => {
  it('is hidden by default and describes its trigger', () => {
    const { trigger, tip } = setup();
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.hidden).toBe(true);
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.parentElement?.className).toBe('has-tooltip');
  });

  it('shows on hover and hides on leave', () => {
    const { trigger, tip } = setup();
    fireEvent.mouseEnter(trigger.parentElement as HTMLElement);
    expect(screen.getByRole('tooltip').textContent).toBe('3 unread');
    fireEvent.mouseLeave(trigger.parentElement as HTMLElement);
    expect(tip.hidden).toBe(true);
  });

  it('shows on keyboard focus and hides on blur', () => {
    const { trigger, tip } = setup();
    fireEvent.focus(trigger);
    expect(tip.hidden).toBe(false);
    fireEvent.blur(trigger);
    expect(tip.hidden).toBe(true);
  });

  it('Escape hides it without moving focus; it shows again on the next focus', () => {
    const { trigger, tip } = setup();
    act(() => trigger.focus());
    expect(tip.hidden).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tip.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    act(() => trigger.blur());
    act(() => trigger.focus());
    expect(tip.hidden).toBe(false);
  });

  it('keeps an existing aria-describedby on the trigger', () => {
    render(
      <Tooltip content="Copies the link">
        <button type="button" aria-describedby="hint">Copy</button>
      </Tooltip>,
    );
    const tip = screen.getByText('Copies the link');
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toBe(`hint ${tip.id}`);
  });
});
