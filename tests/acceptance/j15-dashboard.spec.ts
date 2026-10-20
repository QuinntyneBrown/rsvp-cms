import { describe, expect, it } from 'vitest';
import { addGuest, futureEvent, setup, storeReply } from '../helpers.js';

describe('L2-001 AC1 / L2-051 Dashboard summary', () => {
  it('signing in sends the organiser to the dashboard', async () => {
    const s = await setup();
    const { res } = await s.signIn();
    expect(res.body.redirect).toBe('/dashboard');
  });

  it('AC1 totals invitees, attending, waiting and scheduled emails across the organiser\'s events', async () => {
    const s = await setup();
    const maya = await addGuest(s);
    const sam = await addGuest(s, { name: 'Sam', email: 'sam@example.com' });
    await addGuest(s, { name: 'Lee', email: 'lee@example.com' });
    await storeReply(s, maya.id, true);
    await storeReply(s, sam.id, false);
    const other = await s.api.post('/api/events').set('Cookie', s.cookie).send(futureEvent({ name: 'Second', date: '2027-01-10' }));
    await s.api.post(`/api/events/${other.body.event.id}/guests`).set('Cookie', s.cookie).send({ name: 'Kai', email: 'kai@example.com' });
    await s.api.post(`/api/events/${s.eventId}/emails`).set('Cookie', s.cookie).send({ audience: 'all', subject: 'Hi', sendOn: '2026-11-01' });
    const res = await s.api.get('/api/dashboard/summary').set('Cookie', s.cookie);
    expect(res.body).toEqual({ invitees: 4, attending: 1, waiting: 2, emailsScheduled: 1 });
  });

  it('counts only the signed-in organiser\'s events and needs a session', async () => {
    const s = await setup();
    await addGuest(s);
    await s.store.createOrganiser('other@example.com', 'Other', s.store.organisers.get(s.organiserId)!.passwordHash);
    const { cookie } = await s.signIn('other@example.com');
    expect((await s.api.get('/api/dashboard/summary').set('Cookie', cookie)).body).toEqual({ invitees: 0, attending: 0, waiting: 0, emailsScheduled: 0 });
    expect((await s.api.get('/api/dashboard/summary')).status).toBe(401);
  });
});

describe('L2-052 Upcoming events list', () => {
  it('AC1 lists events from today in date order with invitees, attending and status', async () => {
    const s = await setup();
    const maya = await addGuest(s);
    await storeReply(s, maya.id, true);
    await s.api.post('/api/events').set('Cookie', s.cookie).send(futureEvent({ name: 'Sooner', date: '2026-11-01' }));
    const res = await s.api.get('/api/dashboard/upcoming-events').set('Cookie', s.cookie);
    expect(res.body.events).toEqual([
      expect.objectContaining({ name: 'Sooner', date: '2026-11-01', invitees: 0, attending: 0, status: 'Draft' }),
      expect.objectContaining({ id: s.eventId, name: 'Maya & Sam', date: '2026-12-12', invitees: 1, attending: 1, status: 'Draft' }),
    ]);
  });

  it('leaves out events whose date has passed', async () => {
    const s = await setup();
    s.clock.now = Date.parse('2026-12-13T12:00:00Z');
    const { cookie } = await s.signIn();
    expect((await s.api.get('/api/dashboard/upcoming-events').set('Cookie', cookie)).body.events).toEqual([]);
  });
});
