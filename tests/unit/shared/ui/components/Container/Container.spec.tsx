import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/container.html (default, narrow).
describe('Container', () => {
  it.each([
    [false, 'container'],
    [true, 'container container--narrow'],
  ])('narrow=%s renders %s', (narrow, className) => {
    const { container } = render(<Container narrow={narrow}>Content</Container>);
    expect(container.firstElementChild?.className).toBe(className);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it.each([
    ['main', 'main'],
    ['section', 'region'],
  ] as const)('as=%s renders that element', (as, role) => {
    render(<Container as={as} id="main" aria-label="Content">Content</Container>);
    expect(screen.getByRole(role).id).toBe('main');
  });
});
