import { invitationText, personalLink, SAMPLE_GUEST } from '../../../src/domain/invitations/message.js';
import { ORGANISER, RSVP_URL, TODAY, type FakeEvent } from '../support/fake-backend.js';
import { expect, test } from '../support/fixtures.js';

let event: FakeEvent;

test.beforeEach(({ api }) => {
  api.signIn();
  event = api.addEvent({ name: 'Maya & Sam', date: '2026-12-12' });
});

test.describe('L2-030 Scheduled and sent email list', () => {
  test('shows an empty state with Schedule invitations', async ({ admin }) => {
    await admin.event.goto(event.id, 'emails');
    await expect(admin.event.emails.empty).toBeVisible();
    await admin.event.emails.empty.locator('..').getByRole('button', { name: 'Schedule invitations' }).click();
    await expect(admin.event.emails.dialog.root).toBeVisible();
  });

  test('lists emails by send time with audience, recipients and status', async ({ admin, api }) => {
    api.addEmail(event.id, { subject: 'Reminder', audience: 'non-responders', sendAt: '2026-11-20T09:00', recipients: 3, status: 'Scheduled' });
    api.addEmail(event.id, { subject: "You're invited", audience: 'all', sendAt: '2026-11-01T09:00', recipients: 12, status: 'Sent' });
    await admin.event.goto(event.id, 'emails');
    await expect(admin.event.emails.rows).toHaveCount(2);
    await expect.poll(() => admin.event.emails.cells(0)).toEqual({ subject: "You're invited", audience: 'All invitees', sendTime: '2026-11-01 09:00', recipients: '12', status: 'Sent' });
    await expect.poll(() => admin.event.emails.cells(1)).toEqual({ subject: 'Reminder', audience: "People who haven't replied", sendTime: '2026-11-20 09:00', recipients: '3', status: 'Scheduled' });
  });

  test('a failed load can be retried', async ({ admin, api }) => {
    api.addEmail(event.id);
    api.failNext('GET', `/api/events/${event.id}/emails`);
    await admin.event.goto(event.id, 'emails');
    await expect(admin.event.error).toContainText('Something went wrong. Try again.');
    await admin.event.retry.click();
    await expect(admin.event.emails.rows).toHaveCount(1);
  });
});

