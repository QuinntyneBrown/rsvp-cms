import { describe, expect, it } from 'vitest';
import { addGuest, setup, type Setup } from '../helpers.js';

const schedule = (s: Setup, over: Record<string, unknown> = {}) =>
  s.api
    .post(`/api/events/${s.eventId}/emails`)
    .set('Cookie', s.cookie)
    .send({ audience: 'all', subject: "You're invited", sendOn: '2026-11-01', ...over });

describe('L2-029 Schedule invitations', () => {
  it('AC2 validates the subject', async () => {
    const s = await setup();
    expect((await schedule(s, { subject: '' })).body.errors.subject).toBeTruthy();
    expect((await schedule(s, { subject: 'x'.repeat(151) })).status).toBe(422);
    expect((await s.api.get(`/api/events/${s.eventId}/emails`).set('Cookie', s.cookie)).body.emails).toHaveLength(0);
  });

  it('AC3 refuses a send date after invites close', async () => {
    const s = await setup(); // invites close on the event date, 2026-12-12
    const res = await schedule(s, { sendOn: '2026-12-13' });
    expect(res.body.errors.sendOn).toBe('Invitations must go out before invites close');
  });

  it('AC4 queues the email for 9:00 am on the send date', async () => {
    const s = await setup();
    await addGuest(s);
    const res = await schedule(s);
    expect(res.status).toBe(201);
    expect(res.body.sendTime).toBe('2026-11-01T09:00');
    expect(res.body.email.recipients).toBe(1);
  });

  it('counts only non-responders when asked', async () => {
    const s = await setup();
    const a = await addGuest(s);
    await addGuest(s, { name: 'Sam', email: 'sam@example.com' });
    s.db.prepare("insert into responses (guest_id, attending, party_size, updated_at) values (?, 0, 0, 'x')").run(a.id);
    const res = await schedule(s, { audience: 'non-responders' });
    expect(res.body.email.recipients).toBe(1);
  });
});

describe('L2-030 Scheduled and sent email list', () => {
  it('AC1 lists each email with audience, send time, recipients and status', async () => {
    const s = await setup();
    await schedule(s);
    await schedule(s, { sendOn: '2026-11-15' });
    const list = await s.api.get(`/api/events/${s.eventId}/emails`).set('Cookie', s.cookie);
    expect(list.body.emails).toHaveLength(2);
    expect(list.body.emails[0]).toMatchObject({ audience: 'All invitees', status: 'Scheduled', sendAt: '2026-11-01T09:00' });
  });
});

describe('L2-031 / L2-036 Email preview and sender identity', () => {
  it('shows From, Subject and body, with reply-to when set', async () => {
    const s = await setup();
    const created = await schedule(s, { senderName: 'Maya & Sam', replyTo: 'hello@example.com' });
    const preview = await s.api.get(`/api/events/${s.eventId}/emails/${created.body.email.id}/preview`).set('Cookie', s.cookie);
    expect(preview.body).toMatchObject({ from: 'Maya & Sam', replyTo: 'hello@example.com', subject: "You're invited" });
    expect(preview.body.body).toContain('Maya & Sam');
  });

  it('validates reply-to and strips line breaks from header values', async () => {
    const s = await setup();
    expect((await schedule(s, { replyTo: 'nope' })).body.errors.replyTo).toBeTruthy();
    const ok = await schedule(s, { subject: 'Hello\r\nBcc: evil@example.com', senderName: 'A\nB' });
    expect(ok.body.email.subject).toBe('Hello Bcc: evil@example.com');
    const row = s.db.prepare('select sender_name from emails').get() as { sender_name: string };
    expect(row.sender_name).toBe('A B');
  });
});
