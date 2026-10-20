import { randomBytes } from 'node:crypto';
import { generateCode, generateToken } from '../domain/code.js';
import type { Block } from '../domain/blocks.js';
import type { NewEvent } from '../domain/events.js';
import type { GuestInput } from '../domain/guests.js';
import type { Reply } from '../domain/rsvp.js';
import type { Db } from './db.js';
import { Prisma } from './generated/client.js';
import {
  DuplicateError, fromWallClock, idempotencyKey, LEASE_MS, statusOf, toWallClock,
  type DeliveryChange, type DeliveryRecord, type EmailRecord, type EmailStatus, type EventRecord, type GuestListRow,
  type GuestRecord, type ListQuery, type NewEmail, type OrganiserRecord, type PageRecord, type ResponseListRow,
  type ResponseRecord, type ResponseTotals, type SendContext, type SessionRecord, type Store,
} from './store.js';

/** Postgres `date` columns are handled as 'YYYY-MM-DD' strings everywhere else. */
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const fromDay = (s: string) => new Date(`${s}T00:00:00.000Z`);
const json = (v: unknown) => v as Prisma.InputJsonValue;

type EventRow = Awaited<ReturnType<Db['event']['findUniqueOrThrow']>>;
type GuestRow = Awaited<ReturnType<Db['guest']['findUniqueOrThrow']>>;
type EmailRow = Awaited<ReturnType<Db['email']['findUniqueOrThrow']>>;
type ResponseRow = Awaited<ReturnType<Db['response']['findUniqueOrThrow']>>;
type OrganiserRow = Awaited<ReturnType<Db['organiser']['findUniqueOrThrow']>>;

const organiserRecord = (o: OrganiserRow): OrganiserRecord => ({
  id: o.id,
  email: o.email,
  name: o.name,
  passwordHash: o.passwordHash,
  passwordVersion: o.passwordVersion,
  passwordChangedAt: o.passwordChangedAt?.getTime() ?? null,
});

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

const emailRecord = (e: EmailRow): EmailRecord => ({
  id: e.id,
  eventId: e.eventId,
  kind: e.kind,
  audience: e.audience === 'non-responders' ? 'non-responders' : 'all',
  subject: e.subject,
  sendAt: toWallClock(e.sendAt.getTime()),
  status: e.status,
  recipients: e.recipients,
  senderName: e.senderName,
  replyTo: e.replyTo,
});

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

const replyFilter = (status: ListQuery['status']): Prisma.GuestWhereInput =>
  status === 'attending' ? { response: { is: { attending: true } } }
    : status === 'declined' ? { response: { is: { attending: false } } }
      : status === 'waiting' ? { response: { is: null } }
        : {};

/** Unique-index conflicts become DuplicateError, so callers never see Prisma error codes. */
async function unique<T>(what: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new DuplicateError(what);
    throw e;
  }
}

/** The production store: PostgreSQL through Prisma. Each multi-row change runs in one transaction. */
export class PrismaStore implements Store {
  constructor(private readonly db: Db) {}

  // ---- organisers & sessions -----------------------------------------------

  async findOrganiserByEmail(email: string) {
    const o = await this.db.organiser.findUnique({ where: { email: email.toLowerCase() } });
    return o && organiserRecord(o);
  }

  async findOrganiserById(id: number) {
    const o = await this.db.organiser.findUnique({ where: { id } });
    return o && organiserRecord(o);
  }

  async createOrganiser(email: string, name: string, passwordHash: string) {
    const row = await unique('email', () => this.db.organiser.create({ data: { email: email.toLowerCase(), name, passwordHash } }));
    return row.id;
  }

  async setPassword(id: number, hash: string, now: number) {
    const row = await this.db.organiser.update({
      where: { id },
      data: { passwordHash: hash, passwordVersion: { increment: 1 }, passwordChangedAt: new Date(now) },
    });
    return row.passwordVersion;
  }

  async createSession(organiserId: number, passwordVersion: number, now: number, expiresAt: number | null) {
    const id = randomBytes(32).toString('hex');
    await this.db.session.create({
      data: { id, organiserId, passwordVersion, lastSeen: new Date(now), expiresAt: expiresAt === null ? null : new Date(expiresAt) },
    });
    return id;
  }

