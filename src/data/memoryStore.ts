import { randomBytes } from 'node:crypto';
import type { Block } from '../domain/blocks.js';
import { generateCode, generateToken } from '../domain/code.js';
import type { NewEvent } from '../domain/events.js';
import type { GuestInput } from '../domain/guests.js';
import type { SenderInput } from '../domain/invitations/schedule.js';
import type { Reply } from '../domain/rsvp.js';
import {
  DuplicateError, fromWallClock, idempotencyKey, LEASE_MS, statusOf, toWallClock,
  type Audience, type DeliveryChange, type DeliveryRecord, type DeliveryStatus, type EmailRecord, type EmailStatus,
  type EventRecord, type GuestListRow, type GuestRecord, type ListQuery, type NewEmail, type OrganiserRecord, type PageRecord,
  type ResponseListRow, type ResponseRecord, type ResponseTotals, type SendContext, type SessionRecord, type Store,
} from './store.js';

interface GuestRow extends GuestRecord { createdAt: number; updatedAt: number }
interface PageRow { draft: Block[]; published: Block[] | null; draftSavedAt: number | null; publishedAt: number | null }
interface ResponseRow extends Reply { guestId: number; updatedAt: number }
interface EmailRow {
  id: number; eventId: number; kind: string; audience: Audience; subject: string; sendAt: number; status: EmailStatus;
  recipients: number; senderName: string; replyTo: string; lockedUntil: number | null; sentAt: number | null;
}
interface DeliveryRow {
  id: number; emailId: number; guestId: number; status: DeliveryStatus; idempotencyKey: string; attempts: number;
  nextAttemptAt: number | null; lastError: string | null; sentAt: number | null;
}

const copy = <T>(v: T): T => structuredClone(v);
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const byName = (a: { name: string; id: number }, b: { name: string; id: number }) => a.name.localeCompare(b.name) || a.id - b.id;
const page = <T>(rows: T[], q: ListQuery) => rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

/**
 * An in-memory Store with the same behaviour as PrismaStore, used by every automated test so that
 * no test needs a database. Each method finishes its work before it yields, so concurrent calls
 * cannot interleave, just as the database's unique indexes and conditional updates guarantee.
 * The tables are public so tests can arrange and inspect state directly.
 */
export class MemoryStore implements Store {
  readonly organisers = new Map<number, OrganiserRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly events = new Map<number, EventRecord>();
  readonly pages = new Map<number, PageRow>();
  readonly guests = new Map<number, GuestRow>();
  readonly responses = new Map<number, ResponseRow>();
  readonly emails = new Map<number, EmailRow>();
  readonly deliveries = new Map<number, DeliveryRow>();
  private seq = 0;
  private readonly next = () => ++this.seq;

  // ---- organisers & sessions -----------------------------------------------

  async findOrganiserByEmail(email: string) {
    const o = [...this.organisers.values()].find((x) => x.email === email.toLowerCase());
    return o ? copy(o) : null;
  }

  async findOrganiserById(id: number) {
    const o = this.organisers.get(id);
    return o ? copy(o) : null;
  }

  async createOrganiser(email: string, name: string, passwordHash: string) {
    const lower = email.toLowerCase();
    if ([...this.organisers.values()].some((o) => o.email === lower)) throw new DuplicateError('email');
    const id = this.next();
    this.organisers.set(id, { id, email: lower, name, passwordHash, passwordVersion: 1, passwordChangedAt: null });
    return id;
  }

  async setPassword(id: number, hash: string, now: number) {
    const o = this.organisers.get(id);
    if (!o) throw new Error(`No organiser ${id}`);
    o.passwordHash = hash;
    o.passwordVersion += 1;
    o.passwordChangedAt = now;
    return o.passwordVersion;
  }

  async createSession(organiserId: number, passwordVersion: number, now: number, expiresAt: number | null) {
    const id = randomBytes(32).toString('hex');
    this.sessions.set(id, { id, organiserId, passwordVersion, lastSeen: now, expiresAt });
    return id;
  }

  async findSession(id: string) {
    const s = this.sessions.get(id);
    return s ? copy(s) : null;
  }

  async touchSession(id: string, now: number) {
    const s = this.sessions.get(id);
    if (s) s.lastSeen = now;
  }

  async deleteSession(id: string) {
    this.sessions.delete(id);
  }

  // ---- events & pages ------------------------------------------------------

  async createEvent(organiserId: number, e: NewEvent, today: string, _now?: number) {
    const id = this.next();
    this.events.set(id, { id, organiserId, type: e.type, name: e.name, date: e.date, startTime: e.startTime, venue: e.venue, status: 'Draft', inviteOpen: today, inviteClose: e.date, senderName: '', replyTo: '', linkEpoch: 0 });
    this.pages.set(id, { draft: [], published: null, draftSavedAt: null, publishedAt: null });
    return id;
  }

