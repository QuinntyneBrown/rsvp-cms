import request from 'supertest';
import { afterAll } from 'vitest';
import { createApp } from '../src/api/app.js';
import { openDb, type Db } from '../src/data/db.js';
import { resetSchema, TABLES } from '../src/data/migrate.js';
import { createOrganiser } from '../src/data/repos.js';
import { hashPassword } from '../src/domain/password.js';

export const T0 = Date.parse('2026-10-19T12:00:00Z');
export const PASSWORD = 'correct horse';
export const RSVP_URL = 'https://rsvp.example';

/**
 * Tests run against PostgreSQL (start it with `npm run db:up`). Each Vitest worker gets its own schema,
 * rebuilt from the Prisma migrations once per test file, and every makeEnv() starts from empty tables.
 */
const URL = process.env.TEST_DATABASE_URL ?? 'postgresql://rsvp:rsvp@localhost:5433/rsvp_test';
const SCHEMA = `w_${process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? '0'}`;

let shared: Promise<Db> | null = null;

function testDb(): Promise<Db> {
  shared ??= resetSchema(URL, SCHEMA).then(() => openDb({ url: URL, schema: SCHEMA }));
  return shared;
}

afterAll(async () => {
  if (shared) await (await shared).$disconnect();
  shared = null;
});

export async function emptyDb(): Promise<Db> {
  const db = await testDb();
  await db.$executeRawUnsafe(`truncate ${TABLES.map((t) => `"${SCHEMA}"."${t}"`).join(', ')} restart identity cascade`);
  return db;
}

export async function makeEnv() {
  const db = await emptyDb();
  const clock = { now: T0 };
  const app = createApp({ db, now: () => clock.now, rsvpUrl: RSVP_URL });
  const organiserId = await createOrganiser(db, 'olivia@example.com', 'Olivia', hashPassword(PASSWORD));
  const api = request(app);

  /** Sign in and return a Cookie header; supertest is plain http so the Secure cookie is replayed by hand. */
  async function signIn(email = 'olivia@example.com', keepSignedIn = false, password = PASSWORD) {
    const res = await api.post('/api/auth/sign-in').send({ email, password, keepSignedIn });
    return { res, cookie: cookieOf(res) };
  }

  return { db, clock, api, organiserId, signIn };
}

export const cookieOf = (res: { headers: Record<string, unknown> }) =>
  ((res.headers['set-cookie'] as string[] | undefined)?.[0] ?? '').split(';')[0] ?? '';

export type Env = Awaited<ReturnType<typeof makeEnv>>;

export const futureEvent = (over: Record<string, unknown> = {}) => ({
  type: 'Wedding',
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
  return (await s.db.guest.findUniqueOrThrow({ where: { id: guestId } })).token;
}

/** Stores a reply directly, for tests that need replies without going through the guest page. */
export async function storeReply(s: Setup, guestId: number, attending: boolean, partySize = attending ? 1 : 0, meal: string | null = attending ? 'Fish' : null) {
  await s.db.response.create({ data: { guestId, attending, partySize, meal, updatedAt: new Date(s.clock.now) } });
}

/** Publish a page with a hero so the event is open to guests. */
export async function publish(s: Setup) {
  await s.api
    .put(`/api/events/${s.eventId}/page/draft`)
    .set('Cookie', s.cookie)
    .send({ blocks: [{ id: 'b1', type: 'hero', fields: { headline: 'Join us' } }] });
  return s.api.post(`/api/events/${s.eventId}/page/publish`).set('Cookie', s.cookie);
}
