import { EVENT_TYPES } from '../../../src/domain/events.js';
import { TODAY } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

const VALID = { name: 'Maya & Sam', date: '2026-12-12', startTime: '16:00' };

test.describe('L2-006 Create an event', () => {
  test.beforeEach(async ({ api, admin }) => {
    api.signIn();
    await admin.newEvent.goto();
  });

  test('offers the event types from L1-002 with the first one chosen', async ({ admin }) => {
    await expect(admin.newEvent.type.getByRole('radio')).toHaveCount(EVENT_TYPES.length);
    for (const type of EVENT_TYPES) await expect(admin.newEvent.typeOption(type)).toBeVisible();
    await expect(admin.newEvent.type).toContainText('Milestones, dinners and parties');
    await expect(admin.newEvent.typeOption('Birthday')).toBeChecked();
    await expect(admin.newEvent.venue).toHaveValue('');
  });

  test('AC1 creates a Draft event without touching the type and opens its overview with a toast', async ({ admin, api }) => {
    await admin.newEvent.createEvent({ ...VALID, venue: 'The Barn' });
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    await expect(admin.event.toast).toHaveText('Event created');
    await expect(admin.event.subtitle).toHaveText('Sat 12 Dec 2026 · 4:00 pm · The Barn');
    await expect(admin.event.status).toHaveText('Draft');
    const [created] = api.allEvents();
    expect(created).toMatchObject({ type: 'Birthday', name: 'Maya & Sam', date: '2026-12-12', startTime: '16:00', venue: 'The Barn', status: 'Draft' });
    await expect(admin.page).toHaveURL(new RegExp(`#/events/${created!.id}$`));
  });

  test('AC1 sends the chosen event type', async ({ admin, api }) => {
    await admin.newEvent.createEvent({ ...VALID, type: 'Holiday' });
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    expect(api.allEvents()[0]!.type).toBe('Holiday');
  });

  test('AC2 an empty name shows an error on Event name, focuses it and saves nothing', async ({ admin, api }) => {
    await admin.newEvent.createEvent({ ...VALID, name: '' });
    await expect(admin.newEvent.errorFor('name')).toHaveText('Add an event name');
    await expect(admin.newEvent.name).toBeFocused();
    expect(api.allEvents()).toHaveLength(0);
  });

  test('AC2 a name over 120 characters is refused and the counter shows the length', async ({ admin, api }) => {
    await admin.newEvent.fill({ ...VALID, name: 'x'.repeat(121) });
    await expect(admin.newEvent.nameCounter).toHaveText('121/120');
    await admin.newEvent.create.click();
    await expect(admin.newEvent.errorFor('name')).toHaveText('Event name can be up to 120 characters');
    expect(api.allEvents()).toHaveLength(0);
  });

  test('AC3 a past date shows "Pick a date in the future" on Date', async ({ admin }) => {
    await admin.newEvent.createEvent({ ...VALID, date: '2026-01-01' });
    await expect(admin.newEvent.errorFor('date')).toHaveText('Pick a date in the future');
    await expect(admin.newEvent.date).toBeFocused();
  });

  test('requires a date and a start time, listing both problems', async ({ admin }) => {
    await admin.newEvent.createEvent({ name: 'Maya & Sam' });
    await expect(admin.newEvent.errorFor('date')).toHaveText('Pick a date');
    await expect(admin.newEvent.errorFor('startTime')).toHaveText('Pick a start time');
    await expect(admin.page.getByRole('alert').filter({ hasText: '2 things to fix' }).getByRole('link')).toHaveText(['Pick a date', 'Pick a start time']);
    await expect(admin.newEvent.date).toBeFocused();
  });

  test('accepts today as the event date', async ({ admin, api }) => {
    await admin.newEvent.createEvent({ ...VALID, date: TODAY });
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    expect(api.allEvents()).toHaveLength(1);
  });

  test('AC4 shows a busy Create event while the request is in flight and keeps Cancel available', async ({ admin, api }) => {
    const held = api.hold('POST', '/api/events');
    await admin.newEvent.createEvent(VALID);
    await expect(admin.newEvent.create).toHaveText('Creating event…');
    await expect(admin.newEvent.create).toBeDisabled();
    await expect(admin.newEvent.cancel).toBeVisible();
    held.release();
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    expect(api.calls('POST', '/api/events')).toHaveLength(1);
  });

  test('AC5 a server failure keeps every value and Try again creates the event', async ({ admin, api }) => {
    api.failNext('POST', '/api/events');
    await admin.newEvent.createEvent({ ...VALID, type: 'Other', venue: 'The Barn' });
    await expect(admin.newEvent.failure).toContainText('Something went wrong. Try again.');
    await expect(admin.newEvent.typeOption('Other')).toBeChecked();
    await expect(admin.newEvent.name).toHaveValue('Maya & Sam');
    await expect(admin.newEvent.date).toHaveValue('2026-12-12');
    await expect(admin.newEvent.startTime).toHaveValue('16:00');
    await expect(admin.newEvent.venue).toHaveValue('The Barn');
    await admin.newEvent.tryAgain.click();
    await expect(admin.event.heading).toHaveText('Maya & Sam');
  });

  test('Cancel returns to Events without creating anything', async ({ admin, api }) => {
    await admin.newEvent.fill(VALID);
    await admin.newEvent.cancel.click();
    await expect(admin.events.heading).toBeVisible();
    expect(api.allEvents()).toHaveLength(0);
  });
});
