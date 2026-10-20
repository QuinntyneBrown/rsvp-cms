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
    await expect.poll(() => admin.event.emails.cells(0)).toEqual({
      kind: 'Invitation', subject: "You're invited", audience: 'All invitees', sendTime: 'Sun 1 Nov · 9:00 am', recipients: '12', status: 'Sent',
    });
    await expect.poll(() => admin.event.emails.cells(1)).toEqual({
      kind: 'Invitation', subject: 'Reminder', audience: "People who haven't replied", sendTime: 'Fri 20 Nov · 9:00 am', recipients: '3', status: 'Scheduled',
    });
    await expect(admin.event.emails.rows.nth(0).getByRole('button', { name: 'Preview' })).toBeVisible();
  });

  test('AC3 shows placeholders while the emails load', async ({ admin, api }) => {
    api.addEmail(event.id);
    const held = api.hold('GET', `/api/events/${event.id}/emails`);
    await admin.event.goto(event.id, 'emails');
    await expect(admin.page.getByText('Loading emails')).toBeAttached();
    held.release();
    await expect(admin.event.emails.rows).toHaveCount(1);
  });

  test('AC3 a failed load can be retried', async ({ admin, api }) => {
    api.addEmail(event.id);
    api.failNext('GET', `/api/events/${event.id}/emails`);
    await admin.event.goto(event.id, 'emails');
    await expect(admin.event.error).toContainText("We couldn't load your emails");
    await admin.event.retry.click();
    await expect(admin.event.emails.rows).toHaveCount(1);
  });
});

test.describe('L2-029 Schedule invitations', () => {
  test('AC1 opens with all invitees and their count, a subject naming the event and the first day of the invite window', async ({ admin, api }) => {
    const maya = api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    api.addReply(maya.id, { attending: true });
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await expect(dialog.audienceOption('all')).toBeFocused(); // the first field (design system: dialog focus)
    await expect(dialog.audienceOption('all')).toBeChecked();
    await expect(dialog.audience).toContainText('All 2 invitees');
    await expect(dialog.audience).toContainText("Only people who haven't replied");
    await expect(dialog.audience).toContainText('1 person');
    await expect(dialog.subject).toHaveValue("You're invited to Maya & Sam");
    await expect(dialog.subjectCounter).toHaveText('28/150');
    await expect(dialog.sendOn).toHaveValue(TODAY);
    await expect(dialog.sendOnHint).toBeVisible();
    await expect(dialog.senderName).toHaveValue('');
    await expect(dialog.replyTo).toHaveValue('');
  });

  test('AC4 schedules the invitation for 9:00 am, shows the send time and lists it', async ({ admin, api }) => {
    api.addGuest(event.id, { name: 'Maya Chen' });
    api.addGuest(event.id, { name: 'Sam Okafor' });
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ sendOn: '2026-11-01' });
    await expect(dialog.done).toContainText('Scheduled for Sun 1 Nov at 9:00 am');
    await expect(dialog.done).toContainText('2 people will receive the invitation.');
    await expect.poll(() => admin.event.emails.cells(0)).toEqual({
      kind: 'Invitation', subject: "You're invited to Maya & Sam", audience: 'All invitees', sendTime: 'Sun 1 Nov · 9:00 am', recipients: '2', status: 'Scheduled',
    });
    await dialog.doneButton.click();
    await expect(dialog.done).toHaveCount(0);
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
    await expect(admin.event.emails.dialog.done).toContainText('1 person will receive the invitation.');
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
    await expect(dialog.sendOnHint).toBeVisible(); // help stays above the error (design system: form field)
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
    await expect(dialog.audienceOption('all')).toBeDisabled();
    await expect(dialog.subject).toHaveAttribute('readonly', '');
    await expect(dialog.sendOn).toHaveAttribute('readonly', '');
    held.release();
    await expect(dialog.done).toBeVisible();
    await expect(admin.event.emails.rows).toHaveCount(1);
    expect(api.calls('POST', `/api/events/${event.id}/emails`)).toHaveLength(1);
  });

  test('a server failure keeps the values and Try again schedules', async ({ admin, api }) => {
    api.failNext('POST', `/api/events/${event.id}/emails`);
    const dialog = admin.event.emails.dialog;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await dialog.schedule({ subject: 'Save the date', sendOn: '2026-11-02' });
    await expect(dialog.failure).toContainText("Couldn't schedule the invitation");
    await expect(dialog.failure).toContainText('Nothing was scheduled.');
    expect(api.emailsOf(event.id)).toHaveLength(0);
    await expect(dialog.subject).toHaveValue('Save the date');
    await expect(dialog.sendOn).toHaveValue('2026-11-02');
    await dialog.tryAgain.click();
    await expect(dialog.done).toContainText('Scheduled for Mon 2 Nov at 9:00 am');
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
    await expect.poll(() => preview.body.innerText()).toBe(text);
    await preview.close.click();
    await expect(preview.root).toHaveCount(0);
  });

  test('uses the sender name and reply-to chosen when scheduling', async ({ admin }) => {
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.scheduleInvitations.click();
    await admin.event.emails.dialog.schedule({ senderName: 'Maya and Sam', replyTo: 'hosts@example.com' });
    await admin.event.emails.dialog.doneButton.click();
    await admin.event.emails.openPreview(0);
    await expect(preview.value('From')).toHaveText('Maya and Sam');
    await expect(preview.value('Reply-to')).toHaveText('hosts@example.com');
  });

  test('AC2 a long email scrolls inside the dialog while the title and Close stay in view', async ({ admin, api }) => {
    api.addEmail(event.id, { subject: 'Hello' });
    const preview = admin.event.emails.preview;
    await admin.page.setViewportSize({ width: 800, height: 420 });
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.openPreview(0);
    await expect(preview.value('Subject')).toHaveText('Hello');
    const panel = preview.root.locator('.dialog__panel');
    expect(await panel.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(preview.root.getByRole('heading', { name: /^Preview: / })).toBeInViewport();
    await expect(preview.close).toBeInViewport();
  });

  test('AC3 shows a busy state in the body while the preview loads', async ({ admin, api }) => {
    const email = api.addEmail(event.id, { subject: 'Hello' });
    const held = api.hold('GET', `/api/events/${event.id}/emails/${email.id}/preview`);
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.openPreview(0);
    await expect(preview.root.getByText('Loading the preview')).toBeAttached();
    await expect(preview.root.locator('[aria-busy="true"]')).toHaveCount(1);
    held.release();
    await expect(preview.value('Subject')).toHaveText('Hello');
  });

  test('a failed preview can be retried', async ({ admin, api }) => {
    const email = api.addEmail(event.id, { subject: 'Hello' });
    api.failNext('GET', `/api/events/${event.id}/emails/${email.id}/preview`);
    const preview = admin.event.emails.preview;
    await admin.event.goto(event.id, 'emails');
    await admin.event.emails.openPreview(0);
    await expect(preview.root.getByRole('alert')).toContainText("We couldn't load the preview");
    await preview.root.getByRole('button', { name: 'Try again' }).click();
    await expect(preview.value('Subject')).toHaveText('Hello');
  });
});
