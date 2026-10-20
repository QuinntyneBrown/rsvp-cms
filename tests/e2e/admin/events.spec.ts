import { expect, test } from '../support/fixtures.js';

test.describe('L2-012 Events list', () => {
  test.beforeEach(({ api }) => {
    api.signIn();
  });

  test('shows an empty state when there are no events', async ({ admin }) => {
    await admin.events.goto();
    await expect(admin.events.empty).toBeVisible();
    await expect(admin.page.getByText('Create your first event to start inviting guests.')).toBeVisible();
    await expect(admin.events.list).toHaveCount(0);
  });

  test('lists events soonest first with their date and status', async ({ admin, api }) => {
    api.addEvent({ name: 'Winter party', date: '2027-01-20' });
    api.addEvent({ name: 'Maya & Sam', date: '2026-12-12', status: 'Published' });
    await admin.events.goto();
    await expect(admin.events.items).toHaveText(['Maya & Sam · 2026-12-12 · Published', 'Winter party · 2027-01-20 · Draft']);
  });

  test('opens an event from the list', async ({ admin, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam' });
    await admin.events.goto();
    await admin.events.open('Maya & Sam');
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    await expect(admin.page).toHaveURL(new RegExp(`#/events/${event.id}$`));
  });

  test('New event opens the New event form', async ({ admin }) => {
    await admin.events.goto();
    await admin.events.newEvent.click();
    await expect(admin.newEvent.heading).toBeVisible();
  });

  test('the brand link returns to Events', async ({ admin, api }) => {
    const event = api.addEvent();
    await admin.event.goto(event.id);
    await admin.shell.brand.click();
    await expect(admin.events.heading).toBeVisible();
  });

  test('a failed load shows an error with Try again, which reloads the list', async ({ admin, api }) => {
    api.addEvent({ name: 'Maya & Sam' });
    api.failNext('GET', '/api/events');
    await admin.events.goto();
    await expect(admin.events.error).toContainText('Something went wrong. Try again.');
    await admin.events.retry.click();
    await expect(admin.events.items).toHaveCount(1);
    await expect(admin.events.error).toHaveCount(0);
  });

  test('shows a loading placeholder while the list is on its way', async ({ admin, api }) => {
    const held = api.hold('GET', '/api/events');
    await admin.events.goto();
    await expect(admin.shell.loading).toBeVisible();
    held.release();
    await expect(admin.events.empty).toBeVisible();
    await expect(admin.shell.loading).toHaveCount(0);
  });
});
