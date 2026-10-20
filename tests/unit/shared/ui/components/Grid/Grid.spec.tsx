import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/grid.html (layout columns, auto, auto compact).
describe('Grid', () => {
  it.each([
    [{}, 'grid'],
    [{ auto: true }, 'grid grid--auto'],
    [{ auto: true, compact: true }, 'grid grid--auto-compact'],
  ])('%o renders %s', (props, className) => {
    const { container } = render(<Grid {...props}>Item</Grid>);
    expect(container.firstElementChild?.className).toBe(className);
  });

  it.each([
    ['div', 'DIV'],
    ['section', 'SECTION'],
    ['ul', 'UL'],
  ] as const)('as=%s', (as, tag) => {
    const { container } = render(<Grid as={as} aria-label="Summary">{as === 'ul' ? <li>Item</li> : 'Item'}</Grid>);
    expect(container.firstElementChild?.tagName).toBe(tag);
  });

  it('a labelled section is a region', () => {
    render(<Grid as="section" aria-label="Summary" auto>Item</Grid>);
    expect(screen.getByRole('region', { name: 'Summary' }).className).toBe('grid grid--auto');
  });
});
