import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/checkbox.html (unchecked, checked, indeterminate, description, invalid, disabled).
describe('Checkbox', () => {
  it('renders .choice markup labelled by its text and toggles', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Keep me signed in" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Keep me signed in' });
    expect(box.closest('label')?.className).toBe('choice');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('checked', () => {
    render(<Checkbox label="A" checked onChange={() => {}} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('indeterminate', () => {
    render(<Checkbox label="Select all" indeterminate />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('description renders as small text inside the label', () => {
    render(<Checkbox label="Reminders" description="One email three days before." />);
    expect(document.querySelector('.choice__text small')?.textContent).toBe('One email three days before.');
    expect(screen.getByRole('checkbox', { name: 'RemindersOne email three days before.' })).toBeTruthy();
  });

  it('invalid and disabled', () => {
    const onChange = vi.fn();
    render(<><Checkbox label="A" invalid /><Checkbox label="B" disabled onChange={onChange} /></>);
    expect(screen.getByRole('checkbox', { name: 'A' }).getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByRole('checkbox', { name: 'B' }) as HTMLInputElement).disabled).toBe(true);
  });
});
