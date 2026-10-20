import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/auth-layout.html (title, description, logo, content).
describe('AuthLayout', () => {
  it('is the main landmark (skip-link target) with an h1 in a card', () => {
    render(<AuthLayout title="Sign in to Invitely"><form aria-label="Sign in" /></AuthLayout>);
    const main = screen.getByRole('main');
    expect(main.id).toBe('main');
    expect(main.className).toBe('auth-layout');
    expect(main.firstElementChild?.className).toBe('auth-card');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to Invitely' })).toBeDefined();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeDefined();
    expect(main.querySelector('.auth-card__logo')).toBeNull();
  });

  it('renders the logo and description, and a custom main id', () => {
    render(
      <AuthLayout title="Find your invitation" description="Enter the code from your email." logo={<svg data-testid="logo" />} mainId="content">
        <p>Form</p>
      </AuthLayout>,
    );
    expect(screen.getByRole('main').id).toBe('content');
    expect(screen.getByTestId('logo').parentElement?.className).toBe('auth-card__logo');
    expect(screen.getByText('Enter the code from your email.').className).toBe('auth-card__description');
  });
});
