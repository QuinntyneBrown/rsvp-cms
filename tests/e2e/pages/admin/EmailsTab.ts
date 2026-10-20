import type { Locator, Page } from '@playwright/test';

export interface ScheduleForm {
  audience?: 'all' | 'non-responders';
  subject?: string;
  sendOn?: string;
  senderName?: string;
  replyTo?: string;
}

/** Schedule invitations dialog (L2-029, L2-036). */
export class ScheduleDialog {
  readonly root: Locator;
  readonly audience: Locator;
  readonly subject: Locator;
  readonly subjectCounter: Locator;
  readonly sendOn: Locator;
  readonly sendOnHint: Locator;
  readonly senderName: Locator;
  readonly replyTo: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Schedule invitations' });
    this.audience = this.root.getByLabel('Recipients');
    this.subject = this.root.getByLabel('Subject');
    this.subjectCounter = this.root.locator('.field', { has: page.locator('#em-subject') }).locator('.field__counter');
    this.sendOn = this.root.getByLabel('Send on');
    this.sendOnHint = this.root.getByText('Emails go out at 9:00 am.');
    this.senderName = this.root.getByLabel('Sender name');
    this.replyTo = this.root.getByLabel('Reply-to email');
    this.submit = this.root.getByRole('button', { name: /^(Schedule invitation|Scheduling…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.failure = this.root.locator('form > p[role="alert"]');
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
  }

  errorFor(field: 'subject' | 'sendOn' | 'replyTo') {
    return this.root.locator(`#em-${field}-error`);
  }

  async fill(form: ScheduleForm) {
    if (form.audience !== undefined) await this.audience.selectOption(form.audience);
    if (form.subject !== undefined) await this.subject.fill(form.subject);
    if (form.sendOn !== undefined) await this.sendOn.fill(form.sendOn);
    if (form.senderName !== undefined) await this.senderName.fill(form.senderName);
    if (form.replyTo !== undefined) await this.replyTo.fill(form.replyTo);
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
    this.root = page.getByRole('dialog', { name: 'Email preview' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('dl > div').last();
  }

  /** The value for 'From', 'Reply-to' or 'Subject'. */
  value(term: string) {
    return this.root.locator('dl > div').filter({ has: this.page.getByRole('term').filter({ hasText: new RegExp(`^${term}$`) }) }).getByRole('definition');
  }
}

/** Scheduled and sent emails (L2-030). */
export class EmailsTab {
  readonly heading: Locator;
  readonly scheduleInvitations: Locator;
  readonly empty: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly dialog: ScheduleDialog;
  readonly preview: EmailPreviewDialog;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Emails', exact: true });
    this.scheduleInvitations = page.getByRole('button', { name: 'Schedule invitations' }).first();
    this.empty = page.getByRole('heading', { name: 'No emails planned' });
    this.table = page.getByRole('table');
    this.rows = this.table.locator('tbody tr');
    this.dialog = new ScheduleDialog(page);
    this.preview = new EmailPreviewDialog(page);
  }

  /** The text of each column of an email row: subject, audience, send time, recipients, status. */
  async cells(index: number) {
    const [subject, audience, sendTime, recipients, status] = await this.rows.nth(index).getByRole('cell').allTextContents();
    return { subject, audience, sendTime, recipients, status };
  }

  openPreview(index: number) {
    return this.rows.nth(index).getByRole('button', { name: 'Preview' }).click();
  }
}
