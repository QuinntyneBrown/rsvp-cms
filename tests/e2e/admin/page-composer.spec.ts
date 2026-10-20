import type { Block } from '../../../src/domain/blocks.js';
import { BLOCK_SPECS } from '../../../src/shared/ui/blocks.js';
import type { FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

const hero = (headline: string, id = 'b1'): Block => ({ id, type: 'hero', fields: { headline } });
const details = (text: string, id = 'b2'): Block => ({ id, type: 'details', fields: { text } });
const rsvp = (id = 'b3'): Block => ({ id, type: 'rsvp', fields: {} });

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent();
});

test.describe('L2-013 Add and reorder page blocks', () => {
  test('a new page has no blocks and nothing to publish', async ({ admin }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await expect(composer.empty).toBeVisible();
    await expect(composer.status).toHaveText('Published');
    await expect(composer.discardChanges).toHaveCount(0);
  });

  test('AC1 the picker lists every block type with its description', async ({ admin }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.addBlock.click();
    for (const spec of Object.values(BLOCK_SPECS)) {
      await expect(composer.pickerOption(spec.label)).toBeVisible();
      await expect(composer.picker.getByText(spec.description)).toBeVisible();
    }
    await composer.closePicker();
    await expect(composer.picker).toHaveCount(0);
  });

  test('AC2 new blocks are appended to the end of the page', async ({ admin }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.add('Hero');
    await composer.add('Details');
    await composer.add('RSVP form');
    await expect.poll(() => composer.blockTitles()).toEqual(['Hero', 'Details', 'RSVP form']);
    await expect(composer.empty).toHaveCount(0);
    await expect(composer.block(2).root).toContainText('The RSVP fields are fixed and cannot be removed individually.');
  });

  test('AC3 Move up and Move down reorder blocks and keep focus on the moved block', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us'), details('At the barn'), rsvp()]);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await expect(composer.block(0).moveUp).toBeDisabled();
    await expect(composer.block(2).moveDown).toBeDisabled();
    await composer.block(0).moveDown.click();
    await expect.poll(() => composer.blockTitles()).toEqual(['Details', 'Hero', 'RSVP form']);
    await expect(composer.block(1).moveDown).toBeFocused();
    await composer.block(2).moveUp.click();
    await expect.poll(() => composer.blockTitles()).toEqual(['Details', 'RSVP form', 'Hero']);
    await expect(composer.block(1).moveUp).toBeFocused();
  });

  test('AC4 a page refuses a 13th block', async ({ admin, api }) => {
    api.setDraft(event.id, Array.from({ length: 12 }, (_, i) => details(`Block ${i}`, `b${i}`)));
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.add('FAQ');
    await expect(composer.pickerNote).toHaveText('A page can have up to 12 blocks');
    await expect(composer.blocks).toHaveCount(12);
  });

  test('removing a block offers Undo, which puts it back in place', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us'), details('At the barn'), rsvp()]);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.block(1).remove.click();
    await expect.poll(() => composer.blockTitles()).toEqual(['Hero', 'RSVP form']);
    await expect(admin.page.getByText('Block removed.')).toBeVisible();
    await composer.undo.click();
    await expect.poll(() => composer.blockTitles()).toEqual(['Hero', 'Details', 'RSVP form']);
    await expect(composer.block(1).field('Details')).toHaveValue('At the barn');
    await expect(composer.undo).toHaveCount(0);
  });

  test('Collapse hides a block\'s fields and Expand shows them again', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us')]);
    const block = admin.event.composer.block(0);
    await admin.event.goto(event.id, 'page');
    await expect(block.toggle).toHaveAttribute('aria-expanded', 'true');
    await block.toggle.click();
    await expect(block.toggle).toHaveText('Expand');
    await expect(block.toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(block.field('Headline')).toHaveCount(0);
    await block.toggle.click();
    await expect(block.field('Headline')).toHaveValue('Join us');
  });
});

