import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from '../../../../../../src/shared/ui/components/index.js';

const steps = ['Upload', 'Map columns', 'Review', 'Done'];
const items = () => screen.getAllByRole('listitem');

// Design system: docs/design-system/components/stepper.html (upcoming, current, complete).
describe('Stepper', () => {
  it('is a labelled ordered list', () => {
    render(<Stepper steps={steps} current={0} />);
    const list = screen.getByRole('list', { name: 'Progress' });
    expect(list.tagName).toBe('OL');
    expect(list.className).toBe('stepper');
    expect(items()).toHaveLength(4);
  });

  it.each([
    [0, [undefined, undefined, undefined, undefined], 0],
    [2, ['true', 'true', undefined, undefined], 2],
    [4, ['true', 'true', 'true', 'true'], -1],
  ])('current=%i marks earlier steps complete', (current, complete, currentIndex) => {
    render(<Stepper steps={steps} current={current} />);
    expect(items().map((li) => li.getAttribute('data-complete') ?? undefined)).toEqual(complete);
    expect(items().findIndex((li) => li.getAttribute('aria-current') === 'step')).toBe(currentIndex);
  });

  it('announces completed steps in text, not only with the tick', () => {
    render(<Stepper steps={steps} current={1} />);
    expect(items()[0]?.textContent).toBe('Upload (completed)');
    expect(items()[1]?.textContent).toBe('Map columns');
  });
});
