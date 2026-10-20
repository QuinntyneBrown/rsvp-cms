import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/form-field.html (label, optional, help, counter, error).
describe('FormField', () => {
  it('labels the control through the render prop and wires nothing extra by default', () => {
    render(<FormField label="Venue" id="venue">{(c) => <input className="input" {...c} />}</FormField>);
    const input = screen.getByRole('textbox', { name: 'Venue' });
    expect(input.id).toBe('venue');
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('generates an id when none is given', () => {
    render(<FormField label="Venue">{(c) => <input {...c} />}</FormField>);
    expect(screen.getByRole('textbox', { name: 'Venue' }).id).not.toBe('');
  });

  it('optional: adds "(optional)" to the label', () => {
    render(<FormField label="Venue" id="v" optional>{(c) => <input {...c} />}</FormField>);
    expect(screen.getByRole('textbox', { name: 'Venue(optional)' })).toBeTruthy();
    expect(document.querySelector('.optional')?.textContent).toBe('(optional)');
  });

  it('help and counter: describe the control', () => {
    render(<FormField label="Message" id="m" hint="Shown to hosts." counter="0 of 280">{(c) => <textarea {...c} />}</FormField>);
    const box = screen.getByRole('textbox', { name: 'Message' });
    expect(box.getAttribute('aria-describedby')).toBe('m-help m-counter');
    expect(document.getElementById('m-help')?.className).toBe('field__help');
    expect(document.getElementById('m-counter')?.textContent).toBe('0 of 280');
  });

  it('error: marks the control invalid, describes it first and announces it', () => {
    render(<FormField label="Email" id="e" hint="We never share it." error="Enter an email">{(c) => <input {...c} />}</FormField>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('e-error e-help');
    expect(screen.getByRole('alert').textContent).toBe('Enter an email');
    expect(screen.getByRole('alert').id).toBe('e-error');
  });

  it('invalid: marks the control invalid without a message', () => {
    render(<FormField label="Email" id="e" invalid>{(c) => <input {...c} />}</FormField>);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts plain children for custom controls that use the same id', () => {
    render(<FormField label="Code" id="code"><input id="code" /></FormField>);
    expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy();
  });

  it('hideLabel: keeps the accessible name but hides the label visually', () => {
    render(<FormField label="Search" id="q" hideLabel>{(c) => <input {...c} />}</FormField>);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
    expect(document.querySelector('label')?.className).toBe('field__label field__label--hidden');
  });
});
