import { describe, expect, it } from 'vitest';
import { addGuest, setup, tokenOf } from '../helpers.js';

describe('L2-019/020 Guest list, search and filter', () => {
  it('lists guests with status Waiting, searches case-insensitively and filters by status', async () => {
    const s = await setup();
    const maya = await addGuest(s);
    await addGuest(s, { name: 'Sam Okafor', email: 'sam@example.com' });
    const list = await s.api.get(`/api/events/${s.eventId}/guests`).set('Cookie', s.cookie);
    expect(list.body.total).toBe(2);
    expect(list.body.invitees).toBe(2);
    expect(list.body.guests[0].status).toBe('waiting');
    const q = await s.api.get(`/api/events/${s.eventId}/guests?q=MAYA`).set('Cookie', s.cookie);
    expect(q.body.guests.map((g: { id: number }) => g.id)).toEqual([maya.id]);
    const none = await s.api.get(`/api/events/${s.eventId}/guests?q=zzz`).set('Cookie', s.cookie);
    expect(none.body.total).toBe(0);
    const attending = await s.api.get(`/api/events/${s.eventId}/guests?status=attending`).set('Cookie', s.cookie);
    expect(attending.body.total).toBe(0);
  });

  it('pages at 50 rows', async () => {
    const s = await setup();
    for (let i = 0; i < 52; i++) await addGuest(s, { name: `Guest ${i}`, email: `g${i}@example.com` });
    const p1 = await s.api.get(`/api/events/${s.eventId}/guests`).set('Cookie', s.cookie);
    const p2 = await s.api.get(`/api/events/${s.eventId}/guests?page=2`).set('Cookie', s.cookie);
    expect(p1.body.guests).toHaveLength(50);
    expect(p2.body.guests).toHaveLength(2);
  });
});

describe('L2-021 Add a guest', () => {
  it('AC1 adds with status Waiting and a personal link', async () => {
    const s = await setup();
    const g = await addGuest(s);
    expect(g.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(tokenOf(s, g.id)).toBeTruthy();
  });

  it('AC2 rejects a malformed email', async () => {
    const s = await setup();
    const res = await s.api.post(`/api/events/${s.eventId}/guests`).set('Cookie', s.cookie).send({ name: 'A', email: 'bad' });
    expect(res.body.errors.email).toBe('Enter an email like name@example.com');
  });

  it('AC3 rejects a duplicate email in the same event', async () => {
    const s = await setup();
    await addGuest(s);
    const res = await s.api.post(`/api/events/${s.eventId}/guests`).set('Cookie', s.cookie).send({ name: 'B', email: 'MAYA@example.com' });
    expect(res.body.errors.email).toBe('This email is already on the list');
  });

  it('AC4 validates the name and AC5 plus-ones 0..9', async () => {
    const s = await setup();
    const post = (b: Record<string, unknown>) => s.api.post(`/api/events/${s.eventId}/guests`).set('Cookie', s.cookie).send(b);
    expect((await post({ name: '', email: 'a@b.co' })).body.errors.name).toBeTruthy();
    expect((await post({ name: 'x'.repeat(121), email: 'a@b.co' })).body.errors.name).toBeTruthy();
    expect((await post({ name: 'A', email: 'a@b.co', plusOnes: 10 })).body.errors.plusOnes).toBeTruthy();
    expect((await post({ name: 'A', email: 'a@b.co', plusOnes: 1.5 })).body.errors.plusOnes).toBeTruthy();
    expect((await post({ name: 'A', email: 'a@b.co' })).body.guest.plusOnes).toBe(0);
  });
});

describe('L2-022 Edit a guest', () => {
  it('AC1 saves new values', async () => {
    const s = await setup();
    const g = await addGuest(s);
    const res = await s.api.put(`/api/events/${s.eventId}/guests/${g.id}`).set('Cookie', s.cookie).send({ name: 'Maya C', email: 'maya@example.com', plusOnes: 2 });
    expect(res.body.guest.name).toBe('Maya C');
    expect(res.body.guest.plusOnes).toBe(2);
  });

  it('AC2 rejects an email used by another guest', async () => {
    const s = await setup();
    const g = await addGuest(s);
    await addGuest(s, { name: 'Sam', email: 'sam@example.com' });
    const res = await s.api.put(`/api/events/${s.eventId}/guests/${g.id}`).set('Cookie', s.cookie).send({ name: 'Maya', email: 'sam@example.com' });
    expect(res.body.errors.email).toBe('This email is already on the list');
  });

  it('AC4 refuses to lower plus-ones below the places already confirmed', async () => {
    const s = await setup();
    const g = await addGuest(s, { plusOnes: 2 });
    s.db.prepare("insert into responses (guest_id, attending, party_size, meal, updated_at) values (?, 1, 3, 'Beef', 'x')").run(g.id);
    const res = await s.api.put(`/api/events/${s.eventId}/guests/${g.id}`).set('Cookie', s.cookie).send({ name: 'Maya', email: 'maya@example.com', plusOnes: 1 });
    expect(res.status).toBe(422);
    expect(res.body.errors.plusOnes).toMatch(/ask them/i);
  });
});

describe('L2-023 Remove guests', () => {
  it('removes selected guests with their replies and stops their links working', async () => {
    const s = await setup();
    const a = await addGuest(s);
    const b = await addGuest(s, { name: 'Sam', email: 'sam@example.com' });
    s.db.prepare("insert into responses (guest_id, attending, party_size, meal, updated_at) values (?, 1, 1, 'Fish', 'x')").run(a.id);
    const token = tokenOf(s, a.id);
    const res = await s.api.post(`/api/events/${s.eventId}/guests/remove`).set('Cookie', s.cookie).send({ ids: [a.id, b.id] });
    expect(res.body.removed).toBe(2);
    expect((s.db.prepare('select count(*) c from responses').get() as { c: number }).c).toBe(0);
    expect((await s.api.get(`/api/public/invite/${token}`)).status).toBe(404);
  });

  it('cannot remove guests of another event', async () => {
    const s = await setup();
    const g = await addGuest(s);
    const other = await s.api.post('/api/events').set('Cookie', s.cookie).send({ type: 'Other', name: 'Other', date: '2027-01-01', startTime: '10:00' });
    const res = await s.api.post(`/api/events/${other.body.event.id}/guests/remove`).set('Cookie', s.cookie).send({ ids: [g.id] });
    expect(res.body.removed).toBe(0);
  });
});
