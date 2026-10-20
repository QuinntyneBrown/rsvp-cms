import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/button.html (variants, sizes, states).
describe('Button', () => {
  it.each([
    ['secondary', 'btn'],
    ['primary', 'btn btn--primary'],
    ['ghost', 'btn btn--ghost'],
    ['link', 'btn btn--link'],
    ['danger', 'btn btn--danger'],
  ] as const)('renders the %s variant', (variant, className) => {
    render(<Button variant={variant}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).className).toBe(className);
  });

  it.each([
    ['sm', 'btn btn--sm'],
    ['md', 'btn'],
    ['lg', 'btn btn--lg'],
  ] as const)('renders the %s size', (size, className) => {
    render(<Button size={size}>Save</Button>);
    expect(screen.getByRole('button').className).toBe(className);
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled: is not operable', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading: sets aria-busy and ignores clicks', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('block and icon-only add their modifiers; icon-only is named by aria-label', () => {
    render(
      <>
        <Button block>Continue</Button>
        <Button iconOnly aria-label="Close">×</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Continue' }).className).toBe('btn btn--block');
    expect(screen.getByRole('button', { name: 'Close' }).className).toBe('btn btn--icon');
  });
});

describe('Button as a link', () => {
  it('renders an anchor with the button classes when href is given', () => {
    render(<Button variant="primary" href="#/events/new">New event</Button>);
    const link = screen.getByRole('link', { name: 'New event' });
    expect(link.getAttribute('href')).toBe('#/events/new');
    expect(link.className).toBe('btn btn--primary');
  });
});
