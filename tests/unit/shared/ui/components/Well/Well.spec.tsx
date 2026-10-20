import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Well } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/well.html.
describe('Well', () => {
  it('renders its content in a sunken well', () => {
    render(<Well aria-label="Preview">Hello</Well>);
    const well = screen.getByText('Hello');
    expect(well.className).toBe('well');
    expect(well.getAttribute('aria-label')).toBe('Preview');
  });
});
