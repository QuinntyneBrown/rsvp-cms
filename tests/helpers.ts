import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { openDb } from '../src/data/db.js';
import { createOrganiser } from '../src/data/repos.js';
import { hashPassword } from '../src/domain/password.js';

export const T0 = Date.parse('2026-10-19T12:00:00Z');
export const PASSWORD = 'correct horse';

export function makeEnv() {
  const db = openDb();
  const clock = { now: T0 };
  const app = createApp({ db, now: () => clock.now });
  const organiserId = createOrganiser(db, 'olivia@example.com', 'Olivia', hashPassword(PASSWORD));
  const api = request(app);

  /** Sign in and return a Cookie header; supertest is plain http so the Secure cookie is replayed by hand. */
  async function signIn(email = 'olivia@example.com', keepSignedIn = false) {
    const res = await api.post('/api/auth/sign-in').send({ email, password: PASSWORD, keepSignedIn });
    const raw = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0] ?? '';
    return { res, cookie: raw.split(';')[0] ?? '' };
  }

  return { db, clock, api, organiserId, signIn };
}

export type Env = ReturnType<typeof makeEnv>;

export const futureEvent = (over: Record<string, unknown> = {}) => ({
  type: 'Wedding',
  name: 'Maya & Sam',
  date: '2026-12-12',
  startTime: '16:00',
  venue: 'The Barn',
  ...over,
});

export async function setup() {
  const env = makeEnv();
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

export function tokenOf(s: Setup, guestId: number): string {
  return (s.db.prepare('select token from guests where id = ?').get(guestId) as { token: string }).token;
}

/** Publish a page with a hero so the event is open to guests. */
export async function publish(s: Setup) {
  await s.api
    .put(`/api/events/${s.eventId}/page/draft`)
    .set('Cookie', s.cookie)
    .send({ blocks: [{ id: 'b1', type: 'hero', fields: { headline: 'Join us' } }] });
  return s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
}
