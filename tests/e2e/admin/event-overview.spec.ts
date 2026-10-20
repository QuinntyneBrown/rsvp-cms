import { expect, test } from '../support/fixtures.js';

test.describe('L2-053 Event overview', () => {
  test.beforeEach(({ api }) => {
    api.signIn();
  });

  test('shows the date and time, venue and the window in which replies are accepted', async ({ admin, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam', date: '2026-12-12', startTime: '16:00', venue: 'The Barn', inviteOpen: '2026-10-19' });
    await admin.event.goto(event.id);
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    await expect(admin.event.subtitle).toHaveText('2026-12-12 · Draft');
    await expect(admin.event.detail('Date')).toHaveText('2026-12-12 at 16:00');
    await expect(admin.event.detail('Venue')).toHaveText('The Barn');
    await expect(admin.event.detail('Replies accepted')).toHaveText('2026-10-19 to 2026-12-12');
  });

  test('says "Not set" when there is no venue', async ({ admin, api }) => {
    const event = api.addEvent({ venue: '' });
    await admin.event.goto(event.id);
    await expect(admin.event.detail('Venue')).toHaveText('Not set');
  });

  test('the section tabs switch views and mark the current one', async ({ admin, api }) => {
    const event = api.addEvent();
    await admin.event.goto(event.id);
    await expect(admin.event.tab('overview')).toHaveAttribute('aria-current', 'page');
    const views = [
      ['guests', admin.event.guests.heading],
      ['page', admin.event.composer.heading],
      ['emails', admin.event.emails.heading],
      ['responses', admin.event.responses.heading],
    ] as const;
    for (const [tab, heading] of views) {
      await admin.event.openTab(tab);
      await expect(heading).toBeVisible();
      await expect(admin.event.tab(tab)).toHaveAttribute('aria-current', 'page');
      await expect(admin.event.tab('overview')).not.toHaveAttribute('aria-current', 'page');
      await expect(admin.page).toHaveURL(new RegExp(`#/events/${event.id}/${tab}$`));
    }
    await admin.event.openTab('overview');
    await expect(admin.event.detail('Venue')).toBeVisible();
  });

  test('an event that does not exist shows "Event not found"', async ({ admin }) => {
    await admin.event.goto(999);
    await expect(admin.event.error).toContainText('Event not found');
  });

  test('a failed load can be retried', async ({ admin, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam' });
    api.failNext('GET', `/api/events/${event.id}`);
    await admin.event.goto(event.id);
    await expect(admin.event.error).toContainText('Something went wrong. Try again.');
    await admin.event.retry.click();
    await expect(admin.event.heading).toHaveText('Maya & Sam');
  });
});
