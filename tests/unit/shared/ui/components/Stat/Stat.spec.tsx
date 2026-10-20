import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stat } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/stat.html (label, value, delta up/down, on a card).
describe('Stat', () => {
  it('renders the label and value', () => {
    const { container } = render(<Stat label="Attending" value={52} />);
    expect(container.firstElementChild?.className).toBe('stat');
    expect(screen.getByText('Attending').className).toBe('stat__label');
    expect(screen.getByText('52').className).toBe('stat__value');
    expect(container.querySelector('.stat__delta')).toBeNull();
  });

  it.each([
    ['up', 'stat__delta stat__delta--up', 'Up'],
    ['down', 'stat__delta stat__delta--down', 'Down'],
  ] as const)('delta %s is coloured and announced in words', (trend, className, word) => {
    const { container } = render(<Stat label="Attending" value={52} delta="4 this week" trend={trend} />);
    const delta = container.querySelector('.stat__delta') as HTMLElement;
    expect(delta.className).toBe(className);
    expect(screen.getByText(word).className).toBe('visually-hidden');
    expect(delta.textContent).toContain('4 this week');
  });

  it('a delta without a trend is neutral', () => {
    const { container } = render(<Stat label="Waiting" value={2} delta="No change" />);
    expect(container.querySelector('.stat__delta')?.className).toBe('stat__delta');
  });

  it('card: sits on its own card', () => {
    const { container } = render(<Stat label="Invitees" value={84} card />);
    expect(container.firstElementChild?.className).toBe('card');
    expect(container.querySelector('.card > .stat')).not.toBeNull();
  });
});
