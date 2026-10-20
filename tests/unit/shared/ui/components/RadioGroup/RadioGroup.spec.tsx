import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from '../../../../../../src/shared/ui/components/index.js';

const options = [
  { value: 'yes', label: 'Joyfully accepting' },
  { value: 'no', label: 'Regretfully declining', description: 'We will tell your hosts.' },
];

// Design system: docs/design-system/components/radio-group.html (unselected, selected, description, invalid, disabled).
describe('RadioGroup', () => {
  it('is a fieldset group named by its legend, with one radio per option', () => {
    render(<RadioGroup legend="Will you attend?" name="attending" id="attend" options={options} onChange={() => {}} />);
    const group = screen.getByRole('group', { name: 'Will you attend?' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.id).toBe('attend');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Joyfully accepting' }).id).toBe('attend-yes');
  });

  it('reflects the selected value and reports changes', () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Will you attend?" name="attending" options={options} value="yes" onChange={onChange} />);
    expect((screen.getByRole('radio', { name: 'Joyfully accepting' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Regretfully declining/ }));
    expect(onChange).toHaveBeenCalledWith('no');
  });

  it('option description and custom option id', () => {
    render(<RadioGroup legend="L" name="n" options={[{ value: 'a', label: 'A', description: 'More', id: 'first' }]} onChange={() => {}} />);
    expect(document.querySelector('.choice__text small')?.textContent).toBe('More');
    expect(document.getElementById('first')).toBeTruthy();
  });

  it('invalid: error is announced, linked to the group and marks each radio', () => {
    render(<RadioGroup legend="Will you attend?" name="a" id="attend" options={options} onChange={() => {}} error="Choose whether you're coming." />);
    expect(screen.getByRole('group').getAttribute('aria-describedby')).toBe('attend-error');
    expect(screen.getByRole('alert').textContent).toBe("Choose whether you're coming.");
    for (const radio of screen.getAllByRole('radio')) expect(radio.getAttribute('aria-invalid')).toBe('true');
  });

  it('disabled group and disabled option', () => {
    const { unmount } = render(<RadioGroup legend="L" name="n" options={options} onChange={() => {}} disabled />);
    expect((screen.getByRole('group') as HTMLFieldSetElement).disabled).toBe(true);
    unmount();
    render(<RadioGroup legend="L" name="n" options={[{ value: 'a', label: 'A', disabled: true }]} onChange={() => {}} />);
    expect((screen.getByRole('radio') as HTMLInputElement).disabled).toBe(true);
  });

  it('required marks the radios required', () => {
    render(<RadioGroup legend="L" name="n" options={options} onChange={() => {}} required />);
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).required).toBe(true);
  });
});
