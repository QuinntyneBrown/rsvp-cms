import { randomBytes, randomUUID } from 'node:crypto';
import { generateCode } from '../domain/code.js';
import type { Block } from '../domain/blocks.js';
import type { NewEvent } from '../domain/events.js';
import type { GuestInput } from '../domain/guests.js';
import type { Reply } from '../domain/rsvp.js';
import type { Db } from './db.js';
import { Prisma } from './generated/client.js';

/** Dates are stored as Postgres `date` and handled as 'YYYY-MM-DD' strings everywhere else. */
export const toDay = (d: Date) => d.toISOString().slice(0, 10);
export const fromDay = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** True when a write failed on a unique constraint, e.g. two requests racing to add the same email. */
export const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

export type ReplyStatus = 'attending' | 'declined' | 'waiting';

// ---- organisers & sessions -------------------------------------------------

export interface OrganiserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  passwordVersion: number;
}

export const findOrganiserByEmail = (db: Db, email: string): Promise<OrganiserRecord | null> =>
  db.organiser.findUnique({ where: { email: email.toLowerCase() } });

export const findOrganiserById = (db: Db, id: number): Promise<OrganiserRecord | null> => db.organiser.findUnique({ where: { id } });

export async function createOrganiser(db: Db, email: string, name: string, passwordHash: string): Promise<number> {
  const row = await db.organiser.create({ data: { email: email.toLowerCase(), name, passwordHash } });
  return row.id;
}

/**
 * Changing the password bumps its version, which ends every session minted under the old one (L2-005 AC3).
 * The old rows stay until their next request, so that device is told "Your session ended" rather than a bare 401.
 */
export async function setPassword(db: Db, id: number, hash: string): Promise<number> {
  const row = await db.organiser.update({ where: { id }, data: { passwordHash: hash, passwordVersion: { increment: 1 } } });
  return row.passwordVersion;
}

export interface SessionRecord {
  id: string;
  organiserId: number;
  passwordVersion: number;
  lastSeen: number;
  expiresAt: number | null;
}

export async function createSession(db: Db, organiserId: number, passwordVersion: number, now: number, expiresAt: number | null): Promise<string> {
  const id = randomBytes(32).toString('hex');
  await db.session.create({
    data: { id, organiserId, passwordVersion, lastSeen: new Date(now), expiresAt: expiresAt === null ? null : new Date(expiresAt) },
  });
  return id;
}

export async function findSession(db: Db, id: string): Promise<SessionRecord | null> {
  const s = await db.session.findUnique({ where: { id } });
  return s && { ...s, lastSeen: s.lastSeen.getTime(), expiresAt: s.expiresAt?.getTime() ?? null };
}

export async function touchSession(db: Db, id: string, now: number) {
  await db.session.updateMany({ where: { id }, data: { lastSeen: new Date(now) } });
}

export async function deleteSession(db: Db, id: string) {
  await db.session.deleteMany({ where: { id } });
}

// ---- events ----------------------------------------------------------------

export interface EventRecord {
  id: number;
  organiserId: number;
  type: string;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  status: string;
  inviteOpen: string;
  inviteClose: string;
}

type EventRow = Awaited<ReturnType<Db['event']['findUniqueOrThrow']>>;

const eventRecord = (e: EventRow): EventRecord => ({
  id: e.id,
  organiserId: e.organiserId,
  type: e.type,
  name: e.name,
  date: toDay(e.date),
  startTime: e.startTime,
  venue: e.venue,
  status: e.status,
  inviteOpen: toDay(e.inviteOpen),
  inviteClose: toDay(e.inviteClose),
});

/** A new event takes replies from today until its date, and starts with an empty draft page. */
export async function createEvent(db: Db, organiserId: number, e: NewEvent, today: string): Promise<number> {
  const row = await db.event.create({
    data: {
      organiserId,
      type: e.type,
      name: e.name,
      date: fromDay(e.date),
      startTime: e.startTime,
      venue: e.venue,
      inviteOpen: fromDay(today),
      inviteClose: fromDay(e.date),
      page: { create: {} },
    },
  });
  return row.id;
}

