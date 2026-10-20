import type { Locator, Page } from '@playwright/test';
import { failure } from '../definitions.js';

export interface GuestForm {
  name?: string;
  email?: string;
  group?: string;
  plusOnes?: string | number;
}

/** Add guest / Edit guest dialog (L2-021, L2-022). */
export class GuestDialog {
  readonly root: Locator;
  readonly name: Locator;
  readonly email: Locator;
  readonly group: Locator;
  readonly plusOnes: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;

  constructor(readonly page: Page, title: 'Add guest' | 'Edit guest') {
    this.root = page.getByRole('dialog', { name: title });
    this.name = this.root.getByLabel('Full name');
    this.email = this.root.getByLabel('Email');
    this.group = this.root.getByLabel('Group');
    this.plusOnes = this.root.getByLabel('Plus-ones');
    this.submit = this.root.getByRole('button', { name: title === 'Add guest' ? /^(Add guest|Saving guest…)$/ : /^(Save|Saving guest…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.failure = failure(this.root);
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
  }

  errorFor(field: 'name' | 'email' | 'plusOnes') {
    return this.root.locator(`#g-${field === 'plusOnes' ? 'plus' : field}-error`);
  }

  async fill(form: GuestForm) {
    if (form.name !== undefined) await this.name.fill(form.name);
    if (form.email !== undefined) await this.email.fill(form.email);
    if (form.group !== undefined) await this.group.selectOption(form.group);
    if (form.plusOnes !== undefined) await this.plusOnes.fill(String(form.plusOnes));
  }

  async save(form: GuestForm) {
    await this.fill(form);
    await this.submit.click();
  }
}

/** Guest list with search, filters, paging, selection and removal (L2-019 to L2-024). */
export class GuestsTab {
  readonly heading: Locator;
  readonly addGuest: Locator;
  readonly search: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly selectAll: Locator;
  readonly selection: Locator;
  readonly removeSelected: Locator;
  readonly clearSelection: Locator;
  readonly empty: Locator;
  readonly noMatch: Locator;
  readonly clearSearch: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly pageLabel: Locator;
  readonly addDialog: GuestDialog;
  readonly editDialog: GuestDialog;
  readonly removeDialog: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 2, name: /^Guests/ });
    this.addGuest = page.getByRole('button', { name: 'Add guest' }).first();
    this.search = page.getByRole('searchbox', { name: 'Search guests' });
    this.table = page.getByRole('table');
    this.rows = this.table.locator('tbody tr');
    this.selectAll = page.getByRole('checkbox', { name: 'Select all on this page' });
    this.selection = page.getByRole('region', { name: 'Selection' });
    this.removeSelected = this.selection.getByRole('button', { name: 'Remove', exact: true });
    this.clearSelection = this.selection.getByRole('button', { name: 'Clear' });
    this.empty = page.getByRole('heading', { name: 'No invitees yet' });
    this.noMatch = page.getByRole('heading', { name: /^No guests match/ });
    this.clearSearch = page.getByRole('button', { name: 'Clear search' });
    this.previous = page.getByRole('button', { name: 'Previous page' });
    this.next = page.getByRole('button', { name: 'Next page' });
    this.pageLabel = page.getByText(/^Showing \d+–\d+ of [\d,]+$/);
    this.addDialog = new GuestDialog(page, 'Add guest');
    this.editDialog = new GuestDialog(page, 'Edit guest');
    this.removeDialog = page.getByRole('dialog', { name: /^Remove \d+ guests?\?$/ });
  }

  filter(label: 'All' | 'Attending' | 'Declined' | 'Waiting') {
    return this.page.getByRole('group', { name: 'Filter by reply' }).getByRole('button', { name: label, exact: true });
  }

  row(name: string) {
    return this.rows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** Each row's guest name, in order. */
  names() {
    return this.rows.locator('td:nth-child(2) > :first-child');
  }

  /** The text of each column of a guest's row: name and email, group, reply, party and updated. */
  async cells(name: string) {
    const row = this.row(name);
    const [guest, email] = await row.locator('td:nth-child(2) > *').allTextContents();
    const [, , group, reply, party, updated] = await row.getByRole('cell').allTextContents();
    return { name: guest, email, group, reply, party, updated };
  }

  remove(name: string) {
    return this.page.getByRole('button', { name: `Remove ${name}`, exact: true });
  }

  select(name: string) {
    return this.page.getByRole('checkbox', { name: `Select ${name}`, exact: true });
  }

  edit(name: string) {
    return this.page.getByRole('button', { name: `Edit ${name}`, exact: true });
  }

  async add(form: GuestForm) {
    await this.addGuest.click();
    await this.addDialog.save(form);
  }

  confirmRemove() {
    return this.removeDialog.getByRole('button', { name: 'Remove', exact: true }).click();
  }

  /** The failure in the remove dialog, with its Try again button. */
  removeFailure() {
    return failure(this.removeDialog);
  }

  cancelRemove() {
    return this.removeDialog.getByRole('button', { name: 'Cancel' }).click();
  }
}
