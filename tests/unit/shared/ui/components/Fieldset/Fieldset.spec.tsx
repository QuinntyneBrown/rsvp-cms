import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Fieldset } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/fieldset.html (default, help, optional, invalid, disabled).
describe('Fieldset', () => {
  it('is a group named by its legend', () => {
    render(<Fieldset legend="Your details" id="details"><input aria-label="Name" /></Fieldset>);
    const group = screen.getByRole('group', { name: 'Your details' });
    expect(group.id).toBe('details');
    expect(group.className).toBe('fieldset');
    expect(group.getAttribute('aria-describedby')).toBeNull();
  });

  it('help and error describe the group; error is announced', () => {
    render(<Fieldset legend="L" id="g" hint="Pick one" error="Required"><input /></Fieldset>);
    expect(screen.getByRole('group').getAttribute('aria-describedby')).toBe('g-error g-help');
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });

  it('optional and disabled', () => {
    render(<Fieldset legend="Extras" optional disabled><input aria-label="X" /></Fieldset>);
    const group = screen.getByRole('group', { name: /^Extras ?\(optional\)$/ }) as HTMLFieldSetElement;
    expect(group.disabled).toBe(true);
  });
});
