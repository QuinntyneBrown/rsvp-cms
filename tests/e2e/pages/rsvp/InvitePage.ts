import type { Locator, Page } from '@playwright/test';
import { GUEST_URL } from '../urls.js';

/** The read-only summary of a saved reply. */
export class ReplySummary {
  constructor(readonly root: Locator) {}

  /** The value for 'Your reply', 'Party size', 'Meal' or 'Message'. */
  value(term: string) {
    return this.root.locator('div').filter({ has: this.root.page().getByRole('term').filter({ hasText: new RegExp(`^${term}$`) }) }).getByRole('definition');
  }
}

/** The RSVP form and its regrets dialog (L2-040 to L2-044). */
export class RsvpForm {
  readonly root: Locator;
  readonly heading: Locator;
  readonly accept: Locator;
  readonly decline: Locator;
  readonly attendingError: Locator;
  readonly partySize: Locator;
  readonly meal: Locator;
  readonly dietary: Locator;
  readonly song: Locator;
  readonly message: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;
  readonly regrets: Locator;
  readonly regretsMessage: Locator;
  readonly sendRegrets: Locator;
  readonly keepReply: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('form', { name: 'RSVP' });
    this.heading = this.root.getByRole('heading', { name: 'Will you join us?' });
    this.accept = this.root.getByLabel('Joyfully accepting');
    this.decline = this.root.getByLabel('Regretfully declining');
    this.attendingError = this.root.locator('fieldset [role="alert"]');
    this.partySize = this.root.getByLabel('Party size');
    this.meal = this.root.getByLabel('Meal');
    this.dietary = this.root.getByLabel('Dietary needs');
    this.song = this.root.getByLabel('Song request');
    this.message = this.root.locator('#rsvp-message');
    this.send = this.root.getByRole('button', { name: /^(Send my RSVP|Sending…)$/ }).first();
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.failure = this.root.locator(':scope > p[role="alert"]');
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
    this.regrets = page.getByRole('dialog', { name: 'Send your regrets?' });
    this.regretsMessage = this.regrets.getByLabel('Message');
    this.sendRegrets = this.regrets.getByRole('button', { name: /^(Send my regrets|Sending…)$/ });
    this.keepReply = this.regrets.getByRole('button', { name: 'Keep my reply' });
  }

  /** "Guest's name" for one extra guest, "Guest's name 1", "Guest's name 2"... for more. */
  guestName(index: number, numbered: boolean) {
    return this.root.getByLabel(numbered ? `Guest's name ${index + 1}` : "Guest's name", { exact: true });
  }

  guestNameError(index: number) {
    return this.root.locator(`#rsvp-guestNames-${index}-error`);
  }

  errorFor(field: 'partySize' | 'meal' | 'dietary' | 'song' | 'message') {
    return this.root.locator(`#rsvp-${field}-error`);
  }

  /** The "N characters left" counter of 'dietary', 'song' or 'message'. */
  counterFor(field: 'dietary' | 'song' | 'message') {
    return this.root.locator('.field', { has: this.page.locator(`#rsvp-${field}`) }).locator('.field__counter');
  }

  async attend({ partySize, meal, names = [] }: { partySize?: string; meal?: string; names?: string[] }) {
    await this.accept.check();
    if (partySize) await this.partySize.selectOption({ label: partySize });
    if (meal) await this.meal.selectOption(meal);
    for (const [i, name] of names.entries()) await this.guestName(i, names.length > 1).fill(name);
  }
}

/** A guest's personal invitation page at /i/<token> (L2-038, L2-039). */
export class InvitePage {
  readonly greeting: Locator;
  readonly invalid: Locator;
  readonly enterCode: Locator;
  readonly error: Locator;
  readonly retry: Locator;
  readonly notOpen: Locator;
  readonly closed: Locator;
  readonly noReply: Locator;
  readonly thanks: Locator;
  readonly changeReply: Locator;
  readonly summary: ReplySummary;
  readonly toast: Locator;
  readonly form: RsvpForm;

  constructor(readonly page: Page) {
    this.greeting = page.getByText(/^Hello, /);
    this.invalid = page.getByRole('heading', { name: "This invitation link doesn't work" });
    this.enterCode = page.getByRole('link', { name: 'Enter your invitation code' });
    this.error = page.locator('.card[role="alert"]');
    this.retry = page.getByRole('button', { name: 'Try again' });
    this.notOpen = page.getByText(/^Codes are accepted from /);
    this.closed = page.getByRole('heading', { name: /^Replies closed on / });
    this.noReply = page.getByText("We didn't receive a reply from you.");
    this.thanks = page.getByRole('heading', { name: 'Thank you for replying' });
    this.changeReply = page.getByRole('button', { name: 'Change reply' });
    this.summary = new ReplySummary(page.locator('dl[aria-label="Your reply"]'));
    this.toast = page.locator('.toast');
    this.form = new RsvpForm(page);
  }

  async goto(token: string) {
    await this.page.goto(`${GUEST_URL}/i/${encodeURIComponent(token)}`);
  }

  /** A published block by its region name ('Hero', 'Details', 'RSVP'...). */
  section(name: string) {
    return this.page.getByRole('region', { name, exact: true });
  }
}
