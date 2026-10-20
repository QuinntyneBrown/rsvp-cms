import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog, type DialogProps } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/dialog.html (sizes, tones, description, footer, busy, focus).
function renderDialog(props: Partial<DialogProps> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <Dialog title="Remove 2 guests?" onClose={onClose} {...props}>
      {props.children ?? <p>They will stop getting reminders.</p>}
    </Dialog>,
  );
  return { onClose, ...utils };
}

describe('Dialog', () => {
  it('is a modal dialog named by its title, portalled to document.body', () => {
    const { container } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Remove 2 guests?' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.className).toBe('dialog');
    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.querySelector(':scope > .backdrop')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Remove 2 guests?' }).className).toBe('dialog__title');
    expect(dialog.getAttribute('aria-describedby')).toBeNull();
  });

  it.each([
    ['sm', 'dialog__panel dialog__panel--sm'],
    ['md', 'dialog__panel'],
    ['lg', 'dialog__panel dialog__panel--lg'],
  ] as const)('renders the %s size', (size, className) => {
    renderDialog({ size });
    expect(screen.getByRole('dialog').firstElementChild?.className).toBe(className);
  });

  it.each([
    ['default', 0],
    ['danger', 1],
  ] as const)('tone %s shows %i danger icon(s)', (tone, count) => {
    renderDialog({ tone });
    expect(document.querySelectorAll('.dialog__icon--danger').length).toBe(count);
  });

  it('description becomes the accessible description', () => {
    renderDialog({ description: 'You can add them back at any time.' });
    const desc = screen.getByText('You can add them back at any time.');
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('footer renders in the dialog footer', () => {
    renderDialog({ footer: <button type="button">Remove</button> });
    expect(screen.getByRole('button', { name: 'Remove' }).parentElement?.className).toBe('dialog__footer');
  });

  it('moves focus to the first focusable element in the body', () => {
    renderDialog({ children: <input aria-label="Name" /> });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
  });

  it('initialFocus="footer" focuses the safe action of a confirmation', () => {
    renderDialog({ initialFocus: 'footer', footer: <><button type="button">Cancel</button><button type="button">Remove</button></> });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('focuses the panel when the body has nothing focusable', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole('dialog').firstElementChild);
  });

  it('Escape and the close button call onClose', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('busy: sets aria-busy and ignores Escape and the close button', () => {
    const { onClose } = renderDialog({ busy: true });
    expect(screen.getByRole('dialog').firstElementChild?.getAttribute('aria-busy')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps Tab and Shift+Tab inside the dialog', () => {
    renderDialog({ children: <input aria-label="Name" />, footer: <button type="button">Save</button> });
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save' });
    act(() => save.focus());
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
  });

  it('returns focus to the opener when it closes', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open</button>
          {open && <Dialog title="Add guest" onClose={() => setOpen(false)}><input aria-label="Name" /></Dialog>}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    act(() => opener.focus());
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('does not move focus when the parent re-renders', () => {
    function Harness() {
      const [count, setCount] = useState(0);
      return (
        <Dialog title="Add guest" onClose={() => setCount(count + 1)}>
          <input aria-label="Name" />
          <button type="button" onClick={() => setCount(count + 1)}>Clicked {count}</button>
        </Dialog>
      );
    }
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Clicked 0' });
    act(() => button.focus());
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Clicked 1' })).toBe(button);
    expect(document.activeElement).toBe(button);
  });

  it('only the innermost of stacked dialogs closes on Escape', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog title="Outer" onClose={outer}><p>Outer</p></Dialog>
        <Dialog title="Inner" onClose={inner}><p>Inner</p></Dialog>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
  });
});
