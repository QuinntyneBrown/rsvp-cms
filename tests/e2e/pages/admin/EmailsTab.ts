import type { Locator, Page } from '@playwright/test';
import { definition, failure } from '../definitions.js';

export interface ScheduleForm {
  audience?: 'all' | 'non-responders';
  subject?: string;
  sendOn?: string;
}

/** Schedule invitations dialog (L2-029). */
export class ScheduleDialog {
  readonly root: Locator;
  readonly audience: Locator;
  readonly subject: Locator;
  readonly subjectCounter: Locator;
  readonly sendOn: Locator;
  readonly sendOnHint: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;
  /** The success state that replaces the form, and its Done button. */
  readonly done: Locator;
  readonly doneButton: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Schedule invitations' });
    this.audience = this.root.getByRole('group', { name: 'Recipients' });
    this.done = page.getByRole('dialog', { name: 'Invitations scheduled' });
    this.doneButton = this.done.getByRole('button', { name: 'Done' });
    this.subject = this.root.getByLabel('Subject');
    this.subjectCounter = this.root.locator('.field', { has: page.locator('#em-subject') }).locator('.field__counter');
    this.sendOn = this.root.getByLabel('Send on');
    this.sendOnHint = this.root.getByText('Emails go out at 9:00 am.');
    this.submit = this.root.getByRole('button', { name: /^(Schedule invitation|Scheduling…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.failure = failure(this.root);
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
  }

  errorFor(field: 'subject' | 'sendOn') {
    return this.root.locator(`#em-${field}-error`);
  }

  /** The Recipients radio; its name carries the count, as in 'All 12 invitees'. */
  audienceOption(audience: 'all' | 'non-responders') {
    return this.audience.getByRole('radio', { name: audience === 'all' ? /^All (\d+ )?invitees/ : /^Only people who haven't replied/ });
  }

  async fill(form: ScheduleForm) {
    if (form.audience !== undefined) await this.audienceOption(form.audience).check();
    if (form.subject !== undefined) await this.subject.fill(form.subject);
    if (form.sendOn !== undefined) await this.sendOn.fill(form.sendOn);
  }

  async schedule(form: ScheduleForm = {}) {
    await this.fill(form);
    await this.submit.click();
  }
}

/** Email preview dialog (L2-031). */
export class EmailPreviewDialog {
  readonly root: Locator;
  readonly close: Locator;
  readonly body: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('dialog', { name: /^Preview: / });
    this.close = this.root.locator('.dialog__footer').getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.well');
  }

  /** The value for 'From', 'Reply-to' or 'Subject'. */
  value(term: string) {
    return definition(this.root.locator('dl'), term);
  }
}

/** Scheduled and sent emails (L2-030). */
export class EmailsTab {
  readonly heading: Locator;
  /** 'From … · replies go to …' under the heading (L2-036). */
  readonly sender: Locator;
  readonly scheduleInvitations: Locator;
  readonly empty: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly dialog: ScheduleDialog;
  readonly preview: EmailPreviewDialog;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Scheduled and sent emails' });
    this.sender = page.getByText(/^From .* · replies go to /);
    this.scheduleInvitations = page.getByRole('button', { name: 'Schedule invitations' }).first();
    this.empty = page.getByRole('heading', { name: 'No emails scheduled' });
    this.table = page.getByRole('table');
    this.rows = this.table.locator('tbody tr');
    this.dialog = new ScheduleDialog(page);
    this.preview = new EmailPreviewDialog(page);
  }

  /** The text of each column of an email row: kind and subject, audience, send time, recipients, status. */
  async cells(index: number) {
    const row = this.rows.nth(index);
    const [kind, subject] = await row.locator('td:first-child > *').allTextContents();
    const [, audience, sendTime, recipients, status] = await row.getByRole('cell').allTextContents();
    return { kind, subject, audience, sendTime, recipients, status };
  }

  openPreview(index: number) {
    return this.rows.nth(index).getByRole('button', { name: 'Preview' }).click();
  }
}
