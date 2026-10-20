import { describe, expect, it } from 'vitest';
import { claimEmail, LEASE_MS } from '../../../src/data/mailQueue.js';
import {
  createEvent, createOrganiser, deleteEvent, fromDay, getPage, insertEmail, insertGuest, publishDraft, saveResponse,
} from '../../../src/data/repos.js';
import { emptyDb, T0 } from '../../helpers.js';

async function seeded() {
  const db = await emptyDb();
  const organiserId = await createOrganiser(db, 'Olivia@Example.com', 'Olivia', 'x:y');
  const eventId = await createEvent(db, organiserId, { type: 'Birthday', name: 'Party', date: '2026-12-12', startTime: '19:00', venue: '' }, '2026-10-19');
  const guestId = await insertGuest(db, eventId, { name: 'Maya', email: 'maya@example.com', group: '', plusOnes: 1 }, T0);
  return { db, organiserId, eventId, guestId };
}

describe('PostgreSQL schema and repositories', () => {
  it('stores emails lower-case and dates as dates', async () => {
    const { db, eventId } = await seeded();
    expect((await db.organiser.findFirstOrThrow()).email).toBe('olivia@example.com');
    const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.date).toEqual(fromDay('2026-12-12'));
    expect(event.inviteClose).toEqual(fromDay('2026-12-12'));
  });

  it('L2-021 AC3 the database refuses a second guest with the same email in one event', async () => {
    const { db, eventId } = await seeded();
    await expect(insertGuest(db, eventId, { name: 'Again', email: 'maya@example.com', group: '', plusOnes: 0 }, T0)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('L2-033 AC1 personal tokens carry at least 122 random bits', async () => {
    const { db } = await seeded();
    const { token } = await db.guest.findFirstOrThrow();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('L2-042 AC2 replies are keyed by guest, so concurrent saves leave one row', async () => {
    const { db, guestId } = await seeded();
    const reply = { attending: true, partySize: 2, meal: 'Fish', guestNames: ['Sam'], dietary: '', song: '', message: '' };
    await Promise.all(Array.from({ length: 5 }, (_, i) => saveResponse(db, guestId, reply, T0 + i)));
    expect(await db.response.count()).toBe(1);
  });

  it('L2-015 AC2 publishing copies the draft and marks the event Published together', async () => {
    const { db, eventId } = await seeded();
    const blocks = [{ id: 'h', type: 'hero' as const, fields: { headline: 'Hi' } }];
    await publishDraft(db, eventId, blocks, T0);
    expect((await getPage(db, eventId)).published).toEqual(blocks);
    expect((await db.event.findUniqueOrThrow({ where: { id: eventId } })).status).toBe('Published');
  });

  it('L2-010 deleting an event removes its page, guests, emails, deliveries and replies', async () => {
    const { db, eventId, guestId } = await seeded();
    await saveResponse(db, guestId, { attending: false, partySize: 0, meal: null, guestNames: [], dietary: '', song: '', message: '' }, T0);
    const emailId = await insertEmail(db, eventId, { kind: 'Invitation', audience: 'all', subject: 'Hi', sendAt: '2026-11-01T09:00', recipients: 1, senderName: '', replyTo: '' });
    await db.delivery.create({ data: { emailId, guestId, idempotencyKey: 'k' } });
    await deleteEvent(db, eventId);
    const counts = await Promise.all([db.page.count(), db.guest.count(), db.email.count(), db.delivery.count(), db.response.count()]);
    expect(counts).toEqual([0, 0, 0, 0, 0]);
  });

  it('L2-035 only one worker can hold an email lease at a time, and a stale lease can be taken over', async () => {
    const { db, eventId } = await seeded();
    const id = await insertEmail(db, eventId, { kind: 'Invitation', audience: 'all', subject: 'Hi', sendAt: '2026-11-01T09:00', recipients: 1, senderName: '', replyTo: '' });
    const now = Date.parse('2026-11-01T09:00:00Z');
    const claims = await Promise.all(Array.from({ length: 5 }, () => claimEmail(db, id, now)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await claimEmail(db, id, now + LEASE_MS - 1)).toBe(false);
    expect(await claimEmail(db, id, now + LEASE_MS + 1)).toBe(true);
  });
});
