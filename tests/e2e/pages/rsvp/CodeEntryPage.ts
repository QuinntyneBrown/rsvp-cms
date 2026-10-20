import type { Locator, Page } from '@playwright/test';
import { GUEST_URL } from '../urls.js';

/** Find my invitation by code (L2-037). */
export class CodeEntryPage {
  readonly heading: Locator;
  readonly code: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    const form = page.getByRole('form', { name: 'Find my invitation' });
    this.heading = page.getByRole('heading', { name: 'Find my invitation' });
    this.code = form.getByLabel('Invitation code');
    this.submit = form.getByRole('button', { name: /^(Continue to RSVP|Checking…)$/ });
    this.error = page.locator('#code-error');
  }

  async goto() {
    await this.page.goto(GUEST_URL);
  }

  async find(code: string) {
    await this.code.fill(code);
    await this.submit.click();
  }
}
