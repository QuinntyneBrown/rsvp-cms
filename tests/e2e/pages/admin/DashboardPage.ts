import type { Locator, Page } from '@playwright/test';
import { ADMIN_URL } from '../urls.js';

/** The organiser dashboard (L2-001 AC1, L2-051, L2-052). */
export class DashboardPage {
  readonly heading: Locator;
  readonly summary: Locator;
  readonly upcoming: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly newEvent: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), / });
    this.summary = page.getByRole('region', { name: 'Summary' });
    this.upcoming = page.getByRole('list', { name: 'Upcoming events' });
    this.rows = this.upcoming.getByRole('listitem');
    this.empty = page.getByRole('heading', { name: 'Create your first event' });
    this.newEvent = page.getByRole('link', { name: 'New event' }).first();
  }

  async goto() {
    await this.page.goto(`${ADMIN_URL}/#/dashboard`);
  }

  /** The number on a summary tile, by its label. */
  tile(label: string) {
    return this.summary.locator('.stat').filter({ has: this.page.locator('.stat__label').getByText(label, { exact: true }) }).locator('.stat__value');
  }
}
