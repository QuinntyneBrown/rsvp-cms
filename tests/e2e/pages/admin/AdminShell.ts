import type { Locator, Page } from '@playwright/test';

/** The organiser shell shown on every signed-in page: the primary sidebar and the top bar. */
export class AdminShell {
  readonly brand: Locator;
  readonly nav: Locator;
  readonly menu: Locator;
  readonly signOut: Locator;
  readonly skipLink: Locator;
  readonly loading: Locator;

  constructor(readonly page: Page) {
    const topbar = page.locator('header.topbar');
    this.nav = page.getByRole('navigation', { name: 'Primary' });
    this.brand = this.nav.getByRole('link', { name: 'Invitely' });
    this.menu = topbar.getByRole('button', { name: 'Open navigation' });
    this.signOut = topbar.getByRole('button', { name: 'Sign out' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
    this.loading = page.getByText('Loading', { exact: true });
  }

  userName(name: string) {
    return this.page.locator('header.topbar').getByText(name, { exact: true });
  }
}