  async findSession(id: string): Promise<SessionRecord | null> {
    const s = await this.db.session.findUnique({ where: { id } });
    return s && { id: s.id, organiserId: s.organiserId, passwordVersion: s.passwordVersion, lastSeen: s.lastSeen.getTime(), expiresAt: s.expiresAt?.getTime() ?? null };
  }

  async touchSession(id: string, now: number) {
    await this.db.session.updateMany({ where: { id }, data: { lastSeen: new Date(now) } });
  }

  async deleteSession(id: string) {
    await this.db.session.deleteMany({ where: { id } });
  }

  // ---- events & pages ------------------------------------------------------

  async createEvent(organiserId: number, e: NewEvent, today: string, now: number) {
    const at = new Date(now);
    const row = await this.db.event.create({
      data: {
        organiserId, type: e.type, name: e.name, date: fromDay(e.date), startTime: e.startTime, venue: e.venue,
        inviteOpen: fromDay(today), inviteClose: fromDay(e.date), createdAt: at, updatedAt: at, page: { create: {} },
      },
    });
    return row.id;
  }

  async listEvents(organiserId: number) {
    const rows = await this.db.event.findMany({ where: { organiserId }, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
    return rows.map(eventRecord);
  }

  async getEvent(id: number) {
    if (!Number.isSafeInteger(id)) return null;
    const row = await this.db.event.findUnique({ where: { id } });
    return row && eventRecord(row);
  }

  async deleteEvent(id: number) {
    await this.db.event.deleteMany({ where: { id } });
  }

  async getPage(eventId: number): Promise<PageRecord> {
    const p = await this.db.page.upsert({ where: { eventId }, create: { eventId }, update: {} });
    return {
      draft: p.draft as unknown as Block[],
      published: (p.published ?? null) as unknown as Block[] | null,
      draftSavedAt: p.draftSavedAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    };
  }

  async saveDraft(eventId: number, blocks: Block[], now: number) {
    const data = { draft: json(blocks), draftSavedAt: new Date(now) };
    await this.db.page.upsert({ where: { eventId }, create: { eventId, ...data }, update: data });
  }

  async publishDraft(eventId: number, blocks: Block[], now: number) {
    await this.db.$transaction([
      this.db.page.update({ where: { eventId }, data: { draft: json(blocks), published: json(blocks), publishedAt: new Date(now) } }),
      this.db.event.update({ where: { id: eventId }, data: { status: 'Published' } }),
    ]);
  }

  async discardDraft(eventId: number) {
    const page = await this.getPage(eventId);
    await this.db.page.update({ where: { eventId }, data: { draft: json(page.published ?? []) } });
  }

  // ---- guests --------------------------------------------------------------

  async listGuests(eventId: number, query: ListQuery) {
    const where: Prisma.GuestWhereInput = {
      eventId,
      ...replyFilter(query.status),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    const [total, rows] = await this.db.$transaction([
      this.db.guest.count({ where }),
      this.db.guest.findMany({
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
        partySize: !g.response ? g.plusOnes + 1 : g.response.attending ? g.response.partySize : 0,
        updatedAt: new Date(Math.max(g.updatedAt.getTime(), g.response?.updatedAt.getTime() ?? 0)).toISOString(),
      })),
    };
  }

  countGuests(eventId: number) {
    return this.db.guest.count({ where: { eventId } });
  }

  countNonResponders(eventId: number) {
    return this.db.guest.count({ where: { eventId, response: { is: null } } });
  }

  async getGuest(id: number) {
    if (!Number.isSafeInteger(id)) return null;
    const g = await this.db.guest.findUnique({ where: { id } });
    return g && guestRecord(g);
  }

  async guestByEmail(eventId: number, email: string) {
    const g = await this.db.guest.findUnique({ where: { eventId_email: { eventId, email: email.toLowerCase() } } });
    return g && guestRecord(g);
  }

  async guestByToken(token: string) {
    const g = await this.db.guest.findUnique({ where: { token } });
    return g && guestRecord(g);
  }

  async guestByCode(code: string) {
    const g = await this.db.guest.findUnique({ where: { code } });
    return g && guestRecord(g);
  }

  async insertGuest(eventId: number, g: GuestInput, now: number) {
    const at = new Date(now);
    const row = await unique('email', () =>
      this.db.guest.create({
        data: { eventId, name: g.name, email: g.email, groupName: g.group, plusOnes: g.plusOnes, token: generateToken(), code: generateCode(), createdAt: at, updatedAt: at },
      }),
    );
    return row.id;
  }

  async updateGuest(id: number, g: GuestInput, now: number) {
    await unique('email', () =>
      this.db.guest.update({ where: { id }, data: { name: g.name, email: g.email, groupName: g.group, plusOnes: g.plusOnes, updatedAt: new Date(now) } }),
    );
  }

  async deleteGuests(eventId: number, ids: number[]) {
    const res = await this.db.guest.deleteMany({ where: { eventId, id: { in: ids.filter(Number.isSafeInteger) } } });
    return res.count;
  }

  // ---- replies -------------------------------------------------------------

  async getResponse(guestId: number) {
    const r = await this.db.response.findUnique({ where: { guestId } });
    return r && responseRecord(r);
  }

  /** A native INSERT ... ON CONFLICT, so a double submit stores one row (L2-042 AC2). */
  async saveResponse(guestId: number, r: Reply, now: number) {
    const data = {
      attending: r.attending, partySize: r.partySize, meal: r.meal, guestNames: r.guestNames,
      dietary: r.dietary, song: r.song, message: r.message, updatedAt: new Date(now),
    };
    const [row] = await this.db.$transaction([
      this.db.response.upsert({ where: { guestId }, create: { guestId, ...data }, update: data }),
      this.db.delivery.updateMany({ where: { guestId, status: 'Pending', email: { audience: 'non-responders' } }, data: { status: 'Cancelled' } }),
    ]);
    return responseRecord(row);
  }

  async listResponses(eventId: number, query: ListQuery) {
    const nameFilter: Prisma.GuestWhereInput = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};
    const skip = (query.page - 1) * query.pageSize;

    if (query.status === 'waiting') {
      const where: Prisma.GuestWhereInput = { eventId, response: { is: null }, ...nameFilter };
      const [total, rows] = await this.db.$transaction([
        this.db.guest.count({ where }),
        this.db.guest.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: query.pageSize }),
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
    const [total, rows] = await this.db.$transaction([
      this.db.response.count({ where }),
      this.db.response.findMany({ where, include: { guest: true }, orderBy: [{ updatedAt: 'desc' }, { guestId: 'desc' }], skip, take: query.pageSize }),
    ]);
    return {
      total,
      rows: rows.map((r): ResponseListRow => ({
        guestId: r.guestId, guest: r.guest.name, reply: statusOf(r), guestsCount: r.attending ? r.partySize : 0,
        meal: r.meal, dietary: r.dietary, message: r.message, updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async responseTotals(eventId: number): Promise<ResponseTotals> {
    const inEvent = { guest: { eventId } };
    const [attending, declined, coming, meals, invitees] = await this.db.$transaction([
      this.db.response.count({ where: { ...inEvent, attending: true } }),
      this.db.response.count({ where: { ...inEvent, attending: false } }),
      this.db.response.aggregate({ where: { ...inEvent, attending: true }, _sum: { partySize: true } }),
      this.db.response.groupBy({ by: ['meal'], where: { ...inEvent, attending: true, meal: { not: null } }, _sum: { partySize: true }, orderBy: { meal: 'asc' } }),
      this.db.guest.count({ where: { eventId } }),
    ]);
    return {
      attending,
      declined,
      waiting: invitees - attending - declined,
      guestsComing: coming._sum.partySize ?? 0,
      meals: Object.fromEntries(meals.map((m) => [String(m.meal), m._sum?.partySize ?? 0])),
    };
  }

  // ---- emails & the send queue ---------------------------------------------

  async insertEmail(eventId: number, e: NewEmail, now: number) {
    const row = await this.db.email.create({
      data: {
        eventId, kind: e.kind, audience: e.audience, subject: e.subject, sendAt: new Date(fromWallClock(e.sendAt)),
        recipients: e.recipients, senderName: e.senderName, replyTo: e.replyTo, createdAt: new Date(now),
      },
    });
    return row.id;
  }

  async listEmails(eventId: number) {
    const rows = await this.db.email.findMany({ where: { eventId }, orderBy: [{ sendAt: 'asc' }, { id: 'asc' }] });
    return rows.map(emailRecord);
  }

  async getEmail(id: number) {
    if (!Number.isSafeInteger(id)) return null;
    const e = await this.db.email.findUnique({ where: { id } });
    return e && emailRecord(e);
  }

  async dueEmailIds(now: number, limit = 20) {
    const at = new Date(now);
    const rows = await this.db.email.findMany({
      where: { status: { in: ['Scheduled', 'Sending'] }, sendAt: { lte: at }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: at } }] },
      select: { id: true },
      orderBy: [{ sendAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  /** A conditional UPDATE: Postgres re-checks the lease under the row lock, so one instance wins. */
  async claimEmail(id: number, now: number) {
    const at = new Date(now);
    const res = await this.db.email.updateMany({
      where: { id, status: { in: ['Scheduled', 'Sending'] }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: at } }] },
      data: { status: 'Sending', lockedUntil: new Date(now + LEASE_MS) },
    });
    return res.count === 1;
  }

  async sendContext(emailId: number): Promise<SendContext | null> {
    const e = await this.db.email.findUnique({ where: { id: emailId }, include: { event: { include: { organiser: true } } } });
    if (!e) return null;
    return { email: emailRecord(e), event: { name: e.event.name, date: toDay(e.event.date) }, organiserName: e.event.organiser.name };
  }

  /** ON CONFLICT DO NOTHING keeps this safe to repeat after a crash. */
  async materialiseDeliveries(email: EmailRecord) {
    const guests = await this.db.guest.findMany({
      where: { eventId: email.eventId, ...(email.audience === 'non-responders' ? { response: { is: null } } : {}) },
      select: { id: true },
    });
    await this.db.delivery.createMany({
      data: guests.map((g) => ({ emailId: email.id, guestId: g.id, idempotencyKey: idempotencyKey(email.id, g.id) })),
      skipDuplicates: true,
    });
  }

  async dueDeliveries(emailId: number, now: number): Promise<DeliveryRecord[]> {
    const rows = await this.db.delivery.findMany({
      where: { emailId, status: 'Pending', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date(now) } }] },
      include: { guest: { include: { response: { select: { guestId: true } } } } },
      orderBy: { id: 'asc' },
    });
    return rows.map((d) => ({
      id: d.id, emailId: d.emailId, status: d.status, idempotencyKey: d.idempotencyKey, attempts: d.attempts,
      guest: { id: d.guest.id, name: d.guest.name, email: d.guest.email, token: d.guest.token, code: d.guest.code, hasReplied: Boolean(d.guest.response) },
    }));
  }

  async markDelivery(id: number, change: DeliveryChange) {
    await this.db.delivery.update({
      where: { id },
      data: {
        status: change.status,
        attempts: change.attempts,
        nextAttemptAt: change.nextAttemptAt === undefined ? undefined : change.nextAttemptAt === null ? null : new Date(change.nextAttemptAt),
        lastError: change.lastError,
        sentAt: change.sentAt === undefined ? undefined : new Date(change.sentAt),
      },
    });
  }

  async settleEmail(emailId: number, now: number): Promise<EmailStatus> {
    const counts = await this.db.delivery.groupBy({ by: ['status'], where: { emailId }, _count: { _all: true }, orderBy: { status: 'asc' } });
    const n = (s: string) => counts.find((c) => c.status === s)?._count?._all ?? 0;
    if (n('Pending') > 0) {
      await this.db.email.update({ where: { id: emailId }, data: { lockedUntil: null } });
      return 'Sending';
    }
    const status = n('Failed') > 0 && n('Sent') === 0 ? 'Failed' : 'Sent';
    await this.db.email.update({ where: { id: emailId }, data: { status, recipients: n('Sent'), sentAt: new Date(now), lockedUntil: null } });
    return status;
  }
}
