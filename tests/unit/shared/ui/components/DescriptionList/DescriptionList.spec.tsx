import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DescriptionList } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/description-list.html.
describe('DescriptionList', () => {
  it('renders term and description pairs in order', () => {
    const { container } = render(
      <DescriptionList
        items={[
          { term: 'When', description: 'Sat 14 Nov 2026 · 7:00 pm' },
          { term: 'Where', description: 'The Lantern Room' },
          { term: <em>Dress</em>, description: 'Something you can dance in', key: 'dress' },
        ]}
      />,
    );
    const dl = container.querySelector('dl') as HTMLElement;
    expect(dl.className).toBe('dl');
    expect(Array.from(dl.children, (el) => `${el.tagName}:${el.textContent}`)).toEqual([
      'DT:When', 'DD:Sat 14 Nov 2026 · 7:00 pm', 'DT:Where', 'DD:The Lantern Room', 'DT:Dress', 'DD:Something you can dance in',
    ]);
  });

  it('renders an empty list without items', () => {
    const { container } = render(<DescriptionList items={[]} />);
    expect(container.querySelector('dl')?.children.length).toBe(0);
  });
});
