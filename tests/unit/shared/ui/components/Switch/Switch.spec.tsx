import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/switch.html (off, on, disabled).
describe('Switch', () => {
  it('has role="switch", a name and reports the new state', () => {
    const onChange = vi.fn();
    render(<Switch label="Email me when someone replies" checked={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Email me when someone replies' });
    expect(sw.closest('label')?.className).toBe('switch');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('on', () => {
    const onChange = vi.fn();
    render(<Switch label="A" checked onChange={onChange} />);
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disabled', () => {
    render(<Switch label="A" checked={false} onChange={() => {}} disabled />);
    expect((screen.getByRole('switch') as HTMLInputElement).disabled).toBe(true);
  });
});