test.describe('L2-029 Schedule invitations', () => {
  test('AC1 opens with all invitees, a subject naming the event and the first day of the invite window', async ({ admin }) => {
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await expect(dialog.root).toBeFocused();
    await expect(dialog.audience).toHaveValue('all');
    await expect(dialog.audience.locator('option')).toHaveText(['All invitees', "Only people who haven't replied"]);
    await expect(dialog.subject).toHaveValue("You're invited to Maya & Sam");
    await expect(dialog.subjectCounter).toHaveText('28/150');
    await expect(dialog.sendOn).toHaveValue(TODAY);
    await expect(dialog.sendOnHint).toBeVisible();
    await expect(dialog.senderName).toHaveValue('');
    await expect(dialog.replyTo).toHaveValue('');
  });

  test('AC4 schedules the invitation for 9:00 am, lists it and shows a toast', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await admin.event.emails.dialog.schedule({ sendOn: '2026-11-01' });
    await expect(admin.event.emails.dialog.root).toHaveCount(0);
    await expect(admin.event.toast).toHaveText('Invitation scheduled for 2026-11-01 09:00');
    await expect.poll(() => admin.event.emails.cells(0)).toEqual({
      subject: "You're invited to Maya & Sam", audience: 'All invitees', sendTime: '2026-11-01 09:00', recipients: '2', status: 'Scheduled',
    });
    expect(api.calls('POST', `/api/events/${event.id}/emails`)[0]!.body).toEqual({
      audience: 'all', subject: "You're invited to Maya & Sam", sendOn: '2026-11-01', senderName: '', replyTo: '',
    });
  });

  test('counts only people who have not replied when that audience is chosen', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    api.addReply(maya.id, { attending: false });
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await admin.event.emails.dialog.schedule({ audience: 'non-responders' });
    await expect.poll(() => admin.event.emails.cells(0)).toMatchObject({ audience: "People who haven't replied", recipients: '1' });
  });

  test('AC2 an empty or over-long subject is refused and nothing is scheduled', async ({ admin, api }) => {
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ subject: '' });
    await expect(dialog.errorFor('subject')).toHaveText('Add a subject');
    await dialog.schedule({ subject: 'x'.repeat(151) });
    await expect(dialog.errorFor('subject')).toHaveText('Subject can be up to 150 characters');
    await expect(dialog.subjectCounter).toHaveText('151/150');
    expect(api.emailsOf(event.id)).toHaveLength(0);
  });

  test('AC3 refuses a send date after invites close', async ({ admin }) => {
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ sendOn: '2026-12-13' });
    await expect(dialog.errorFor('sendOn')).toHaveText('Invitations must go out before invites close');
    await expect(dialog.sendOnHint).toHaveCount(0);
  });

  test('L2-036 refuses a malformed reply-to address', async ({ admin }) => {
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ replyTo: 'not-an-email' });
    await expect(dialog.errorFor('replyTo')).toHaveText('Enter a valid email address');
  });

  test('locks the form and shows Scheduling… while the request is in flight', async ({ admin, api }) => {
    const held = api.hold('POST', `/api/events/${event.id}/emails`);
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule();
    await expect(dialog.submit).toHaveText('Scheduling…');
    await expect(dialog.submit).toBeDisabled();
    await expect(dialog.audience).toBeDisabled();
    await expect(dialog.subject).toHaveAttribute('readonly', '');
    await expect(dialog.sendOn).toHaveAttribute('readonly', '');
    held.release();
    await expect(admin.event.emails.rows).toHaveCount(1);
    expect(api.calls('POST', `/api/events/${event.id}/emails`)).toHaveLength(1);
  });

  test('a server failure keeps the values and Try again schedules', async ({ admin, api }) => {
    api.failNext('POST', `/api/events/${event.id}/emails`);
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ subject: 'Save the date', sendOn: '2026-11-02' });
    await expect(dialog.failure).toContainText('Something went wrong. Try again.');
    await expect(dialog.subject).toHaveValue('Save the date');
    await expect(dialog.sendOn).toHaveValue('2026-11-02');
    await dialog.tryAgain.click();
    await expect(admin.event.toast).toHaveText('Invitation scheduled for 2026-11-02 09:00');
  });

  test('Cancel and Escape close the dialog without scheduling', async ({ admin, api }) => {
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.cancel.click();
    await expect(dialog.root).toHaveCount(0);
    await admin.event.emails.scheduleInvitations.click();
    await admin.page.keyboard.press('Escape');
    await expect(dialog.root).toHaveCount(0);
    expect(api.calls('POST', `/api/events/${event.id}/emails`)).toHaveLength(0);
  });
});

test.describe('L2-031 Preview an invitation email and L2-036 sender identity', () => {
  test('AC1 shows the exact text a guest receives, with a sample guest, from the organiser', async ({ admin, api }) => {
    api.addEmail(event.id, { subject: "You're invited to Maya & Sam" });
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.openPreview(0);
    await expect(preview.value('From')).toHaveText(ORGANISER.name);
    await expect(preview.value('Reply-to')).toHaveCount(0);
    await expect(preview.value('Subject')).toHaveText("You're invited to Maya & Sam");
    const text = invitationText({
      guestName: SAMPLE_GUEST.name, eventName: 'Maya & Sam', eventDate: '2026-12-12', link: personalLink(RSVP_URL, SAMPLE_GUEST.token), code: SAMPLE_GUEST.code,
    });
    await expect.poll(() => preview.body.textContent()).toBe(text);
    await preview.close.click();
    await expect(preview.root).toHaveCount(0);
  });

  test('uses the sender name and reply-to chosen when scheduling', async ({ admin }) => {
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await admin.event.emails.dialog.schedule({ senderName: 'Maya and Sam', replyTo: 'hosts@example.com' });
    await admin.event.emails.openPreview(0);
    await expect(preview.value('From')).toHaveText('Maya and Sam');
    await expect(preview.value('Reply-to')).toHaveText('hosts@example.com');
  });

  test('a failed preview can be retried', async ({ admin, api }) => {
    const email = api.addEmail(event.id, { subject: 'Hello' });
    api.failNext('GET', `/api/events/${event.id}/emails/${email.id}/preview`);
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.openPreview(0);
    await expect(preview.root.getByRole('alert')).toContainText('Something went wrong. Try again.');
    await preview.root.getByRole('button', { name: 'Try again' }).click();
    await expect(preview.value('Subject')).toHaveText('Hello');
  });
});
