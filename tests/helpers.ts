import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { MemoryStore } from '../src/data/memoryStore.js';
import { hashPassword } from '../src/domain/password.js';

export const T0 = Date.parse('2026-10-19T12:00:00Z');
export const PASSWORD = 'correct horse';
export const RSVP_URL = 'https://rsvp.example';

/** Tests never use a real database: every environment gets its own in-memory store. */
export async function makeEnv() {
  const store = new MemoryStore();
  const clock = { now: T0 };
  const app = createApp({ store, now: () => clock.now, rsvpUrl: RSVP_URL });
  const organiserId = await store.createOrganiser('olivia@example.com', 'Olivia', hashPassword(PASSWORD));
  const api = request(app);

  /** Sign in and return a Cookie header; supertest is plain http so the Secure cookie is replayed by hand. */
  async function signIn(email = 'olivia@example.com', keepSignedIn = false, password = PASSWORD) {
    const res = await api.post('/api/auth/sign-in').send({ email, password, keepSignedIn });
    return { res, cookie: cookieOf(res) };
  }

  return { store, clock, api, organiserId, signIn };
}

export const cookieOf = (res: { headers: Record<string, unknown> }) =>
  ((res.headers['set-cookie'] as string[] | undefined)?.[0] ?? '').split(';')[0] ?? '';

export type Env = Awaited<ReturnType<typeof makeEnv>>;

export const futureEvent = (over: Record<string, unknown> = {}) => ({
  type: 'Anniversary',
  name: 'Maya & Sam',
  date: '2026-12-12',
  startTime: '16:00',
  venue: 'The Barn',
  ...over,
});

export async function setup() {
  const env = await makeEnv();
  const { cookie } = await env.signIn();
  const created = await env.api.post('/api/events').set('Cookie', cookie).send(futureEvent());
  return { ...env, cookie, eventId: created.body.event.id as number };
}

export type Setup = Awaited<ReturnType<typeof setup>>;

export async function addGuest(s: Setup, over: Record<string, unknown> = {}) {
  const res = await s.api
    .post(`/api/events/${s.eventId}/guests`)
    .set('Cookie', s.cookie)
    .send({ name: 'Maya Chen', email: 'maya@example.com', plusOnes: 1, ...over });
  return res.body.guest as { id: number; code: string; name: string };
}

export async function tokenOf(s: Setup, guestId: number): Promise<string> {
  return s.store.guests.get(guestId)!.token;
}

/** Stores a reply directly, for tests that need replies without going through the guest page. */
export async function storeReply(s: Setup, guestId: number, attending: boolean, partySize = attending ? 1 : 0, meal: string | null = attending ? 'Fish' : null) {
  await s.store.saveResponse(guestId, { attending, partySize, meal, guestNames: [], dietary: '', song: '', message: '' }, s.clock.now);
}

/** Publish a page with a hero so the event is open to guests. */
export async function publish(s: Setup) {
  await s.api
    .put(`/api/events/${s.eventId}/page/draft`)
    .set('Cookie', s.cookie)
    .send({ blocks: [{ id: 'b1', type: 'hero', fields: { headline: 'Join us' } }] });
  return s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
}