export async function listEvents(db: Db, organiserId: number): Promise<EventRecord[]> {
  const rows = await db.event.findMany({ where: { organiserId }, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
  return rows.map(eventRecord);
}

export async function getEvent(db: Db, id: number): Promise<EventRecord | null> {
  if (!Number.isSafeInteger(id)) return null;
  const row = await db.event.findUnique({ where: { id } });
  return row && eventRecord(row);
}

export async function deleteEvent(db: Db, id: number) {
  await db.event.deleteMany({ where: { id } });
}

// ---- guests ----------------------------------------------------------------

export interface GuestRecord {
  id: number;
  eventId: number;
  name: string;
  email: string;
  group: string;
  plusOnes: number;
  token: string;
  code: string;
}

export interface GuestListRow extends GuestRecord {
  status: ReplyStatus;
  partySize: number | null;
  /** The later of the guest's own edit and their reply. */
  updatedAt: string;
}

type GuestRow = Awaited<ReturnType<Db['guest']['findUniqueOrThrow']>>;

const guestRecord = (g: GuestRow): GuestRecord => ({
  id: g.id,
  eventId: g.eventId,
  name: g.name,
  email: g.email,
  group: g.groupName,
  plusOnes: g.plusOnes,
  token: g.token,
  code: g.code,
});

export const statusOf = (r: { attending: boolean } | null | undefined): ReplyStatus =>
  !r ? 'waiting' : r.attending ? 'attending' : 'declined';

const replyFilter = (status: ReplyStatus | undefined): Prisma.GuestWhereInput =>
  status === 'attending' ? { response: { is: { attending: true } } }
    : status === 'declined' ? { response: { is: { attending: false } } }
      : status === 'waiting' ? { response: { is: null } }
        : {};

export interface ListQuery {
  q?: string;
  status?: ReplyStatus;
  page: number;
  pageSize: number;
}

export async function listGuests(db: Db, eventId: number, query: ListQuery) {
  const where: Prisma.GuestWhereInput = {
    eventId,
    ...replyFilter(query.status),
    ...(query.q
      ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] }
      : {}),
  };
  const [total, rows] = await db.$transaction([
    db.guest.count({ where }),
    db.guest.findMany({
      where,
      include: { response: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    total,
    rows: rows.map((g): GuestListRow => ({
      ...guestRecord(g),
      status: statusOf(g.response),
      partySize: g.response?.attending ? g.response.partySize : null,
      updatedAt: new Date(Math.max(g.updatedAt.getTime(), g.response?.updatedAt.getTime() ?? 0)).toISOString(),
    })),
  };
}

export const countGuests = (db: Db, eventId: number) => db.guest.count({ where: { eventId } });

export async function getGuest(db: Db, id: number): Promise<GuestRecord | null> {
  if (!Number.isSafeInteger(id)) return null;
  const g = await db.guest.findUnique({ where: { id } });
  return g && guestRecord(g);
}

export async function guestByEmail(db: Db, eventId: number, email: string): Promise<GuestRecord | null> {
  const g = await db.guest.findUnique({ where: { eventId_email: { eventId, email: email.toLowerCase() } } });
  return g && guestRecord(g);
}

/** Each guest gets a random personal-link token and a short invitation code (L2-033). */
export async function insertGuest(db: Db, eventId: number, g: GuestInput, now: number): Promise<number> {
  const at = new Date(now);
  const row = await db.guest.create({
    data: { eventId, name: g.name, email: g.email, groupName: g.group, plusOnes: g.plusOnes, token: randomUUID(), code: generateCode(), createdAt: at, updatedAt: at },
  });
  return row.id;
}

export async function updateGuest(db: Db, id: number, g: GuestInput, now: number) {
  await db.guest.update({ where: { id }, data: { name: g.name, email: g.email, groupName: g.group, plusOnes: g.plusOnes, updatedAt: new Date(now) } });
}

/** Removing a guest cascades to their reply and their pending deliveries (L2-023 AC2). */
export async function deleteGuests(db: Db, eventId: number, ids: number[]): Promise<number> {
  const safe = ids.filter(Number.isSafeInteger);
  const res = await db.guest.deleteMany({ where: { eventId, id: { in: safe } } });
  return res.count;
}

export async function guestByToken(db: Db, token: string): Promise<GuestRecord | null> {
  const g = await db.guest.findUnique({ where: { token } });
  return g && guestRecord(g);
}

export async function guestByCode(db: Db, code: string): Promise<GuestRecord | null> {
  const g = await db.guest.findUnique({ where: { code } });
  return g && guestRecord(g);
}

// ---- page ------------------------------------------------------------------

export interface PageRecord {
  draft: Block[];
  published: Block[] | null;
  draftSavedAt: string | null;
  publishedAt: string | null;
}

export async function getPage(db: Db, eventId: number): Promise<PageRecord> {
  const p = await db.page.upsert({ where: { eventId }, create: { eventId }, update: {} });
  return {
    draft: p.draft as unknown as Block[],
    published: (p.published ?? null) as unknown as Block[] | null,
    draftSavedAt: p.draftSavedAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
  };
}

export async function saveDraft(db: Db, eventId: number, blocks: Block[], now: number) {
  const draft = blocks as unknown as Prisma.InputJsonValue;
  await db.page.upsert({ where: { eventId }, create: { eventId, draft, draftSavedAt: new Date(now) }, update: { draft, draftSavedAt: new Date(now) } });
}

/** Publishing copies the draft and marks the event Published in one transaction, so a failure changes nothing (L2-015 AC4). */
export async function publishDraft(db: Db, eventId: number, blocks: Block[], now: number) {
  const json = blocks as unknown as Prisma.InputJsonValue;
  await db.$transaction([
    db.page.update({ where: { eventId }, data: { draft: json, published: json, publishedAt: new Date(now) } }),
    db.event.update({ where: { id: eventId }, data: { status: 'Published' } }),
  ]);
}

export async function discardDraft(db: Db, eventId: number) {
  const page = await getPage(db, eventId);
  await db.page.update({ where: { eventId }, data: { draft: (page.published ?? []) as unknown as Prisma.InputJsonValue } });
}

// ---- emails ----------------------------------------------------------------

export interface NewEmail {
  kind: string;
  audience: 'all' | 'non-responders';
  subject: string;
  sendAt: string; // YYYY-MM-DDTHH:MM wall-clock
  recipients: number;
  senderName: string;
  replyTo: string;
}

export interface EmailRecord {
  id: number;
  eventId: number;
  kind: string;
  audience: 'all' | 'non-responders';
  subject: string;
  sendAt: string;
  status: string;
  recipients: number;
  senderName: string;
  replyTo: string;
}

type EmailRow = Awaited<ReturnType<Db['email']['findUniqueOrThrow']>>;

export const toWallClock = (d: Date) => d.toISOString().slice(0, 16);
export const fromWallClock = (s: string) => new Date(`${s}:00.000Z`);

export const emailRecord = (e: EmailRow): EmailRecord => ({
  id: e.id,
  eventId: e.eventId,
  kind: e.kind,
  audience: e.audience === 'non-responders' ? 'non-responders' : 'all',
  subject: e.subject,
  sendAt: toWallClock(e.sendAt),
  status: e.status,
  recipients: e.recipients,
  senderName: e.senderName,
  replyTo: e.replyTo,
});

export async function insertEmail(db: Db, eventId: number, e: NewEmail): Promise<number> {
  const row = await db.email.create({
    data: { eventId, kind: e.kind, audience: e.audience, subject: e.subject, sendAt: fromWallClock(e.sendAt), recipients: e.recipients, senderName: e.senderName, replyTo: e.replyTo },
  });
  return row.id;
}

export async function listEmails(db: Db, eventId: number): Promise<EmailRecord[]> {
  const rows = await db.email.findMany({ where: { eventId }, orderBy: [{ sendAt: 'asc' }, { id: 'asc' }] });
  return rows.map(emailRecord);
}

export async function getEmail(db: Db, id: number): Promise<EmailRecord | null> {
  if (!Number.isSafeInteger(id)) return null;
  const e = await db.email.findUnique({ where: { id } });
  return e && emailRecord(e);
}

export const countNonResponders = (db: Db, eventId: number) => db.guest.count({ where: { eventId, response: { is: null } } });

// ---- responses -------------------------------------------------------------

export interface ResponseRecord extends Reply {
  guestId: number;
  updatedAt: string;
}

type ResponseRow = Awaited<ReturnType<Db['response']['findUniqueOrThrow']>>;

const responseRecord = (r: ResponseRow): ResponseRecord => ({
  guestId: r.guestId,
  attending: r.attending,
  partySize: r.partySize,
  meal: r.meal,
  guestNames: r.guestNames as string[],
  dietary: r.dietary,
  song: r.song,
  message: r.message,
  updatedAt: r.updatedAt.toISOString(),
});

export async function getResponse(db: Db, guestId: number): Promise<ResponseRecord | null> {
  const r = await db.response.findUnique({ where: { guestId } });
  return r && responseRecord(r);
}

/**
 * Upsert keyed by guest (a native INSERT ... ON CONFLICT), so a double submit stores one row (L2-042 AC2).
 * A reply also cancels this guest's pending emails meant only for people who have not replied (L2-032 AC2).
 */
export async function saveResponse(db: Db, guestId: number, r: Reply, now: number): Promise<ResponseRecord> {
  const data = {
    attending: r.attending,
    partySize: r.partySize,
    meal: r.meal,
    guestNames: r.guestNames,
    dietary: r.dietary,
    song: r.song,
    message: r.message,
    updatedAt: new Date(now),
  };
  const [row] = await db.$transaction([
    db.response.upsert({ where: { guestId }, create: { guestId, ...data }, update: data }),
    db.delivery.updateMany({
      where: { guestId, status: 'Pending', email: { audience: 'non-responders' } },
      data: { status: 'Cancelled' },
    }),
  ]);
  return responseRecord(row);
}

export interface ResponseListRow {
  guestId: number;
  guest: string;
  reply: ReplyStatus;
  guestsCount: number;
  meal: string | null;
  dietary: string;
  message: string;
  updatedAt: string | null;
}

/**
 * Replies, most recently updated first. The Waiting filter lists the guests who have not replied yet (L2-048 AC1).
 */
export async function listResponses(db: Db, eventId: number, query: ListQuery) {
  const nameFilter: Prisma.GuestWhereInput = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};
  const skip = (query.page - 1) * query.pageSize;

  if (query.status === 'waiting') {
    const where: Prisma.GuestWhereInput = { eventId, response: { is: null }, ...nameFilter };
    const [total, rows] = await db.$transaction([
      db.guest.count({ where }),
      db.guest.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: query.pageSize }),
    ]);
    return {
      total,
      rows: rows.map((g): ResponseListRow => ({ guestId: g.id, guest: g.name, reply: 'waiting', guestsCount: 0, meal: null, dietary: '', message: '', updatedAt: null })),
    };
  }

  const where: Prisma.ResponseWhereInput = {
    guest: { eventId, ...nameFilter },
    ...(query.status === 'attending' ? { attending: true } : query.status === 'declined' ? { attending: false } : {}),
  };
  const [total, rows] = await db.$transaction([
    db.response.count({ where }),
    db.response.findMany({ where, include: { guest: true }, orderBy: [{ updatedAt: 'desc' }, { guestId: 'desc' }], skip, take: query.pageSize }),
  ]);
  return {
    total,
    rows: rows.map((r): ResponseListRow => ({
      guestId: r.guestId,
      guest: r.guest.name,
      reply: statusOf(r),
      guestsCount: r.attending ? r.partySize : 0,
      meal: r.meal,
      dietary: r.dietary,
      message: r.message,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

/** Totals straight from the stored replies (L2-047 AC1). */
export async function responseTotals(db: Db, eventId: number) {
  const inEvent = { guest: { eventId } };
  const [attending, declined, coming, meals, invitees] = await db.$transaction([
    db.response.count({ where: { ...inEvent, attending: true } }),
    db.response.count({ where: { ...inEvent, attending: false } }),
    db.response.aggregate({ where: { ...inEvent, attending: true }, _sum: { partySize: true } }),
    db.response.groupBy({ by: ['meal'], where: { ...inEvent, attending: true, meal: { not: null } }, _sum: { partySize: true }, orderBy: { meal: 'asc' } }),
    db.guest.count({ where: { eventId } }),
  ]);
  return {
    attending,
    declined,
    waiting: invitees - attending - declined,
    guestsComing: coming._sum.partySize ?? 0,
    meals: Object.fromEntries(meals.map((m) => [String(m.meal), m._sum?.partySize ?? 0])),
  };
}
