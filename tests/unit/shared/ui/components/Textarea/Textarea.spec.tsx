import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/textarea.html (default, counter, invalid, disabled, read-only).
describe('Textarea', () => {
  it('renders a labelled textarea with the caller id and passes attributes through', () => {
    const onChange = vi.fn();
    render(<Textarea label="Dietary needs" id="rsvp-dietary" value="None" rows={3} onChange={onChange} />);
    const box = screen.getByRole('textbox', { name: 'Dietary needs' }) as HTMLTextAreaElement;
    expect(box.tagName).toBe('TEXTAREA');
    expect(box.id).toBe('rsvp-dietary');
    expect(box.className).toBe('textarea');
    expect(box.rows).toBe(3);
    fireEvent.change(box, { target: { value: 'Vegan' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('counter and optional', () => {
    render(<Textarea label="Message" id="m" optional counter="280 characters left" />);
    const box = screen.getByRole('textbox', { name: 'Message(optional)' });
    expect(box.getAttribute('aria-describedby')).toBe('m-counter');
    expect(document.getElementById('m-counter')?.textContent).toBe('280 characters left');
  });

  it('invalid: error is announced and linked', () => {
    render(<Textarea label="Message" id="m" error="Keep it under 280 characters" />);
    const box = screen.getByRole('textbox');
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(box.getAttribute('aria-describedby')).toBe('m-error');
    expect(screen.getByRole('alert').textContent).toBe('Keep it under 280 characters');
  });

  it('disabled and read-only', () => {
    render(<><Textarea label="A" disabled /><Textarea label="B" readOnly /></>);
    expect((screen.getByRole('textbox', { name: 'A' }) as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole('textbox', { name: 'B' }) as HTMLTextAreaElement).readOnly).toBe(true);
  });
});
