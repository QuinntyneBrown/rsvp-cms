import { expect, test } from '../support/fixtures.js';

test.describe('L2-053 Event overview', () => {
  test.beforeEach(({ api }) => {
    api.signIn();
  });

  test('shows the date and time, venue and the window in which replies are accepted', async ({ admin, api }) => {
    const event = api.addEvent({ name: 'Maya & Sam', date: '2026-12-12', startTime: '16:00', venue: 'The Barn', inviteOpen: '2026-10-19' });
    await admin.event.goto(event.id);
    await expect(admin.event.heading).toHaveText('Maya & Sam');
    await expect(admin.event.subtitle).toHaveText('Sat 12 Dec 2026 · 4:00 pm · The Barn');
    await expect(admin.event.status).toHaveText('Draft');
    await expect(admin.page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/Events.*Maya & Sam/);
    await expect(admin.event.detail('When')).toHaveText('Sat 12 Dec 2026 · 4:00 pm');
    await expect(admin.event.detail('Venue')).toHaveText('The Barn');
    await expect(admin.event.detail('Invites open')).toHaveText('Mon 19 Oct 2026, 9:00 am');
    await expect(admin.event.detail('Invites close')).toHaveText('Sat 12 Dec 2026, 11:59 pm');
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
    await expect(admin.event.error).toContainText("We couldn't load this event");
    await admin.event.retry.click();
    await expect(admin.event.heading).toHaveText('Maya & Sam');
  });
});
