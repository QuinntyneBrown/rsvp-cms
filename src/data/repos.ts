import { randomBytes, randomUUID } from 'node:crypto';
import { generateCode } from '../domain/code.js';
import type { Block } from '../domain/blocks.js';
import type { NewEvent } from '../domain/events.js';
import type { GuestInput } from '../domain/guests.js';
import type { Reply } from '../domain/rsvp.js';
import type { Db } from './db.js';

type Row = Record<string, unknown>;
const one = (db: Db, sql: string, ...p: (string | number | null)[]) => db.prepare(sql).get(...p) as Row | undefined;
const all = (db: Db, sql: string, ...p: (string | number | null)[]) => db.prepare(sql).all(...p) as Row[];
const run = (db: Db, sql: string, ...p: (string | number | null)[]) => db.prepare(sql).run(...p);

// ---- organisers & sessions -------------------------------------------------

export const findOrganiserByEmail = (db: Db, email: string) =>
  one(db, 'select * from organisers where email = ?', email.toLowerCase());

export const findOrganiserById = (db: Db, id: number) => one(db, 'select * from organisers where id = ?', id);

export function createOrganiser(db: Db, email: string, name: string, passwordHash: string): number {
  return Number(run(db, 'insert into organisers (email, name, password_hash) values (?, ?, ?)', email.toLowerCase(), name, passwordHash).lastInsertRowid);
}

export function setPassword(db: Db, id: number, hash: string) {
  run(db, 'update organisers set password_hash = ?, password_version = password_version + 1 where id = ?', hash, id);
}

export function createSession(db: Db, organiserId: number, passwordVersion: number, now: number, expiresAt: number | null): string {
  const id = randomBytes(32).toString('hex');
  run(db, 'insert into sessions (id, organiser_id, password_version, last_seen, expires_at) values (?, ?, ?, ?, ?)', id, organiserId, passwordVersion, now, expiresAt);
  return id;
}

export const findSession = (db: Db, id: string) => one(db, 'select * from sessions where id = ?', id);
export const touchSession = (db: Db, id: string, now: number) => run(db, 'update sessions set last_seen = ? where id = ?', now, id);
export const deleteSession = (db: Db, id: string) => run(db, 'delete from sessions where id = ?', id);

// ---- events ----------------------------------------------------------------

export function createEvent(db: Db, organiserId: number, e: NewEvent, today: string): number {
  const id = Number(
    run(
      db,
      `insert into events (organiser_id, type, name, date, start_time, venue, status, invite_open, invite_close, created_at)
       values (?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?)`,
      organiserId, e.type, e.name, e.date, e.startTime, e.venue, today, e.date, today,
    ).lastInsertRowid,
  );
  run(db, 'insert into pages (event_id) values (?)', id);
  return id;
}

export const listEvents = (db: Db, organiserId: number) =>
  all(db, 'select * from events where organiser_id = ? order by date', organiserId);

export const getEvent = (db: Db, id: number) => one(db, 'select * from events where id = ?', id);

export const setEventStatus = (db: Db, id: number, status: string) => run(db, 'update events set status = ? where id = ?', status, id);

export const deleteEvent = (db: Db, id: number) => run(db, 'delete from events where id = ?', id);

// ---- guests ----------------------------------------------------------------

export interface GuestQuery {
  q?: string;
  status?: 'attending' | 'declined' | 'waiting';
  page: number;
  pageSize: number;
}

export function listGuests(db: Db, eventId: number, query: GuestQuery) {
  const where = ['g.event_id = ?'];
  const params: (string | number)[] = [eventId];
  if (query.q) {
    where.push('(lower(g.name) like ? or lower(g.email) like ?)');
    const like = `%${query.q.toLowerCase()}%`;
    params.push(like, like);
  }
  if (query.status === 'attending') where.push('r.attending = 1');
  if (query.status === 'declined') where.push('r.attending = 0');
  if (query.status === 'waiting') where.push('r.guest_id is null');
  const from = `from guests g left join responses r on r.guest_id = g.id where ${where.join(' and ')}`;
  const total = Number(one(db, `select count(*) c ${from}`, ...params)?.c ?? 0);
  const rows = all(
    db,
    `select g.*, r.attending, r.party_size ${from} order by g.name collate nocase limit ? offset ?`,
    ...params, query.pageSize, (query.page - 1) * query.pageSize,
  );
  return { total, rows };
}

export const countGuests = (db: Db, eventId: number) => Number(one(db, 'select count(*) c from guests where event_id = ?', eventId)?.c ?? 0);
export const getGuest = (db: Db, id: number) => one(db, 'select * from guests where id = ?', id);
export const guestByEmail = (db: Db, eventId: number, email: string) =>
  one(db, 'select * from guests where event_id = ? and email = ?', eventId, email);

export function insertGuest(db: Db, eventId: number, g: GuestInput, now: string): number {
  return Number(
    run(
      db,
      'insert into guests (event_id, name, email, group_name, plus_ones, token, code, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)',
      eventId, g.name, g.email, g.group, g.plusOnes, randomUUID(), generateCode(), now,
    ).lastInsertRowid,
  );
}

