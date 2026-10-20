import { describe, expect, it } from 'vitest';
import { sendDueEmails } from '../../src/shared/mail/worker.js';
import { MemoryTransport } from '../../src/shared/mail/transport.js';
import { addGuest, RSVP_URL, setup, storeReply, tokenOf, type Setup } from '../helpers.js';

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
    await storeReply(s, a.id, false);
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
    expect((await schedule(s, { replyTo: 'nope' })).body.errors.replyTo).toBe('Enter a valid email address');
    const ok = await schedule(s, { subject: 'Hello\r\nBcc: evil@example.com', senderName: 'A\nB' });
    expect(ok.body.email.subject).toBe('Hello Bcc: evil@example.com');
    const row = [...s.store.emails.values()][0]!;
    expect(row.senderName).toBe('A B');
  });
});

describe('L2-029 AC4 / L2-030 / L2-033 / L2-036 Sending scheduled invitations', () => {
  async function scheduled(over: Record<string, unknown> = {}) {
    const s = await setup();
    const maya = await addGuest(s);
    const sam = await addGuest(s, { name: 'Sam Okafor', email: 'sam@example.com' });
    const created = await schedule(s, { senderName: 'Maya & Sam', replyTo: 'hello@example.com', ...over });
    const transport = new MemoryTransport();
    const run = () => sendDueEmails({ store: s.store, transport, now: () => s.clock.now, rsvpUrl: RSVP_URL });
    return { s, maya, sam, transport, run, emailId: created.body.email.id as number };
  }

  it('sends nothing before 9:00 am on the send date, then one email per guest', async () => {
    const { s, transport, run } = await scheduled();
    s.clock.now = Date.parse('2026-11-01T08:59:00Z');
    await run();
    expect(transport.sent).toHaveLength(0);
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    expect(await run()).toEqual({ sent: 2, failed: 0 });
    expect(transport.sent.map((m) => m.to).sort()).toEqual(['maya@example.com', 'sam@example.com']);
    const { cookie } = await s.signIn(); // two weeks later the organiser signs in again
    const list = await s.api.get(`/api/events/${s.eventId}/emails`).set('Cookie', cookie);
    expect(list.body.emails[0]).toMatchObject({ status: 'Sent', recipients: 2 });
  });

  it('L2-033 each message carries the guest\'s own personal link and code', async () => {
    const { s, maya, transport, run } = await scheduled();
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await run();
    const mail = transport.sent.find((m) => m.to === 'maya@example.com')!;
    expect(mail.text).toContain(`${RSVP_URL}/i/${await tokenOf(s, maya.id)}`);
    expect(mail.text).toContain(maya.code);
    expect(mail.text).toContain('Hi Maya Chen,');
  });

  it('L2-036 uses the sender name and reply-to, falling back to the organiser name', async () => {
    const a = await scheduled();
    a.s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await a.run();
    expect(a.transport.sent[0]).toMatchObject({ fromName: 'Maya & Sam', replyTo: 'hello@example.com', subject: "You're invited" });
    const b = await scheduled({ senderName: '', replyTo: '' });
    b.s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await b.run();
    expect(b.transport.sent[0]).toMatchObject({ fromName: 'Olivia', replyTo: undefined });
  });

  it('L2-035 a rerun never sends a guest the same email twice', async () => {
    const { s, transport, run } = await scheduled();
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await run();
    await run();
    expect(transport.sent).toHaveLength(2);
    expect(new Set(transport.sent.map((m) => m.idempotencyKey)).size).toBe(2);
  });

  it('L2-035 retries a temporary failure with back-off and marks Failed after 5 attempts', async () => {
    const { s, transport, run } = await scheduled();
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    transport.failNext = 1;
    await run();
    expect(transport.sent).toHaveLength(1); // the other guest is waiting for a retry
    await run();
    expect(transport.sent).toHaveLength(1); // not yet: the first retry waits a minute
    s.clock.now += 60_000;
    await run();
    expect(transport.sent).toHaveLength(2);

    const other = await scheduled();
    other.s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    other.transport.failNext = 1000;
    const start = other.s.clock.now;
    for (let i = 0; i < 10; i++) {
      await other.run();
      other.s.clock.now += 10 * 60_000;
    }
    const email = [...other.s.store.emails.values()][0]!;
    expect(email.status).toBe('Failed');
    const attempts = [...other.s.store.deliveries.values()];
    expect(attempts.every((d) => d.attempts === 5 && d.status === 'Failed')).toBe(true);
    expect(other.s.clock.now - start).toBeLessThanOrEqual(100 * 60_000);
  });

  it('L2-023 AC2 a removed guest is dropped from emails not yet sent', async () => {
    const { s, maya, transport, run } = await scheduled();
    await s.api.post(`/api/events/${s.eventId}/guests/remove`).set('Cookie', s.cookie).send({ ids: [maya.id] });
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await run();
    expect(transport.sent.map((m) => m.to)).toEqual(['sam@example.com']);
  });

  it('L2-032 "haven\'t replied" emails go only to guests still waiting at send time', async () => {
    const { s, maya, transport, run } = await scheduled({ audience: 'non-responders' });
    await storeReply(s, maya.id, true);
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await run();
    expect(transport.sent.map((m) => m.to)).toEqual(['sam@example.com']);
  });

  it('two workers running at once still send each message once', async () => {
    const { s, transport } = await scheduled();
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    const deps = { store: s.store, transport, now: () => s.clock.now, rsvpUrl: RSVP_URL };
    await Promise.all([sendDueEmails(deps), sendDueEmails(deps), sendDueEmails(deps)]);
    expect(transport.sent).toHaveLength(2);
  });
});

describe('L2-031 Preview matches what is sent', () => {
  it('renders the sent text with a sample guest', async () => {
    const s = await setup();
    const created = await schedule(s);
    const preview = await s.api.get(`/api/events/${s.eventId}/emails/${created.body.email.id}/preview`).set('Cookie', s.cookie);
    expect(preview.body.body).toContain('Hi Maya Sample,');
    expect(preview.body.body).toContain(`${RSVP_URL}/i/SAMPLE-LINK`);
    expect(preview.body.from).toBe('Olivia');
  });
});
