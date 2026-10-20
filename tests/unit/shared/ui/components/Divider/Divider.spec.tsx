import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Divider } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/divider.html.
describe('Divider', () => {
  it('is a separator by default', () => {
    render(<Divider />);
    expect(screen.getByRole('separator').className).toBe('divider');
  });

  it('decorative: hidden from assistive technology', () => {
    const { container } = render(<Divider decorative />);
    expect(screen.queryByRole('separator')).toBeNull();
    expect(container.querySelector('hr')?.getAttribute('aria-hidden')).toBe('true');
  });
});