export function updateGuest(db: Db, id: number, g: GuestInput) {
  run(db, 'update guests set name = ?, email = ?, group_name = ?, plus_ones = ? where id = ?', g.name, g.email, g.group, g.plusOnes, id);
}

export function deleteGuests(db: Db, eventId: number, ids: number[]): number {
  let n = 0;
  for (const id of ids) n += Number(run(db, 'delete from guests where id = ? and event_id = ?', id, eventId).changes);
  return n;
}

export const guestByToken = (db: Db, token: string) => one(db, 'select * from guests where token = ?', token);
export const guestByCode = (db: Db, code: string) => one(db, 'select * from guests where code = ?', code);

// ---- page ------------------------------------------------------------------

export const getPage = (db: Db, eventId: number) => one(db, 'select * from pages where event_id = ?', eventId);

export function saveDraft(db: Db, eventId: number, blocks: Block[], now: string) {
  run(db, 'update pages set draft = ?, draft_saved_at = ? where event_id = ?', JSON.stringify(blocks), now, eventId);
}

export function publishDraft(db: Db, eventId: number, now: string) {
  run(db, 'update pages set published = draft, published_at = ? where event_id = ?', now, eventId);
  run(db, "update events set status = 'Published' where id = ?", eventId);
}

export function discardDraft(db: Db, eventId: number) {
  run(db, "update pages set draft = coalesce(published, '[]') where event_id = ?", eventId);
}

// ---- emails ----------------------------------------------------------------

export interface NewEmail {
  kind: string;
  audience: string;
  subject: string;
  sendAt: string;
  status: string;
  recipients: number;
  senderName: string;
  replyTo: string;
}

export function insertEmail(db: Db, eventId: number, e: NewEmail): number {
  return Number(
    run(
      db,
      'insert into emails (event_id, kind, audience, subject, send_at, status, recipients, sender_name, reply_to) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      eventId, e.kind, e.audience, e.subject, e.sendAt, e.status, e.recipients, e.senderName, e.replyTo,
    ).lastInsertRowid,
  );
}

export const listEmails = (db: Db, eventId: number) => all(db, 'select * from emails where event_id = ? order by send_at, id', eventId);
export const getEmail = (db: Db, id: number) => one(db, 'select * from emails where id = ?', id);

export const countNonResponders = (db: Db, eventId: number) =>
  Number(one(db, 'select count(*) c from guests g left join responses r on r.guest_id = g.id where g.event_id = ? and r.guest_id is null', eventId)?.c ?? 0);

// ---- responses -------------------------------------------------------------

export const getResponse = (db: Db, guestId: number) => one(db, 'select * from responses where guest_id = ?', guestId);

/** Upsert keyed by guest, so a double submit stores one row (L2-042 AC2). */
export function saveResponse(db: Db, guestId: number, r: Reply, now: string) {
  run(
    db,
    `insert into responses (guest_id, attending, party_size, meal, guest_names, dietary, song, message, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(guest_id) do update set attending = excluded.attending, party_size = excluded.party_size, meal = excluded.meal,
       guest_names = excluded.guest_names, dietary = excluded.dietary, song = excluded.song, message = excluded.message, updated_at = excluded.updated_at`,
    guestId, r.attending ? 1 : 0, r.partySize, r.meal, JSON.stringify(r.guestNames), r.dietary, r.song, r.message, now,
  );
}

export interface ResponseQuery {
  q?: string;
  status?: 'attending' | 'declined' | 'waiting';
  page: number;
  pageSize: number;
}

export function listResponses(db: Db, eventId: number, query: ResponseQuery) {
  const where = ['g.event_id = ?'];
  const params: (string | number)[] = [eventId];
  if (query.q) {
    where.push('lower(g.name) like ?');
    params.push(`%${query.q.toLowerCase()}%`);
  }
  if (query.status === 'attending') where.push('r.attending = 1');
  if (query.status === 'declined') where.push('r.attending = 0');
  const from = `from responses r join guests g on g.id = r.guest_id where ${where.join(' and ')}`;
  const total = Number(one(db, `select count(*) c ${from}`, ...params)?.c ?? 0);
  const rows = all(
    db,
    `select g.name guest, r.* ${from} order by r.updated_at desc, r.guest_id desc limit ? offset ?`,
    ...params, query.pageSize, (query.page - 1) * query.pageSize,
  );
  return { total, rows };
}

export function responseTotals(db: Db, eventId: number) {
  const base = 'from responses r join guests g on g.id = r.guest_id where g.event_id = ?';
  const attending = Number(one(db, `select count(*) c ${base} and r.attending = 1`, eventId)?.c ?? 0);
  const declined = Number(one(db, `select count(*) c ${base} and r.attending = 0`, eventId)?.c ?? 0);
  const guestsComing = Number(one(db, `select coalesce(sum(r.party_size), 0) c ${base} and r.attending = 1`, eventId)?.c ?? 0);
  const meals = all(db, `select r.meal meal, sum(r.party_size) n ${base} and r.attending = 1 and r.meal is not null group by r.meal`, eventId);
  const invitees = countGuests(db, eventId);
  return {
    attending,
    declined,
    waiting: invitees - attending - declined,
    guestsComing,
    meals: Object.fromEntries(meals.map((m) => [String(m.meal), Number(m.n)])),
  };
}
