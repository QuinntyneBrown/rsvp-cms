import type { Locator, Page } from '@playwright/test';

/** The organiser top bar shown on every signed-in page. */
export class AdminShell {
  readonly brand: Locator;
  readonly signOut: Locator;
  readonly skipLink: Locator;
  readonly loading: Locator;

  constructor(readonly page: Page) {
    const topbar = page.locator('header.topbar');
    this.brand = topbar.getByRole('link', { name: 'Invitely' });
    this.signOut = topbar.getByRole('button', { name: 'Sign out' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
    this.loading = page.getByLabel('Loading');
  }

  userName(name: string) {
    return this.page.locator('header.topbar').getByText(name, { exact: true });
  }
}
