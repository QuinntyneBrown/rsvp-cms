import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../../../src/data/memoryStore.js';
import { DuplicateError, LEASE_MS } from '../../../src/data/store.js';
import { T0 } from '../../helpers.js';

const reply = { attending: true, partySize: 2, meal: 'Fish', guestNames: ['Sam'], dietary: '', song: '', message: '' };

async function seeded() {
  const store = new MemoryStore();
  const organiserId = await store.createOrganiser('Olivia@Example.com', 'Olivia', 'x:y');
  const eventId = await store.createEvent(organiserId, { type: 'Birthday', name: 'Party', date: '2026-12-12', startTime: '19:00', venue: '' }, '2026-10-19', T0);
  const guestId = await store.insertGuest(eventId, { name: 'Maya', email: 'maya@example.com', group: '', plusOnes: 1 }, T0);
  return { store, organiserId, eventId, guestId };
}

const email = { kind: 'Invitation', audience: 'all' as const, subject: 'Hi', sendAt: '2026-11-01T09:00', recipients: 1, senderName: '', replyTo: '' };

describe('Store behaviour the API relies on (in-memory implementation)', () => {
  it('stores organiser emails lower-case and opens the invite window from today to the event date', async () => {
    const { store, eventId } = await seeded();
    expect((await store.findOrganiserByEmail('OLIVIA@example.com'))?.email).toBe('olivia@example.com');
    expect(await store.getEvent(eventId)).toMatchObject({ status: 'Draft', inviteOpen: '2026-10-19', inviteClose: '2026-12-12' });
  });

  it('L2-021 AC3 refuses a second guest with the same email in one event', async () => {
    const { store, eventId } = await seeded();
    await expect(store.insertGuest(eventId, { name: 'Again', email: 'maya@example.com', group: '', plusOnes: 0 }, T0)).rejects.toBeInstanceOf(DuplicateError);
  });

  it('L2-033 AC1 personal tokens are random UUIDs', async () => {
    const { store, guestId } = await seeded();
    expect((await store.getGuest(guestId))?.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('L2-042 AC2 replies are keyed by guest, so concurrent saves leave one row', async () => {
    const { store, guestId } = await seeded();
    await Promise.all(Array.from({ length: 5 }, (_, i) => store.saveResponse(guestId, reply, T0 + i)));
    expect(store.responses.size).toBe(1);
  });

  it('returns copies, so callers cannot change stored state by accident', async () => {
    const { store, guestId } = await seeded();
    const saved = await store.saveResponse(guestId, reply, T0);
    saved.guestNames.push('Intruder');
    expect((await store.getResponse(guestId))?.guestNames).toEqual(['Sam']);
  });

  it('L2-015 AC2 publishing copies the draft and marks the event Published', async () => {
    const { store, eventId } = await seeded();
    const blocks = [{ id: 'h', type: 'hero' as const, fields: { headline: 'Hi' } }];
    await store.publishDraft(eventId, blocks, T0);
    expect((await store.getPage(eventId)).published).toEqual(blocks);
    expect((await store.getEvent(eventId))?.status).toBe('Published');
  });

  it('deleting an event removes its page, guests, emails, deliveries and replies', async () => {
    const { store, eventId, guestId } = await seeded();
    await store.saveResponse(guestId, reply, T0);
    const emailId = await store.insertEmail(eventId, email, T0);
    await store.materialiseDeliveries((await store.getEmail(emailId))!);
    await store.deleteEvent(eventId);
    expect([store.pages.size, store.guests.size, store.emails.size, store.deliveries.size, store.responses.size]).toEqual([0, 0, 0, 0, 0]);
  });

  it('L2-035 only one worker holds an email lease at a time, and a stale lease can be taken over', async () => {
    const { store, eventId } = await seeded();
    const id = await store.insertEmail(eventId, email, T0);
    const now = Date.parse('2026-11-01T09:00:00Z');
    expect(await store.dueEmailIds(now - 1)).toEqual([]);
    expect(await store.dueEmailIds(now)).toEqual([id]);
    const claims = await Promise.all(Array.from({ length: 5 }, () => store.claimEmail(id, now)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await store.claimEmail(id, now + LEASE_MS - 1)).toBe(false);
    expect(await store.claimEmail(id, now + LEASE_MS + 1)).toBe(true);
  });

  it('materialising deliveries twice adds nobody twice', async () => {
    const { store, eventId } = await seeded();
    const rec = (await store.getEmail(await store.insertEmail(eventId, email, T0)))!;
    await store.materialiseDeliveries(rec);
    await store.materialiseDeliveries(rec);
    expect(store.deliveries.size).toBe(1);
  });
});
