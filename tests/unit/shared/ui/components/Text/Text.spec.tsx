import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/text.html (variants, tones, truncate, element).
describe('Text', () => {
  it.each([
    ['body', 'text'],
    ['body-sm', 'text text--body-sm'],
    ['caption', 'text text--caption'],
    ['overline', 'text text--overline'],
    ['label', 'text text--label'],
  ] as const)('renders the %s variant', (variant, className) => {
    render(<Text variant={variant}>Birthday</Text>);
    expect(screen.getByText('Birthday').className).toBe(className);
  });

  it.each([
    ['default', 'text'],
    ['muted', 'text text--muted'],
    ['subtle', 'text text--subtle'],
  ] as const)('renders the %s tone', (tone, className) => {
    render(<Text tone={tone}>Dinner at 7.</Text>);
    expect(screen.getByText('Dinner at 7.').className).toBe(className);
  });

  it('is a paragraph by default and can be a span or div', () => {
    render(
      <>
        <Text>One</Text>
        <Text as="span">Two</Text>
        <Text as="div">Three</Text>
      </>,
    );
    expect(screen.getByText('One').tagName).toBe('P');
    expect(screen.getByText('Two').tagName).toBe('SPAN');
    expect(screen.getByText('Three').tagName).toBe('DIV');
  });

  it('truncate: one line with the full value in the title', () => {
    render(<Text truncate>The Lantern Room, 88 Harbour Street</Text>);
    const text = screen.getByText('The Lantern Room, 88 Harbour Street');
    expect(text.className).toBe('text text--truncate');
    expect(text.getAttribute('title')).toBe('The Lantern Room, 88 Harbour Street');
  });
});
