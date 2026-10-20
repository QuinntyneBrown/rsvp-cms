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
    this.empty = page.getByRole('heading', { name: 'No replies yet' });
    this.noMatch = page.getByRole('heading', { name: 'No replies match' });
    this.clearSearch = page.getByRole('button', { name: 'Clear search' });
    this.previous = page.getByRole('button', { name: 'Previous' });
    this.next = page.getByRole('button', { name: 'Next' });
    this.pageLabel = page.getByText(/^Page \d+ of \d+$/);
  }

  /** A total by its label: 'Attending', 'Guests coming', 'Declined', 'Waiting' or a meal name. */
  total(label: string) {
    return this.totals.locator('div').filter({ has: this.page.getByRole('term').filter({ hasText: new RegExp(`^${label}$`) }) }).getByRole('definition');
  }

  filter(label: 'All' | 'Attending' | 'Declined') {
    return this.page.getByRole('button', { name: label, exact: true });
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
