import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stack } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/stack.html (gap sm, md, lg).
describe('Stack', () => {
  it.each([
    ['sm', 'stack stack--sm'],
    ['md', 'stack'],
    ['lg', 'stack stack--lg'],
  ] as const)('gap %s', (gap, className) => {
    const { container } = render(<Stack gap={gap}>Item</Stack>);
    expect(container.firstElementChild?.className).toBe(className);
  });

  it.each(['div', 'section', 'ul', 'ol', 'form'] as const)('as=%s renders that element', (as) => {
    const { container } = render(<Stack as={as}>{as === 'ul' || as === 'ol' ? <li>Item</li> : 'Item'}</Stack>);
    expect(container.firstElementChild?.tagName).toBe(as.toUpperCase());
  });

  it('as a form passes form attributes and onSubmit through', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { container } = render(<Stack as="form" aria-label="Sign in" noValidate onSubmit={onSubmit}><button type="submit">Go</button></Stack>);
    const form = container.querySelector('form');
    expect(form?.noValidate).toBe(true);
    expect(form?.getAttribute('aria-label')).toBe('Sign in');
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
