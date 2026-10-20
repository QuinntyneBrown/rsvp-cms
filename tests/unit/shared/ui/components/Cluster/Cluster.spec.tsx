import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cluster } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/cluster.html (justify start, between, end).
describe('Cluster', () => {
  it.each([
    ['start', 'cluster'],
    ['between', 'cluster cluster--between'],
    ['end', 'cluster cluster--end'],
  ] as const)('justify %s', (justify, className) => {
    const { container } = render(<Cluster justify={justify}><span>A</span><span>B</span></Cluster>);
    expect(container.firstElementChild?.className).toBe(className);
    expect(container.firstElementChild?.children).toHaveLength(2);
  });

  it('defaults to start and passes ARIA attributes', () => {
    const { container } = render(<Cluster role="group" aria-label="Filters">A</Cluster>);
    expect(container.firstElementChild?.className).toBe('cluster');
    expect(container.firstElementChild?.getAttribute('aria-label')).toBe('Filters');
  });
});
