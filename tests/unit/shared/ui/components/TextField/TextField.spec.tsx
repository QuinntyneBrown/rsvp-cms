import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/text-field.html (types, sizes, search, states).
describe('TextField', () => {
  it.each(['text', 'email', 'password', 'number', 'search', 'url', 'tel', 'date', 'time'] as const)('renders type="%s"', (type) => {
    render(<TextField label="Value" id="v" type={type} />);
    const input = document.getElementById('v');
    expect(input?.getAttribute('type')).toBe(type);
    expect(input?.className).toBe('input');
  });

  it.each([
    ['sm', 'input input--sm'],
    ['md', 'input'],
    ['lg', 'input input--lg'],
  ] as const)('renders the %s size', (size, className) => {
    render(<TextField label="Name" size={size} />);
    expect(screen.getByRole('textbox', { name: 'Name' }).className).toBe(className);
  });

  it('puts a caller-given id on the <input> and passes attributes through', () => {
    const onChange = vi.fn();
    render(<TextField label="Event name" id="ev-name" value="Gala" placeholder="Name it" autoComplete="off" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Event name' }) as HTMLInputElement;
    expect(input.id).toBe('ev-name');
    expect(input.value).toBe('Gala');
    expect(input.placeholder).toBe('Name it');
    expect(input.getAttribute('autocomplete')).toBe('off');
    fireEvent.change(input, { target: { value: 'Ball' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('passes min and max through for number fields', () => {
    render(<TextField label="Plus-ones" type="number" min={0} max={9} />);
    const input = screen.getByRole('spinbutton', { name: 'Plus-ones' });
    expect(input.getAttribute('min')).toBe('0');
    expect(input.getAttribute('max')).toBe('9');
  });

  it('search variant: wraps the input in .search with a decorative icon', () => {
    render(<TextField label="Search events and guests" type="search" variant="search" hideLabel />);
    const input = screen.getByRole('searchbox', { name: 'Search events and guests' });
    expect(input.parentElement?.className).toBe('search');
    expect(input.parentElement?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('invalid: error message marks it invalid and is announced', () => {
    render(<TextField label="Email" id="e" type="email" error="Enter an email like name@example.com" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('e-error');
    expect(screen.getByRole('alert').textContent).toBe('Enter an email like name@example.com');
  });

  it('invalid without message', () => {
    render(<TextField label="Email" invalid />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('disabled, read-only and required states', () => {
    render(
      <>
        <TextField label="A" disabled />
        <TextField label="B" readOnly />
        <TextField label="C" required />
      </>,
    );
    expect((screen.getByRole('textbox', { name: 'A' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('textbox', { name: 'B' }) as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByRole('textbox', { name: 'C' }) as HTMLInputElement).required).toBe(true);
  });

  it('optional, hint and counter are rendered by the field', () => {
    render(<TextField label="Venue" id="ev-venue" optional hint="Where it happens" counter="0/120" />);
    const input = screen.getByRole('textbox', { name: 'Venue(optional)' });
    expect(input.getAttribute('aria-describedby')).toBe('ev-venue-help ev-venue-counter');
  });
});
