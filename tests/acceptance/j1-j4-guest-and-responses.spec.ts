import { describe, expect, it } from 'vitest';
import { addGuest, publish, setup, tokenOf, type Setup } from '../helpers.js';

const OPEN_DAY = Date.parse('2026-10-20T12:00:00Z');

async function openEvent(guest: Record<string, unknown> = {}) {
  const s = await setup();
  const g = await addGuest(s, guest);
  await publish(s);
  s.clock.now = OPEN_DAY;
  s.cookie = (await s.signIn()).cookie; // a day later the organiser's idle session has ended
  const token = tokenOf(s, g.id);
  return { s, g, token };
}

const rsvp = (s: Setup, token: string, b: Record<string, unknown>) => s.api.post(`/api/public/invite/${token}/rsvp`).send(b);
const yes = { attending: true, partySize: 1, meal: 'Fish' };

describe('J1 L2-038 Personal link access', () => {
  it('AC1 shows the invitation with the guest name', async () => {
    const { s, token } = await openEvent();
    const res = await s.api.get(`/api/public/invite/${token}`);
    expect(res.body.guest.name).toBe('Maya Chen');
    expect(res.body.state).toBe('open');
  });

  it('AC2/3 an unknown link and a deleted event look the same and disclose nothing', async () => {
    const { s, token } = await openEvent();
    const unknown = await s.api.get('/api/public/invite/not-a-token');
    s.db.prepare('delete from events').run();
    const deleted = await s.api.get(`/api/public/invite/${token}`);
    expect(unknown.status).toBe(404);
    expect(deleted.status).toBe(404);
    expect(deleted.body).toEqual(unknown.body);
  });

  it('AC4 contains no data about other guests', async () => {
    const { s, token } = await openEvent();
    await addGuest(s, { name: 'Secret Other', email: 'other@example.com' });
    const text = JSON.stringify((await s.api.get(`/api/public/invite/${token}`)).body);
    expect(text).not.toContain('Secret Other');
    expect(text).not.toContain('other@example.com');
  });
});

describe('J1 L2-039 Invitation page states', () => {
  it('AC4 a Draft event is not-open and exposes no content', async () => {
    const s = await setup();
    const g = await addGuest(s);
    const res = await s.api.get(`/api/public/invite/${tokenOf(s, g.id)}`);
    expect(res.body.state).toBe('not-open');
    expect(res.body.blocks).toBeUndefined();
  });

  it('AC2 before the window opens the state is not-open', async () => {
    const { s, token } = await openEvent();
    s.db.prepare("update events set invite_open = '2026-11-01'").run();
    expect((await s.api.get(`/api/public/invite/${token}`)).body.state).toBe('not-open');
    expect((await rsvp(s, token, yes)).status).toBe(403);
  });

  it('AC3 after it closes the state is closed and replies are refused', async () => {
    const { s, token } = await openEvent();
    s.clock.now = Date.parse('2026-12-13T12:00:00Z');
    expect((await s.api.get(`/api/public/invite/${token}`)).body.state).toBe('closed');
    expect((await rsvp(s, token, yes)).status).toBe(403);
  });
});

describe('J1 L2-040/041 RSVP form validation', () => {
  it('AC1 requires a yes/no choice', async () => {
    const { s, token } = await openEvent();
    expect((await rsvp(s, token, {})).body.errors.attending).toBe("Choose whether you're coming");
  });

  it('requires a meal for a yes and a name for each extra place', async () => {
    const { s, token } = await openEvent({ plusOnes: 1 });
    const res = await rsvp(s, token, { attending: true, partySize: 2, guestNames: [''] });
    expect(res.body.errors).toMatchObject({ meal: 'Choose a meal', 'guestNames.0': 'Add the name of your guest' });
  });

  it('rejects a party larger than the invitation allows', async () => {
    const { s, token } = await openEvent({ plusOnes: 0 });
    expect((await rsvp(s, token, { ...yes, partySize: 2 })).body.errors.partySize).toBeTruthy();
  });

  it('enforces the 500 / 120 / 280 character limits', async () => {
    const { s, token } = await openEvent();
    const res = await rsvp(s, token, { ...yes, dietary: 'x'.repeat(501), song: 'x'.repeat(121) });
    expect(Object.keys(res.body.errors)).toEqual(['dietary', 'song']);
    expect((await rsvp(s, token, { attending: false, message: 'x'.repeat(281) })).body.errors.message).toBeTruthy();
  });
});