test.describe('L2-014 Edit block content', () => {
  test('shows each field of a block with a character counter where there is a limit', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us')]);
    const block = admin.event.composer.block(0);
    await admin.event.goto(event.id, 'page');
    await expect(block.field('Headline')).toHaveValue('Join us');
    await expect(block.counterFor('Headline')).toHaveText('7/120');
    await expect(block.counterFor('Subheading')).toHaveText('0/200');
    await expect(block.counterFor('Button label')).toHaveText('0/40');
    await block.field('Button label').fill('RSVP');
    await expect(block.counterFor('Button label')).toHaveText('4/40');
  });

  test('AC2 flags a headline over 120 characters as it is typed', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('')]);
    const block = admin.event.composer.block(0);
    await admin.event.goto(event.id, 'page');
    await block.field('Headline').fill('x'.repeat(121));
    await expect(block.errorFor('Headline')).toHaveText('Headline can be up to 120 characters');
    await expect(block.counterFor('Headline')).toHaveText('121/120');
  });

  test('AC1 publishing a hero without a headline shows "Add a headline" and focuses it', async ({ admin, api }) => {
    api.setDraft(event.id, [details('At the barn', 'b2'), hero('', 'b1')]);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.publish.click();
    await expect(composer.block(1).errorFor('Headline')).toHaveText('Add a headline');
    await expect(composer.block(1).field('Headline')).toBeFocused();
    expect(api.event(event.id)!.status).toBe('Draft');
    expect(api.pageOf(event.id).published).toBeNull();
  });

  test('AC1 a collapsed block with an invalid field is expanded to show the error', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('', 'b1')]);
    const block = admin.event.composer.block(0);
    await admin.event.goto(event.id, 'page');
    await block.toggle.click();
    await expect(block.field('Headline')).toHaveCount(0);
    await admin.event.composer.publish.click();
    await expect(block.errorFor('Headline')).toHaveText('Add a headline');
    await expect(block.toggle).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('L2-015 Draft and publish', () => {
  test('AC1 edits autosave two seconds after the last change', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us')]);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.block(0).field('Headline').fill('Join us at the barn');
    await expect(composer.status).toHaveText('Saving…');
    await expect(composer.status).toHaveText('Draft · saved just now', { timeout: 5000 });
    expect(api.pageOf(event.id).draft[0]!.fields.headline).toBe('Join us at the barn');
    expect(api.calls('PUT', `/api/events/${event.id}/page/draft`)).toHaveLength(1);
  });

  test('a failed autosave says "Could not save"', async ({ admin, api }) => {
    api.failNext('PUT', `/api/events/${event.id}/page/draft`);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.add('Hero');
    await expect(composer.status).toHaveText('Could not save', { timeout: 5000 });
  });

  test('AC2 Publish makes the draft live and the event Published', async ({ admin, api }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.add('Hero');
    await composer.block(0).field('Headline').fill('Join us');
    await expect(composer.discardChanges).toBeVisible();
    await composer.publish.click();
    await expect(composer.status).toHaveText('Published · just now');
    await expect(composer.discardChanges).toHaveCount(0);
    expect(api.pageOf(event.id).published).toEqual([expect.objectContaining({ type: 'hero', fields: { headline: 'Join us' } })]);
    expect(api.event(event.id)!.status).toBe('Published');
  });

  test('AC3 a second press while publishing is not sent', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us')]);
    const held = api.hold('POST', `/api/events/${event.id}/page/publish`);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.publish.click();
    await expect(composer.publish).toBeDisabled();
    await expect(composer.publish).toHaveAttribute('aria-busy', 'true');
    await composer.publish.click({ force: true });
    held.release();
    await expect(composer.status).toHaveText('Published · just now');
    expect(api.calls('POST', `/api/events/${event.id}/page/publish`)).toHaveLength(1);
  });

  test('AC4 a failed publish shows an error with Try again and leaves the page unpublished', async ({ admin, api }) => {
    api.setDraft(event.id, [hero('Join us')]);
    api.failNext('POST', `/api/events/${event.id}/page/publish`);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.publish.click();
    await expect(composer.publishError).toContainText('Something went wrong. Try again.');
    expect(api.event(event.id)!.status).toBe('Draft');
    await composer.publishError.getByRole('button', { name: 'Try again' }).click();
    await expect(composer.status).toHaveText('Published · just now');
    expect(api.event(event.id)!.status).toBe('Published');
  });
});

