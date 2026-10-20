import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card, CardFooter, CardHeader } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/card.html (variants, header, footer, selected).
describe('Card', () => {
  it.each([
    ['default', 'card'],
    ['interactive', 'card card--interactive'],
    ['selected', 'card card--selected'],
    ['flush', 'card card--flush'],
  ] as const)('renders the %s variant', (variant, className) => {
    const { container } = render(<Card variant={variant}>Body</Card>);
    expect((container.firstElementChild as HTMLElement).className).toBe(className);
  });

  it('header renders the title, subtitle and actions; footer holds actions', () => {
    render(
      <Card>
        <CardHeader title="Hero" subtitle="Block 1 of 3" actions={<button type="button">Move up</button>} />
        <p>Body</p>
        <CardFooter><button type="button">Save</button></CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Hero' }).className).toBe('card__title');
    expect(screen.getByText('Block 1 of 3').className).toBe('text-caption');
    expect(screen.getByRole('button', { name: 'Move up' }).parentElement?.className).toBe('card__actions');
    expect(screen.getByRole('button', { name: 'Save' }).parentElement?.className).toBe('card__footer');
  });

  it('a section card with a header is a region named by its title', () => {
    render(
      <Card as="section">
        <CardHeader title="Details" level={3} />
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Details' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toBeTruthy();
  });

  it('with onClick the whole card is one button that calls back', () => {
    const onClick = vi.fn();
    render(
      <Card onClick={onClick}>
        <CardHeader title="Hero" level="none" />
      </Card>,
    );
    const button = screen.getByRole('button', { name: 'Hero' });
    expect(button.className).toBe('card card--interactive');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each([
    [true, 'true', 'card card--interactive card--selected'],
    [false, 'false', 'card card--interactive'],
  ])('selected=%s on a pressable card sets aria-pressed', (selected, pressed, className) => {
    render(<Card onClick={() => {}} selected={selected}>Hero</Card>);
    const button = screen.getByRole('button', { name: 'Hero' });
    expect(button.getAttribute('aria-pressed')).toBe(pressed);
    expect(button.className).toBe(className);
  });
});
