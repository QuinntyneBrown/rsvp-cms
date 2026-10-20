import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, InlineStatus } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/inline-status.html (tones, dot, pulse, live).
describe('InlineStatus', () => {
  it.each([
    ['neutral', 'inline-status'],
    ['success', 'inline-status inline-status--success'],
    ['danger', 'inline-status inline-status--danger'],
  ] as const)('renders the %s tone', (tone, className) => {
    render(<InlineStatus tone={tone}>Draft · saved 2 min ago</InlineStatus>);
    expect(screen.getByText('Draft · saved 2 min ago').className).toBe(className);
  });

  it.each([
    ['static', 'dot'],
    ['pulse', 'dot dot--pulse'],
  ] as const)('shows a decorative %s dot', (dot, className) => {
    const { container } = render(<InlineStatus dot={dot}>Publishing…</InlineStatus>);
    const el = container.querySelector('.dot')!;
    expect(el.getAttribute('class')).toBe(className);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no dot and no live region by default', () => {
    const { container } = render(<InlineStatus>Draft</InlineStatus>);
    expect(container.querySelector('.dot')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('live: is a status region and can lead with an icon', () => {
    const { container } = render(<InlineStatus live tone="success" icon={<Icon name="check" size="sm" />}>Saved at 10:42 am</InlineStatus>);
    expect(screen.getByRole('status').textContent).toBe('Saved at 10:42 am');
    expect(container.querySelector('svg.icon--sm')).not.toBeNull();
  });
});
