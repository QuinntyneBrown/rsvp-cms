import { describe, expect, it } from 'vitest';
import { sendDueEmails } from '../../src/shared/mail/worker.js';
import { MemoryTransport } from '../../src/shared/mail/transport.js';
import { addGuest, publish, RSVP_URL, setup, storeReply, tokenOf, type Setup } from '../helpers.js';

const OPEN_DAY = Date.parse('2026-10-20T12:00:00Z');

async function invited() {
  const s = await setup();
  const g = await addGuest(s);
  await publish(s);
  return { s, g, token: await tokenOf(s, g.id) };
}

const regenerate = (s: Setup) => s.api.post(`/api/events/${s.eventId}/invitation-links/regenerate`).set('Cookie', s.cookie);
const open = (s: Setup, token: string) => s.api.get(`/api/public/invite/${token}`);

describe('L2-011 Regenerate invitation links', () => {
  it('AC1 every earlier personal link and invitation code is rejected from that moment', async () => {
    const { s, g, token } = await invited();
    const res = await regenerate(s);
    expect(res.status).toBe(200);
    s.clock.now = OPEN_DAY;
    expect((await open(s, token)).status).toBe(404);
    expect((await s.api.post(`/api/public/invite/${token}/rsvp`).send({ attending: false })).status).toBe(404);
    const byCode = await s.api.post('/api/public/code').send({ code: g.code });
    expect(byCode.status).toBe(404);
    expect(byCode.body.error).toBe("This invitation link doesn't work");
  });

  it('AC2 / L2-038 AC2 an old link shows the invalid state naming the organiser', async () => {
    const { s, token } = await invited();
    await regenerate(s);
    s.clock.now = OPEN_DAY;
    const res = await open(s, token);
    expect(res.body).toEqual({ error: "This invitation link doesn't work", host: 'Olivia' });
  });

  it('AC3 the response says new links go with the next invitation email and carries no link values', async () => {
    const { s, g, token } = await invited();
    const res = await regenerate(s);
    expect(res.body.message).toBe('New links are sent with the next invitation email.');
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(token);
    expect(text).not.toContain(g.code);
  });

  it('AC3 the next invitation email carries a new working link and code, and replies are kept', async () => {
    const { s, g, token } = await invited();
    await storeReply(s, g.id, true);
    await regenerate(s);
    await s.api.post(`/api/events/${s.eventId}/emails`).set('Cookie', s.cookie).send({ audience: 'all', subject: 'Again', sendOn: '2026-11-01' });
    const transport = new MemoryTransport();
    s.clock.now = Date.parse('2026-11-01T09:00:00Z');
    await sendDueEmails({ store: s.store, transport, now: () => s.clock.now, rsvpUrl: RSVP_URL });
    const fresh = await tokenOf(s, g.id);
    expect(fresh).not.toBe(token);
    expect(transport.sent[0]!.text).toContain(`${RSVP_URL}/i/${fresh}`);
    const page = await open(s, fresh);
    expect(page.status).toBe(200);
    expect(page.body.reply.attending).toBe(true);
    const code = s.store.guests.get(g.id)!.code;
    expect(code).not.toBe(g.code);
    expect((await s.api.post('/api/public/code').send({ code })).body.token).toBe(fresh);
  });

  it('a guest added after regeneration gets a link that works', async () => {
    const { s } = await invited();
    await regenerate(s);
    const sam = await addGuest(s, { name: 'Sam', email: 'sam@example.com' });
    s.clock.now = OPEN_DAY;
    expect((await open(s, await tokenOf(s, sam.id))).status).toBe(200);
  });

  it('AC4 a failed regeneration leaves the old links working', async () => {
    const { s, token } = await invited();
    const original = s.store.regenerateLinks.bind(s.store);
    s.store.regenerateLinks = async () => { throw new Error('database is down'); };
    const res = await regenerate(s);
    expect(res.status).toBe(500);
    s.store.regenerateLinks = original;
    s.clock.now = OPEN_DAY;
    expect((await open(s, token)).status).toBe(200);
  });

  it('only the owning organiser can regenerate', async () => {
    const { s } = await invited();
    expect((await s.api.post(`/api/events/${s.eventId}/invitation-links/regenerate`)).status).toBe(401);
  });
});
