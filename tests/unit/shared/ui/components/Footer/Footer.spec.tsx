import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/footer.html.
describe('Footer', () => {
  it('is the contentinfo landmark with its content', () => {
    render(<Footer><span>Sent with Invitely</span><a href="/privacy">Privacy</a></Footer>);
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toBe('footer');
    expect(footer.textContent).toBe('Sent with InvitelyPrivacy');
  });
});
