import type { Locator, Page } from '@playwright/test';

/** One block card in the page outline. */
export class BlockCard {
  readonly title: Locator;
  readonly moveUp: Locator;
  readonly moveDown: Locator;
  readonly toggle: Locator;
  readonly remove: Locator;

  constructor(readonly root: Locator) {
    this.title = root.locator('strong').first();
    this.moveUp = root.getByRole('button', { name: /^Move up / });
    this.moveDown = root.getByRole('button', { name: /^Move down / });
    this.toggle = root.getByRole('button', { name: /^(Collapse|Expand)$/ });
    this.remove = root.getByRole('button', { name: 'Remove block' });
  }

  field(label: string) {
    return this.root.getByLabel(label, { exact: true });
  }

  private wrapper(label: string) {
    return this.root.locator('.field', { has: this.root.page().getByLabel(label, { exact: true }) });
  }

  /** The error under a field, from the server on publish or from the client's length check. */
  errorFor(label: string) {
    return this.wrapper(label).locator('.field__error');
  }

  counterFor(label: string) {
    return this.wrapper(label).locator('.field__counter');
  }
}

/** The page composer: blocks, autosave, publish, discard and preview (L2-013 to L2-017). */
export class PageComposerTab {
  readonly heading: Locator;
  readonly status: Locator;
  readonly publish: Locator;
  readonly preview: Locator;
  readonly discardChanges: Locator;
  readonly addBlock: Locator;
  readonly outline: Locator;
  readonly blocks: Locator;
  readonly empty: Locator;
  readonly pageError: Locator;
  readonly publishError: Locator;
  readonly undo: Locator;
  readonly picker: Locator;
  readonly pickerNote: Locator;
  readonly discardDialog: Locator;
  readonly previewHeading: Locator;
  readonly backToEditing: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Event page' });
    // The composer's own status sits beside the heading; the toast region is a separate status.
    this.status = page.locator('.cluster--between > [role="status"]');
    this.publish = page.getByRole('button', { name: 'Publish', exact: true });
    this.preview = page.getByRole('button', { name: 'Preview', exact: true });
    this.discardChanges = page.getByRole('button', { name: 'Discard changes' });
    this.addBlock = page.getByRole('button', { name: 'Add a block' });
    this.outline = page.getByRole('list', { name: 'Page outline' });
    this.blocks = this.outline.locator(':scope > li');
    this.empty = page.getByText('No blocks yet. Add a block to start your page.');
    this.pageError = page.locator('p.field__error[role="alert"]').filter({ hasText: 'A page can have up to 12 blocks' });
    this.publishError = page.locator('.card[role="alert"]');
    this.undo = page.getByRole('button', { name: 'Undo' });
    this.picker = page.getByRole('dialog', { name: 'Add a block' });
    this.pickerNote = this.picker.getByRole('alert');
    this.discardDialog = page.getByRole('dialog', { name: 'Discard unpublished changes?' });
    this.previewHeading = page.getByRole('heading', { name: 'Preview', exact: true });
    this.backToEditing = page.getByRole('button', { name: 'Back to editing' });
  }

  block(index: number) {
    return new BlockCard(this.blocks.nth(index));
  }

  async blockTitles() {
    return this.blocks.locator('strong').allTextContents();
  }

  /** Adds a block by its picker label, e.g. 'Hero' or 'RSVP form'. */
  async add(label: string) {
    await this.addBlock.click();
    await this.picker.getByRole('button', { name: `Add ${label}`, exact: true }).click();
  }

  pickerOption(label: string) {
    return this.picker.getByRole('button', { name: `Add ${label}`, exact: true });
  }

  closePicker() {
    return this.picker.getByRole('button', { name: 'Close' }).click();
  }

  keepEditing() {
    return this.discardDialog.getByRole('button', { name: 'Keep editing' }).click();
  }

  confirmDiscard() {
    return this.discardDialog.getByRole('button', { name: 'Discard', exact: true }).click();
  }

  /** A rendered block in Preview, by its region name ('Hero', 'Details', 'RSVP'...). */
  previewSection(name: string) {
    return this.page.getByRole('region', { name, exact: true });
  }
}
