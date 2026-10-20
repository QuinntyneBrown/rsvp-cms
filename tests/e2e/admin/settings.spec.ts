import type { FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent({ name: 'Maya & Sam' });
});

test.describe('L2-036 Sender identity in Event settings', () => {
  test('AC1 saves the sender name and reply-to, and the emails come from them', async ({ admin, api }) => {
    const settings = admin.event.settings;
    await admin.event.goto(event.id, 'settings');
    await expect(admin.event.tab('settings')).toHaveAttribute('aria-current', 'page');
    await expect(settings.senderName).toHaveValue('');
    await settings.senderName.fill('Maya and Sam');
    await settings.replyTo.fill('hosts@example.com');
    await settings.save.click();
    await expect(admin.event.toast).toHaveText('Changes saved');
    expect(api.event(event.id)).toMatchObject({ senderName: 'Maya and Sam', replyTo: 'hosts@example.com' });
    await admin.event.openTab('emails');
    await expect(admin.event.emails.sender).toContainText('From Maya and Sam · replies go to hosts@example.com.');
  });

  test('AC2 an invalid reply-to shows "Enter a valid email address" and changes nothing', async ({ admin, api }) => {
    Object.assign(api.event(event.id)!, { replyTo: 'hosts@example.com' });
    const settings = admin.event.settings;
    await admin.event.goto(event.id, 'settings');
    await settings.replyTo.fill('nope');
    await settings.save.click();
    await expect(settings.errorFor('replyTo')).toHaveText('Enter a valid email address');
    await expect(settings.replyTo).toBeFocused();
    expect(api.event(event.id)!.replyTo).toBe('hosts@example.com');
  });

  test('a failed save keeps the values and Try again saves them', async ({ admin, api }) => {
    api.failNext('PUT', `/api/events/${event.id}/sender`);
    const settings = admin.event.settings;
    await admin.event.goto(event.id, 'settings');
    await settings.senderName.fill('Maya and Sam');
    await settings.save.click();
    await expect(settings.failure).toContainText("Couldn't save your changes");
    await expect(settings.senderName).toHaveValue('Maya and Sam');
    await settings.failure.getByRole('button', { name: 'Try again' }).click();
    await expect(admin.event.toast).toHaveText('Changes saved');
    expect(api.event(event.id)!.senderName).toBe('Maya and Sam');
  });
});