  async listEvents(organiserId: number) {
    return [...this.events.values()]
      .filter((e) => e.organiserId === organiserId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .map(copy);
  }

  async getEvent(id: number) {
    const e = this.events.get(id);
    return e ? copy(e) : null;
  }

  async updateSender(eventId: number, sender: SenderInput, _now?: number) {
    const e = this.events.get(eventId);
    if (e) Object.assign(e, sender);
  }

  async regenerateLinks(eventId: number, _now?: number) {
    const e = this.events.get(eventId);
    if (e) e.linkEpoch++;
  }

  async deleteEvent(id: number) {
    this.events.delete(id);
    this.pages.delete(id);
    this.removeGuests([...this.guests.values()].filter((g) => g.eventId === id).map((g) => g.id));
    for (const [emailId, e] of this.emails) {
      if (e.eventId !== id) continue;
      this.emails.delete(emailId);
      for (const [dId, d] of this.deliveries) if (d.emailId === emailId) this.deliveries.delete(dId);
    }
  }

  private pageRow(eventId: number): PageRow {
    let p = this.pages.get(eventId);
    if (!p) this.pages.set(eventId, (p = { draft: [], published: null, draftSavedAt: null, publishedAt: null }));
    return p;
  }

  async getPage(eventId: number): Promise<PageRecord> {
    const p = this.pageRow(eventId);
    return { draft: copy(p.draft), published: copy(p.published), draftSavedAt: iso(p.draftSavedAt), publishedAt: iso(p.publishedAt) };
  }

  async saveDraft(eventId: number, blocks: Block[], now: number) {
    const p = this.pageRow(eventId);
    p.draft = copy(blocks);
    p.draftSavedAt = now;
  }

  async publishDraft(eventId: number, blocks: Block[], now: number) {
    const event = this.events.get(eventId);
    if (!event) throw new Error(`No event ${eventId}`);
    const p = this.pageRow(eventId);
    p.draft = copy(blocks);
    p.published = copy(blocks);
    p.publishedAt = now;
    event.status = 'Published';
  }

  async discardDraft(eventId: number) {
    const p = this.pageRow(eventId);
    p.draft = copy(p.published ?? []);
  }

  // ---- guests --------------------------------------------------------------

  private guestsOf(eventId: number) {
    return [...this.guests.values()].filter((g) => g.eventId === eventId);
  }

  private matchesReply(guestId: number, status: ListQuery['status']) {
    return !status || statusOf(this.responses.get(guestId)) === status;
  }

  async listGuests(eventId: number, query: ListQuery) {
    const q = query.q?.toLowerCase();
    const rows = this.guestsOf(eventId)
      .filter((g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q))
      .filter((g) => this.matchesReply(g.id, query.status))
      .sort(byName);
    return {
      total: rows.length,
      rows: page(rows, query).map((g): GuestListRow => {
        const r = this.responses.get(g.id);
        return {
          ...this.guestRecord(g),
          status: statusOf(r),
          partySize: !r ? g.plusOnes + 1 : r.attending ? r.partySize : 0,
          updatedAt: new Date(Math.max(g.updatedAt, r?.updatedAt ?? 0)).toISOString(),
        };
      }),
    };
  }

  async countGuests(eventId: number) {
    return this.guestsOf(eventId).length;
  }

  async guestEmails(eventId: number) {
    return this.guestsOf(eventId).map((g) => g.email);
  }

  async countNonResponders(eventId: number) {
    return this.guestsOf(eventId).filter((g) => !this.responses.has(g.id)).length;
  }

  private guestRecord(g: GuestRow): GuestRecord {
    return { id: g.id, eventId: g.eventId, name: g.name, email: g.email, group: g.group, plusOnes: g.plusOnes, token: g.token, code: g.code, linkEpoch: g.linkEpoch };
  }

  private findGuest(pred: (g: GuestRow) => boolean) {
    const g = [...this.guests.values()].find(pred);
    return g ? this.guestRecord(g) : null;
  }

  async getGuest(id: number) {
    const g = this.guests.get(id);
    return g ? this.guestRecord(g) : null;
  }

  async guestByEmail(eventId: number, email: string) {
    return this.findGuest((g) => g.eventId === eventId && g.email === email.toLowerCase());
  }

  async guestByToken(token: string) {
    return this.findGuest((g) => g.token === token);
  }

  async guestByCode(code: string) {
    return this.findGuest((g) => g.code === code);
  }

  private assertEmailFree(eventId: number, email: string, exceptId?: number) {
    if (this.guestsOf(eventId).some((g) => g.email === email && g.id !== exceptId)) throw new DuplicateError('email');
  }

  async insertGuest(eventId: number, g: GuestInput, now: number) {
    this.assertEmailFree(eventId, g.email);
    const id = this.next();
    this.guests.set(id, { id, eventId, name: g.name, email: g.email, group: g.group, plusOnes: g.plusOnes, token: generateToken(), code: generateCode(), linkEpoch: this.events.get(eventId)?.linkEpoch ?? 0, createdAt: now, updatedAt: now });
    return id;
  }

  async reissueLink(guestId: number, epoch: number) {
    const row = this.guests.get(guestId);
    if (!row) throw new Error(`No guest ${guestId}`);
    Object.assign(row, { token: generateToken(), code: generateCode(), linkEpoch: epoch });
    return { token: row.token, code: row.code };
  }

  async updateGuest(id: number, g: GuestInput, now: number) {
    const row = this.guests.get(id);
    if (!row) throw new Error(`No guest ${id}`);
    this.assertEmailFree(row.eventId, g.email, id);
    Object.assign(row, { name: g.name, email: g.email, group: g.group, plusOnes: g.plusOnes, updatedAt: now });
  }

  private removeGuests(ids: number[]) {
    for (const id of ids) {
      this.guests.delete(id);
      this.responses.delete(id);
      for (const [dId, d] of this.deliveries) if (d.guestId === id) this.deliveries.delete(dId);
    }
  }

  async deleteGuests(eventId: number, ids: number[]) {
    const mine = ids.filter((id) => this.guests.get(id)?.eventId === eventId);
    this.removeGuests(mine);
    return mine.length;
  }

  // ---- replies -------------------------------------------------------------

  private responseRecord(r: ResponseRow): ResponseRecord {
    return { ...copy(r), updatedAt: new Date(r.updatedAt).toISOString() };
  }

  async getResponse(guestId: number) {
    const r = this.responses.get(guestId);
    return r ? this.responseRecord(r) : null;
  }

  async saveResponse(guestId: number, r: Reply, now: number) {
    if (!this.guests.has(guestId)) throw new Error(`No guest ${guestId}`);
    const row: ResponseRow = { ...copy(r), guestId, updatedAt: now };
    this.responses.set(guestId, row);
    for (const d of this.deliveries.values()) {
      if (d.guestId === guestId && d.status === 'Pending' && this.emails.get(d.emailId)?.audience === 'non-responders') d.status = 'Cancelled';
    }
    return this.responseRecord(row);
  }

  async listResponses(eventId: number, query: ListQuery) {
    const q = query.q?.toLowerCase();
    const guests = this.guestsOf(eventId).filter((g) => !q || g.name.toLowerCase().includes(q));

    if (query.status === 'waiting') {
      const rows = guests.filter((g) => !this.responses.has(g.id)).sort(byName);
      return {
        total: rows.length,
        rows: page(rows, query).map((g): ResponseListRow => ({ guestId: g.id, guest: g.name, reply: 'waiting', guestsCount: 0, meal: null, dietary: '', message: '', updatedAt: null })),
      };
    }

    const names = new Map(guests.map((g) => [g.id, g.name]));
    const rows = [...this.responses.values()]
      .filter((r) => names.has(r.guestId) && this.matchesReply(r.guestId, query.status))
      .sort((a, b) => b.updatedAt - a.updatedAt || b.guestId - a.guestId);
    return {
      total: rows.length,
      rows: page(rows, query).map((r): ResponseListRow => ({
        guestId: r.guestId, guest: names.get(r.guestId)!, reply: statusOf(r), guestsCount: r.attending ? r.partySize : 0,
        meal: r.meal, dietary: r.dietary, message: r.message, updatedAt: new Date(r.updatedAt).toISOString(),
      })),
    };
  }

  async responseTotals(eventId: number): Promise<ResponseTotals> {
    const guests = this.guestsOf(eventId);
    const replies = guests.map((g) => this.responses.get(g.id)).filter((r): r is ResponseRow => Boolean(r));
    const yes = replies.filter((r) => r.attending);
    const meals: Record<string, number> = {};
    for (const r of yes) if (r.meal !== null) meals[r.meal] = (meals[r.meal] ?? 0) + r.partySize;
    return {
      attending: yes.length,
      declined: replies.length - yes.length,
      waiting: guests.length - replies.length,
      guestsComing: yes.reduce((n, r) => n + r.partySize, 0),
      meals: Object.fromEntries(Object.entries(meals).sort(([a], [b]) => a.localeCompare(b))),
    };
  }

  // ---- emails & the send queue ---------------------------------------------

  private emailRecord(e: EmailRow): EmailRecord {
    return {
      id: e.id, eventId: e.eventId, kind: e.kind, audience: e.audience, subject: e.subject, sendAt: toWallClock(e.sendAt),
      status: e.status, recipients: e.recipients, senderName: e.senderName, replyTo: e.replyTo,
    };
  }

  async insertEmail(eventId: number, e: NewEmail, _now?: number) {
    const id = this.next();
    this.emails.set(id, { ...e, id, eventId, sendAt: fromWallClock(e.sendAt), status: 'Scheduled', lockedUntil: null, sentAt: null });
    return id;
  }

  async listEmails(eventId: number) {
    return [...this.emails.values()]
      .filter((e) => e.eventId === eventId)
      .sort((a, b) => a.sendAt - b.sendAt || a.id - b.id)
      .map((e) => this.emailRecord(e));
  }

  async getEmail(id: number) {
    const e = this.emails.get(id);
    return e ? this.emailRecord(e) : null;
  }

  private claimable(e: EmailRow, now: number) {
    return (e.status === 'Scheduled' || e.status === 'Sending') && (e.lockedUntil === null || e.lockedUntil < now);
  }

  async dueEmailIds(now: number, limit = 20) {
    return [...this.emails.values()]
      .filter((e) => e.sendAt <= now && this.claimable(e, now))
      .sort((a, b) => a.sendAt - b.sendAt || a.id - b.id)
      .slice(0, limit)
      .map((e) => e.id);
  }

  async claimEmail(id: number, now: number) {
    const e = this.emails.get(id);
    if (!e || !this.claimable(e, now)) return false;
    e.status = 'Sending';
    e.lockedUntil = now + LEASE_MS;
    return true;
  }

  async sendContext(emailId: number): Promise<SendContext | null> {
    const e = this.emails.get(emailId);
    const event = e && this.events.get(e.eventId);
    const organiser = event && this.organisers.get(event.organiserId);
    if (!e || !event || !organiser) return null;
    return { email: this.emailRecord(e), event: { name: event.name, date: event.date, senderName: event.senderName, replyTo: event.replyTo, linkEpoch: event.linkEpoch }, organiserName: organiser.name };
  }

  async materialiseDeliveries(email: EmailRecord) {
    const existing = new Set([...this.deliveries.values()].filter((d) => d.emailId === email.id).map((d) => d.guestId));
    for (const g of this.guestsOf(email.eventId)) {
      if (existing.has(g.id) || (email.audience === 'non-responders' && this.responses.has(g.id))) continue;
      const id = this.next();
      this.deliveries.set(id, { id, emailId: email.id, guestId: g.id, status: 'Pending', idempotencyKey: idempotencyKey(email.id, g.id), attempts: 0, nextAttemptAt: null, lastError: null, sentAt: null });
    }
  }

  async dueDeliveries(emailId: number, now: number): Promise<DeliveryRecord[]> {
    return [...this.deliveries.values()]
      .filter((d) => d.emailId === emailId && d.status === 'Pending' && (d.nextAttemptAt === null || d.nextAttemptAt <= now))
      .sort((a, b) => a.id - b.id)
      .map((d) => {
        const g = this.guests.get(d.guestId)!;
        return {
          id: d.id, emailId: d.emailId, status: d.status, idempotencyKey: d.idempotencyKey, attempts: d.attempts,
          guest: { id: g.id, name: g.name, email: g.email, token: g.token, code: g.code, linkEpoch: g.linkEpoch, hasReplied: this.responses.has(g.id) },
        };
      });
  }

  async markDelivery(id: number, change: DeliveryChange) {
    const d = this.deliveries.get(id);
    if (!d) throw new Error(`No delivery ${id}`);
    d.status = change.status;
    if (change.attempts !== undefined) d.attempts = change.attempts;
    if (change.nextAttemptAt !== undefined) d.nextAttemptAt = change.nextAttemptAt;
    if (change.lastError !== undefined) d.lastError = change.lastError;
    if (change.sentAt !== undefined) d.sentAt = change.sentAt;
  }

  async settleEmail(emailId: number, now: number): Promise<EmailStatus> {
    const e = this.emails.get(emailId);
    if (!e) throw new Error(`No email ${emailId}`);
    const mine = [...this.deliveries.values()].filter((d) => d.emailId === emailId);
    const n = (s: DeliveryStatus) => mine.filter((d) => d.status === s).length;
    e.lockedUntil = null;
    if (n('Pending') > 0) return 'Sending';
    e.status = n('Failed') > 0 && n('Sent') === 0 ? 'Failed' : 'Sent';
    e.recipients = n('Sent');
    e.sentAt = now;
    return e.status;
  }
}
