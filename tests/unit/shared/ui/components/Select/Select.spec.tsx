import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/select.html (default, help, invalid, disabled).
describe('Select', () => {
  it('renders a labelled native select with option children and the caller id', () => {
    const onChange = vi.fn();
    render(
      <Select label="Meal" id="rsvp-meal" value="" onChange={onChange}>
        <option value="">Choose a meal</option>
        <option>Fish</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Meal' }) as HTMLSelectElement;
    expect(select.id).toBe('rsvp-meal');
    expect(select.className).toBe('select');
    expect(select.options).toHaveLength(2);
    fireEvent.change(select, { target: { value: 'Fish' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('help text describes it', () => {
    render(<Select label="Party size" id="party" hint="Your invitation allows up to 2 places."><option>1</option></Select>);
    expect(screen.getByRole('combobox').getAttribute('aria-describedby')).toBe('party-help');
  });

  it('invalid: error is announced and linked', () => {
    render(<Select label="Meal" id="meal" error="Choose a meal"><option>Fish</option></Select>);
    const select = screen.getByRole('combobox');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe('meal-error');
    expect(screen.getByRole('alert').textContent).toBe('Choose a meal');
  });

  it('disabled and optional', () => {
    render(<Select label="Group" optional disabled><option>A</option></Select>);
    expect((screen.getByRole('combobox', { name: 'Group(optional)' }) as HTMLSelectElement).disabled).toBe(true);
  });
});
