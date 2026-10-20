import type { Locator, Page } from '@playwright/test';
import { ADMIN_URL } from '../urls.js';

/** The organiser's events list (L2-012). */
export class EventsPage {
  readonly heading: Locator;
  readonly newEvent: Locator;
  readonly list: Locator;
  readonly items: Locator;
  readonly empty: Locator;
  readonly error: Locator;
  readonly retry: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Events', exact: true });
    this.newEvent = page.getByRole('link', { name: 'New event' });
    this.list = page.getByRole('list', { name: 'Events' });
    this.items = this.list.getByRole('listitem');
    this.empty = page.getByRole('heading', { name: 'No events yet' });
    this.error = page.getByRole('alert');
    this.retry = page.getByRole('button', { name: 'Try again' });
  }

  async goto() {
    await this.page.goto(`${ADMIN_URL}/#/events`);
  }

  open(name: string) {
    return this.list.getByRole('link', { name, exact: true }).click();
  }
}
