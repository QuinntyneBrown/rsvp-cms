import type { Locator, Page } from '@playwright/test';

/** Responses table, totals, search and filters (L2-046 to L2-048). */
export class ResponsesTab {
  readonly heading: Locator;
  readonly totals: Locator;
  readonly search: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly noMatch: Locator;
  readonly clearSearch: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly pageLabel: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Responses', exact: true });
    this.totals = page.getByLabel('Totals');
    this.search = page.getByRole('searchbox', { name: 'Search responses' });
    this.table = page.getByRole('table');
    this.rows = this.table.locator('tbody tr');
    this.empty = page.getByRole('heading', { name: 'No responses yet' });
    this.noMatch = page.getByRole('heading', { name: /^No responses match/ });
    this.clearSearch = page.getByRole('button', { name: 'Clear search' });
    this.previous = page.getByRole('button', { name: 'Previous page' });
    this.next = page.getByRole('button', { name: 'Next page' });
    this.pageLabel = page.getByText(/^Showing \d+–\d+ of [\d,]+$/);
  }

  /** A total by its label: 'Attending', 'Guests coming', 'Declined', 'Waiting' or a meal name. */
  total(label: string) {
    return this.totals.locator('.stat').filter({ has: this.page.locator('.stat__label').getByText(label, { exact: true }) }).locator('.stat__value');
  }

  filter(label: 'All' | 'Attending' | 'Declined' | 'Waiting') {
    return this.page.getByRole('group', { name: 'Filter by reply' }).getByRole('button', { name: label, exact: true });
  }

  /** The text of each column: guest, reply, guests, meal, dietary note, message, updated. */
  async cells(index: number) {
    const [guest, reply, guests, meal, dietary, message, updated] = await this.rows.nth(index).getByRole('cell').allTextContents();
    return { guest, reply, guests, meal, dietary, message, updated };
  }

  async guestNames() {
    return this.rows.locator('td:first-child').allTextContents();
  }
}
