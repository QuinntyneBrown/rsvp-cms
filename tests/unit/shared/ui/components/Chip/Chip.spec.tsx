import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/chip.html (static, filter, removable).
describe('Chip', () => {
  it('static: a non-interactive label', () => {
    render(<Chip>Family</Chip>);
    expect(screen.getByText('Family').className).toBe('chip');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    [false, 'false', true],
    [true, 'true', false],
  ])('filter (pressed=%s): toggle button with aria-pressed that calls onToggle', (pressed, ariaPressed, next) => {
    const onToggle = vi.fn();
    render(<Chip pressed={pressed} onToggle={onToggle}>Waiting</Chip>);
    const chip = screen.getByRole('button', { name: 'Waiting' });
    expect(chip.className).toBe('chip');
    expect(chip.getAttribute('aria-pressed')).toBe(ariaPressed);
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith(next);
  });

  it('filter disabled: not operable', () => {
    const onToggle = vi.fn();
    render(<Chip pressed={false} onToggle={onToggle} disabled>Waiting</Chip>);
    fireEvent.click(screen.getByRole('button', { name: 'Waiting' }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('removable: a labelled remove button calls onRemove', () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Family</Chip>);
    const remove = screen.getByRole('button', { name: 'Remove Family' });
    expect(remove.className).toBe('remove');
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('removable: removeLabel names the button when the content is not plain text', () => {
    render(<Chip onRemove={() => {}} removeLabel="group filter"><strong>Family</strong></Chip>);
    expect(screen.getByRole('button', { name: 'Remove group filter' })).toBeTruthy();
  });
});