describe('J1 L2-042/044 Submission and regrets', () => {
  it('AC1/2/4 stores one reply, even when submitted twice, and returns it on reload', async () => {
    const { s, token } = await openEvent();
    const [a, b] = await Promise.all([rsvp(s, token, yes), rsvp(s, token, yes)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect((s.db.prepare('select count(*) c from responses').get() as { c: number }).c).toBe(1);
    const again = await s.api.get(`/api/public/invite/${token}`);
    expect(again.body.reply).toMatchObject({ attending: true, partySize: 1, meal: 'Fish' });
  });

  it('declining stores the message', async () => {
    const { s, token } = await openEvent();
    const res = await rsvp(s, token, { attending: false, message: 'So sorry!' });
    expect(res.body.reply).toMatchObject({ attending: false, message: 'So sorry!', partySize: 0 });
  });
});

describe('J2 L2-037 Find invitation by code', () => {
  it('normalises case, spaces and a missing dash', async () => {
    const { s, g, token } = await openEvent();
    const forms = [g.code, g.code.toLowerCase(), `  ${g.code.replace('-', ' ')} `, g.code.replace('-', '')];
    for (const code of forms) {
      const res = await s.api.post('/api/public/code').send({ code });
      expect(res.body.token).toBe(token);
    }
  });

  it('shows one message for every failure and a separate one for empty', async () => {
    const { s } = await openEvent();
    const a = await s.api.post('/api/public/code').send({ code: 'ZZZZ-9999' });
    const b = await s.api.post('/api/public/code').send({ code: 'junk' });
    expect(a.body).toEqual(b.body);
    expect(a.body.error).toBe("This invitation link doesn't work");
    expect((await s.api.post('/api/public/code').send({ code: ' ' })).body.errors.code).toBe('Enter your invitation code');
  });
});

describe('J3 L2-043 Change or decline a reply', () => {
  it('AC1 a new answer replaces the old one and organiser counts update', async () => {
    const { s, token } = await openEvent();
    await rsvp(s, token, yes);
    await rsvp(s, token, { attending: true, partySize: 2, meal: 'Beef', guestNames: ['Sam'] });
    const rows = await s.api.get(`/api/events/${s.eventId}/responses`).set('Cookie', s.cookie);
    expect(rows.body.responses).toHaveLength(1);
    expect(rows.body.totals).toMatchObject({ attending: 1, guestsComing: 2, meals: { Beef: 2 } });
  });

  it('AC2 once closed the reply is returned but cannot change', async () => {
    const { s, token } = await openEvent();
    await rsvp(s, token, yes);
    s.clock.now = Date.parse('2026-12-13T12:00:00Z');
    const page = await s.api.get(`/api/public/invite/${token}`);
    expect(page.body.state).toBe('closed');
    expect(page.body.reply.attending).toBe(true);
    expect(page.body.event.inviteClose).toBe('2026-12-12');
  });

  it('AC3 changing from yes to no clears the guest count and meal', async () => {
    const { s, token } = await openEvent();
    await rsvp(s, token, yes);
    await rsvp(s, token, { attending: false });
    const rows = await s.api.get(`/api/events/${s.eventId}/responses`).set('Cookie', s.cookie);
    expect(rows.body.responses[0]).toMatchObject({ reply: 'declined', guestsCount: 0, meal: null });
  });
});

describe('J4 L2-046/047/048 Review responses', () => {
  async function withReplies() {
    const { s, token } = await openEvent({ plusOnes: 2 });
    const sam = await addGuest(s, { name: 'Sam Okafor', email: 'sam@example.com' });
    await addGuest(s, { name: 'Lee Waiting', email: 'lee@example.com' });
    await rsvp(s, token, { attending: true, partySize: 3, meal: 'Beef', guestNames: ['A', 'B'], dietary: 'No nuts' });
    s.clock.now += 60_000;
    await rsvp(s, tokenOf(s, sam.id), { attending: false, message: 'Sorry' });
    return s;
  }

  it('L2-046 AC1 lists newest first with every column', async () => {
    const s = await withReplies();
    const res = await s.api.get(`/api/events/${s.eventId}/responses`).set('Cookie', s.cookie);
    expect(res.body.responses.map((r: { guest: string }) => r.guest)).toEqual(['Sam Okafor', 'Maya Chen']);
    expect(res.body.responses[1]).toMatchObject({ reply: 'attending', guestsCount: 3, meal: 'Beef', dietary: 'No nuts' });
  });

  it('L2-046 AC3 pages at 50 rows', async () => {
    const { s } = await openEvent();
    const ins = s.db.prepare('insert into guests (event_id, name, email, token, code, created_at) values (?, ?, ?, ?, ?, ?)');
    const rep = s.db.prepare("insert into responses (guest_id, attending, party_size, meal, updated_at) values (?, 1, 1, 'Fish', ?)");
    for (let i = 0; i < 120; i++) {
      const id = Number(ins.run(s.eventId, `G${i}`, `g${i}@x.co`, `t${i}`, `C${i}`, 'x').lastInsertRowid);
      rep.run(id, `2026-10-20T00:${String(i % 60).padStart(2, '0')}:00Z`);
    }
    const p3 = await s.api.get(`/api/events/${s.eventId}/responses?page=3`).set('Cookie', s.cookie);
    expect(p3.body.total).toBe(120);
    expect(p3.body.responses).toHaveLength(20);
  });

  it('L2-047 AC1 totals match the stored replies', async () => {
    const s = await withReplies();
    const { totals } = (await s.api.get(`/api/events/${s.eventId}/responses`).set('Cookie', s.cookie)).body;
    expect(totals).toEqual({ attending: 1, declined: 1, waiting: 1, guestsComing: 3, meals: { Beef: 3 } });
  });

  it('L2-047 AC3 removing a reply removes it from totals', async () => {
    const s = await withReplies();
    const maya = s.db.prepare("select id from guests where name = 'Maya Chen'").get() as { id: number };
    await s.api.post(`/api/events/${s.eventId}/guests/remove`).set('Cookie', s.cookie).send({ ids: [maya.id] });
    const { totals } = (await s.api.get(`/api/events/${s.eventId}/responses`).set('Cookie', s.cookie)).body;
    expect(totals).toMatchObject({ attending: 0, guestsComing: 0, meals: {} });
  });

  it('L2-048 filters by reply and searches names case-insensitively', async () => {
    const s = await withReplies();
    const get = (qs: string) => s.api.get(`/api/events/${s.eventId}/responses?${qs}`).set('Cookie', s.cookie);
    expect((await get('status=declined')).body.responses.map((r: { guest: string }) => r.guest)).toEqual(['Sam Okafor']);
    expect((await get('q=MAYA')).body.total).toBe(1);
    expect((await get('q=nobody')).body.total).toBe(0);
  });
});
