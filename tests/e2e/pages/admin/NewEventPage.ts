import type { Locator, Page } from '@playwright/test';
import { ADMIN_URL } from '../urls.js';

export interface EventForm {
  type?: string;
  name?: string;
  date?: string;
  startTime?: string;
  venue?: string;
}

/** New event form (L2-006). */
export class NewEventPage {
  readonly heading: Locator;
  readonly type: Locator;
  readonly name: Locator;
  readonly nameCounter: Locator;
  readonly date: Locator;
  readonly startTime: Locator;
  readonly venue: Locator;
  readonly create: Locator;
  readonly cancel: Locator;
  /** A failure with no field errors, with its own Try again button. */
  readonly failure: Locator;
  readonly tryAgain: Locator;

  constructor(readonly page: Page) {
    const form = page.getByRole('form', { name: 'New event' });
    this.heading = page.getByRole('heading', { name: 'New event' });
    this.type = form.getByLabel('Event type');
    this.name = form.getByLabel('Event name');
    this.nameCounter = form.locator('.field', { has: page.locator('#ev-name') }).locator('.field__counter');
    this.date = form.getByLabel('Date', { exact: true });
    this.startTime = form.getByLabel('Start time');
    this.venue = form.getByLabel('Venue');
    this.create = form.getByRole('button', { name: /Create event|Creating…/ });
    this.cancel = form.getByRole('link', { name: 'Cancel' });
    this.failure = form.locator(':scope > p[role="alert"]');
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
  }

  async goto() {
    await this.page.goto(`${ADMIN_URL}/#/events/new`);
  }

  /** The error shown under a field: 'type', 'name', 'date', 'startTime' or 'venue'. */
  errorFor(field: keyof EventForm) {
    return this.page.locator(`#ev-${field}-error`);
  }

  async fill(form: EventForm) {
    if (form.type !== undefined) await this.type.selectOption(form.type);
    if (form.name !== undefined) await this.name.fill(form.name);
    if (form.date !== undefined) await this.date.fill(form.date);
    if (form.startTime !== undefined) await this.startTime.fill(form.startTime);
    if (form.venue !== undefined) await this.venue.fill(form.venue);
  }

  async createEvent(form: EventForm) {
    await this.fill(form);
    await this.create.click();
  }
}
