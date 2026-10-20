import { ORGANISER } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

test.describe('L2-001 AC1 / L2-051 Dashboard summary', () => {
  test('signing in lands on the dashboard', async ({ admin }) => {
    await admin.signIn.goto();
    await admin.signIn.signIn(ORGANISER.email, ORGANISER.password);
    await expect(admin.dashboard.heading).toHaveText(/, Olivia$/);
    await expect(admin.page).toHaveURL(/#\/dashboard$/);
    await expect(admin.shell.nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  test('AC1 the tiles total invitees, attending, waiting and scheduled emails', async ({ admin, api }) => {
    api.signIn();
    const a = api.addEvent({ name: 'Maya & Sam' });
    const b = api.addEvent({ name: 'Winter party', date: '2027-01-20' });
    const maya = api.addGuest(a.id, { name: 'Maya Chen' });
    api.addGuest(a.id, { name: 'Sam Okafor' });
    api.addGuest(b.id, { name: 'Kai Lee' });
    api.addReply(maya.id, { attending: true });
    api.addEmail(a.id, { status: 'Scheduled' });
    api.addEmail(b.id, { status: 'Sent' });
    await admin.dashboard.goto();
    await expect(admin.dashboard.tile('Invitees across events')).toHaveText('3');
    await expect(admin.dashboard.tile('Attending so far')).toHaveText('1');
    await expect(admin.dashboard.tile('Waiting for a reply')).toHaveText('2');
    await expect(admin.dashboard.tile('Emails scheduled')).toHaveText('1');
  });

  test('AC2 shows placeholders while the summary loads', async ({ admin, api }) => {
    api.signIn();
    const held = api.hold('GET', '/api/dashboard/summary');
    await admin.dashboard.goto();
    await expect(admin.page.getByText('Loading the summary')).toBeAttached();
    held.release();
    await expect(admin.dashboard.tile('Invitees across events')).toHaveText('0');
  });

  test('AC3 a failed summary shows no numbers and Try again loads them', async ({ admin, api }) => {
    api.signIn();
    api.failNext('GET', '/api/dashboard/summary');
    await admin.dashboard.goto();
    await expect(admin.dashboard.summary.getByRole('alert')).toContainText("We couldn't load the summary");
    await expect(admin.dashboard.summary.locator('.stat')).toHaveCount(0);
    await admin.dashboard.summary.getByRole('button', { name: 'Try again' }).click();
    await expect(admin.dashboard.tile('Emails scheduled')).toHaveText('0');
  });

  test('AC4 with no events the empty state offers New event', async ({ admin, api }) => {
    api.signIn();
    await admin.dashboard.goto();
    await expect(admin.dashboard.empty).toBeVisible();
    await admin.dashboard.empty.locator('..').getByRole('link', { name: 'New event' }).click();
    await expect(admin.newEvent.heading).toBeVisible();
  });
});

test.describe('L2-052 Upcoming events list', () => {
  test('AC1 lists events soonest first with date, invitees, attending and status; AC3 a row opens the event', async ({ admin, api }) => {
    api.signIn();
    const later = api.addEvent({ name: 'Winter party', date: '2027-01-20' });
    const sooner = api.addEvent({ name: 'Maya & Sam', date: '2026-12-12', status: 'Published' });
    const maya = api.addGuest(sooner.id, { name: 'Maya Chen' });
    api.addReply(maya.id, { attending: true });
    api.addGuest(later.id, { name: 'Kai Lee' });
    await admin.dashboard.goto();
    await expect(admin.dashboard.rows.locator('.list__title')).toHaveText(['Maya & Sam', 'Winter party']);
    await expect(admin.dashboard.rows.locator('.list__meta')).toHaveText(['Sat 12 Dec 2026 · 1 invitees · 1 attending', 'Wed 20 Jan 2027 · 1 invitees · 0 attending']);
    await expect(admin.dashboard.rows.nth(0)).toContainText('Published');
    await admin.dashboard.rows.nth(0).getByRole('link').focus();
    await admin.page.keyboard.press('Enter');
    await expect(admin.event.heading).toHaveText('Maya & Sam');
  });
});