test.describe('L2-016 Discard unpublished changes and leave guard', () => {
  test.beforeEach(({ api }) => {
    api.publish(event.id, [hero('Published headline')]);
    api.setDraft(event.id, [hero('Draft headline')]);
  });

  test('shows unpublished changes as a draft', async ({ admin }) => {
    await admin.event.goto(event.id, 'page');
    await expect(admin.event.composer.status).toHaveText('Draft · saved just now');
    await expect(admin.event.composer.discardChanges).toBeVisible();
  });

  test('Keep editing closes the dialog and keeps the draft', async ({ admin, api }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.discardChanges.click();
    await expect(composer.discardDialog).toContainText('Your page goes back to the last published version.');
    await composer.keepEditing();
    await expect(composer.discardDialog).toHaveCount(0);
    await expect(composer.block(0).field('Headline')).toHaveValue('Draft headline');
    expect(api.calls('POST', `/api/events/${event.id}/page/discard`)).toHaveLength(0);
  });

  test('AC1 Discard returns the page to the published version', async ({ admin, api }) => {
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.discardChanges.click();
    await composer.confirmDiscard();
    await expect(composer.block(0).field('Headline')).toHaveValue('Published headline');
    await expect(composer.status).toHaveText('Published');
    await expect(composer.discardChanges).toHaveCount(0);
    expect(api.pageOf(event.id).draft).toEqual([hero('Published headline')]);
  });

  test('a failed discard keeps the draft and shows the error', async ({ admin, api }) => {
    api.failNext('POST', `/api/events/${event.id}/page/discard`);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.discardChanges.click();
    await composer.confirmDiscard();
    await expect(composer.publishError).toContainText('Something went wrong. Try again.');
    await expect(composer.block(0).field('Headline')).toHaveValue('Draft headline');
  });

  test('AC3 leaving with unpublished changes asks for confirmation', async ({ admin }) => {
    await admin.event.goto(event.id, 'page');
    await admin.event.composer.block(0).field('Headline').fill('Edited'); // a user gesture lets the page ask
    const dialog = admin.page.waitForEvent('dialog');
    await admin.page.close({ runBeforeUnload: true });
    const prompt = await dialog;
    expect(prompt.type()).toBe('beforeunload');
    await prompt.dismiss();
  });
});

test.describe('L2-017 Preview the page as a guest', () => {
  test('renders the draft blocks as guests will see them and returns to editing', async ({ admin, api }) => {
    api.setDraft(event.id, [
      { id: 'b1', type: 'hero', fields: { headline: 'Join us', subhead: 'Maya & Sam are getting married', buttonLabel: 'Reply now' } },
      details('Saturday at the barn'),
      rsvp(),
    ]);
    const composer = admin.event.composer;
    await admin.event.goto(event.id, 'page');
    await composer.preview.click();
    await expect(composer.previewHeading).toBeVisible();
    await expect(composer.previewSection('Hero').getByRole('heading', { name: 'Join us' })).toBeVisible();
    await expect(composer.previewSection('Hero')).toContainText('Maya & Sam are getting married');
    await expect(composer.previewSection('Hero').getByRole('link', { name: 'Reply now' })).toHaveAttribute('href', '#rsvp');
    await expect(composer.previewSection('Details')).toContainText('Saturday at the barn');
    await expect(composer.previewSection('RSVP')).toHaveText('The RSVP form appears here for guests.');
    await composer.backToEditing.click();
    await expect(composer.heading).toBeVisible();
    await expect.poll(() => composer.blockTitles()).toEqual(['Hero', 'Details', 'RSVP form']);
  });
});

test('a failed page load can be retried', async ({ admin, api }) => {
  api.setDraft(event.id, [hero('Join us')]);
  api.failNext('GET', `/api/events/${event.id}/page`);
  await admin.event.goto(event.id, 'page');
  await expect(admin.event.error).toContainText('Something went wrong. Try again.');
  await admin.event.retry.click();
  await expect(admin.event.composer.block(0).field('Headline')).toHaveValue('Join us');
});
