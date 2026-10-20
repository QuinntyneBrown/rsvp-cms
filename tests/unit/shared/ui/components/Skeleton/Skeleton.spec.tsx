import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonItem } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/skeleton.html (text, title, circle, rect; busy container).
describe('Skeleton', () => {
  it('defaults to three aria-hidden text rows in a busy container labelled "Loading"', () => {
    const { container } = render(<Skeleton />);
    const group = container.querySelector('.skeleton-group')!;
    expect(group.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading').className).toBe('visually-hidden');
    const pieces = container.querySelectorAll('.skeleton');
    expect(pieces).toHaveLength(3);
    pieces.forEach((p) => {
      expect(p.getAttribute('aria-hidden')).toBe('true');
      expect(p.getAttribute('style')).toBeNull();
    });
  });

  it('keeps the legacy rows prop working', () => {
    const { container } = render(<Skeleton rows={5} />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(5);
  });

  it.each(['text', 'title', 'circle', 'rect'] as const)('renders the %s variant', (variant) => {
    const { container } = render(<Skeleton rows={1} variant={variant} />);
    expect(container.querySelector('.skeleton')!.className).toBe(`skeleton skeleton--${variant}`);
  });

  it('composes a custom layout from SkeletonItems with a specific label', () => {
    const { container } = render(
      <Skeleton label="Loading the invitation page">
        <SkeletonItem variant="title" />
        <SkeletonItem />
        <SkeletonItem variant="rect" />
      </Skeleton>,
    );
    expect(screen.getByText('Loading the invitation page')).toBeTruthy();
    expect([...container.querySelectorAll('.skeleton')].map((e) => e.className)).toEqual([
      'skeleton skeleton--title',
      'skeleton skeleton--text',
      'skeleton skeleton--rect',
    ]);
  });
});
