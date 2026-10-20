import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/badge.html (tones, solid, count).
describe('Badge', () => {
  it.each([
    ['neutral', 'badge'],
    ['info', 'badge badge--info'],
    ['success', 'badge badge--success'],
    ['warning', 'badge badge--warning'],
    ['danger', 'badge badge--danger'],
  ] as const)('renders the %s tone', (tone, className) => {
    render(<Badge tone={tone}>Sent</Badge>);
    expect(screen.getByText('Sent').className).toBe(className);
  });

  it('solid uses the filled look', () => {
    render(<Badge solid>New</Badge>);
    expect(screen.getByText('New').className).toBe('badge badge--solid');
  });

  it('count shows the number and is named by its label', () => {
    const { container } = render(<Badge count={3} label="3 unread" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toBe('badge badge--count');
    expect(badge.textContent).toBe('33 unread');
    expect(screen.getByText('3').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('3 unread').className).toBe('visually-hidden');
  });
});
