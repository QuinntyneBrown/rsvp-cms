import type { Locator, Page } from '@playwright/test';
import { failure } from '../definitions.js';

/** Event settings: the Emails section (L2-036). */
export class SettingsTab {
  readonly heading: Locator;
  readonly emails: Locator;
  readonly senderName: Locator;
  readonly replyTo: Locator;
  readonly save: Locator;
  readonly failure: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Settings', level: 2 });
    this.emails = page.getByRole('form', { name: 'Emails' });
    this.senderName = this.emails.getByRole('textbox', { name: /^Sender name/ });
    this.replyTo = this.emails.getByRole('textbox', { name: /^Reply-to address/ });
    this.save = this.emails.getByRole('button', { name: /^(Save changes|Saving…)$/ });
    this.failure = failure(this.emails);
  }

  errorFor(field: 'senderName' | 'replyTo') {
    return this.page.locator(`#set-${field}-error`);
  }
}
