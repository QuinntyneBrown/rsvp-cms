import type { Block } from '../domain/blocks.js';
import type { NewEvent } from '../domain/events.js';
import type { GuestInput } from '../domain/guests.js';
import type { Reply } from '../domain/rsvp.js';

/**
 * Everything the API and the mail worker persist goes through this interface.
 * PrismaStore (PostgreSQL) backs the running application; MemoryStore backs the automated tests,
 * which never touch a real database. Times are epoch milliseconds, days are 'YYYY-MM-DD'.
 */
export interface Store {
  // organisers & sessions
  findOrganiserByEmail(email: string): Promise<OrganiserRecord | null>;
  findOrganiserById(id: number): Promise<OrganiserRecord | null>;
  createOrganiser(email: string, name: string, passwordHash: string): Promise<number>;
  /** Stores the new hash and bumps the password version, ending every session minted under the old one. Returns the new version. */
  setPassword(id: number, hash: string, now: number): Promise<number>;
  createSession(organiserId: number, passwordVersion: number, now: number, expiresAt: number | null): Promise<string>;
  findSession(id: string): Promise<SessionRecord | null>;
  touchSession(id: string, now: number): Promise<void>;
  deleteSession(id: string): Promise<void>;

  // events and their pages
  /** A new event takes replies from `today` until its date, and starts with an empty draft page. */
  createEvent(organiserId: number, e: NewEvent, today: string, now: number): Promise<number>;
  listEvents(organiserId: number): Promise<EventRecord[]>;
  getEvent(id: number): Promise<EventRecord | null>;
  /** Removes the event with its page, guests, emails, deliveries and replies. */
  deleteEvent(id: number): Promise<void>;
  getPage(eventId: number): Promise<PageRecord>;
  saveDraft(eventId: number, blocks: Block[], now: number): Promise<void>;
  /** Copies `blocks` to both draft and published and marks the event Published, all or nothing. */
  publishDraft(eventId: number, blocks: Block[], now: number): Promise<void>;
  /** Makes the draft match the last published version. */
  discardDraft(eventId: number): Promise<void>;

  // guests
  listGuests(eventId: number, query: ListQuery): Promise<{ total: number; rows: GuestListRow[] }>;
  countGuests(eventId: number): Promise<number>;
  countNonResponders(eventId: number): Promise<number>;
  getGuest(id: number): Promise<GuestRecord | null>;
  guestByEmail(eventId: number, email: string): Promise<GuestRecord | null>;
  guestByToken(token: string): Promise<GuestRecord | null>;
  guestByCode(code: string): Promise<GuestRecord | null>;
  /** Gives the guest a random personal-link token and an invitation code. Throws DuplicateError for an email already in the event. */
  insertGuest(eventId: number, g: GuestInput, now: number): Promise<number>;
  /** Throws DuplicateError for an email already used by another guest of the event. */
  updateGuest(id: number, g: GuestInput, now: number): Promise<void>;
  /** Removes guests of this event only, with their replies and their unsent deliveries. Returns how many were removed. */
  deleteGuests(eventId: number, ids: number[]): Promise<number>;

  // replies
  getResponse(guestId: number): Promise<ResponseRecord | null>;
  /** One reply per guest: a second save replaces the first. Also cancels the guest's pending "haven't replied" deliveries. */
  saveResponse(guestId: number, r: Reply, now: number): Promise<ResponseRecord>;
  listResponses(eventId: number, query: ListQuery): Promise<{ total: number; rows: ResponseListRow[] }>;
  responseTotals(eventId: number): Promise<ResponseTotals>;

  // emails and the send queue
  insertEmail(eventId: number, e: NewEmail, now: number): Promise<number>;
  listEmails(eventId: number): Promise<EmailRecord[]>;
  getEmail(id: number): Promise<EmailRecord | null>;
  /** Ids of emails due at `now` that no live worker holds. */
  dueEmailIds(now: number, limit?: number): Promise<number[]>;
  /** Takes a lease of LEASE_MS on the email if no other worker holds one. Only one caller can win. */
  claimEmail(id: number, now: number): Promise<boolean>;
  sendContext(emailId: number): Promise<SendContext | null>;
  /** Creates one Pending delivery per current recipient; repeating it adds nobody twice. */
  materialiseDeliveries(email: EmailRecord): Promise<void>;
  /** Pending deliveries whose next attempt is due. */
  dueDeliveries(emailId: number, now: number): Promise<DeliveryRecord[]>;
  markDelivery(id: number, change: DeliveryChange): Promise<void>;
  /** Releases the lease; once nothing is pending, marks the email Sent (or Failed if every delivery failed). */
  settleEmail(emailId: number, now: number): Promise<EmailStatus>;
}

/** How long a worker owns an email it is sending before another instance may take over. */
export const LEASE_MS = 5 * 60_000;

/** A write broke a uniqueness rule, e.g. two requests racing to add the same email. */
export class DuplicateError extends Error {
  constructor(what: string) {
    super(`Duplicate ${what}`);
    this.name = 'DuplicateError';
  }
}

export type ReplyStatus = 'attending' | 'declined' | 'waiting';
export type EmailStatus = 'Scheduled' | 'Sending' | 'Sent' | 'Failed';
export type DeliveryStatus = 'Pending' | 'Sent' | 'Failed' | 'Cancelled';
export type Audience = 'all' | 'non-responders';

export interface OrganiserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  passwordVersion: number;
  passwordChangedAt: number | null;
}

export interface SessionRecord {
  id: string;
  organiserId: number;
  passwordVersion: number;
  lastSeen: number;
  /** Null means the session ends with the browser session. */
  expiresAt: number | null;
}

export interface EventRecord {
  id: number;
  organiserId: number;
  type: string;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  /** Draft until the page is first published, then Published. */
  status: string;
  inviteOpen: string;
  inviteClose: string;
}

export interface PageRecord {
  draft: Block[];
  published: Block[] | null;
  draftSavedAt: string | null;
  publishedAt: string | null;
}

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
  /** Confirmed party size for a yes, 0 for a no, the places offered while waiting. */
  partySize: number;
  /** The later of the guest's own edit and their reply, ISO 8601. */
  updatedAt: string;
}

export interface ListQuery {
  q?: string;
  status?: ReplyStatus;
  page: number;
  pageSize: number;
}

export interface ResponseRecord extends Reply {
  guestId: number;
  updatedAt: string;
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

export interface ResponseTotals {
  attending: number;
  declined: number;
  waiting: number;
  guestsComing: number;
  meals: Record<string, number>;
}

export interface NewEmail {
  kind: string;
  audience: Audience;
  subject: string;
  /** 'YYYY-MM-DDTHH:MM' wall-clock send time. */
  sendAt: string;
  recipients: number;
  senderName: string;
  replyTo: string;
}

export interface EmailRecord extends NewEmail {
  id: number;
  eventId: number;
  status: EmailStatus;
}

export interface SendContext {
  email: EmailRecord;
  event: { name: string; date: string };
  organiserName: string;
}

export interface DeliveryRecord {
  id: number;
  emailId: number;
  status: DeliveryStatus;
  idempotencyKey: string;
  attempts: number;
  guest: { id: number; name: string; email: string; token: string; code: string; hasReplied: boolean };
}

export interface DeliveryChange {
  status: DeliveryStatus;
  attempts?: number;
  nextAttemptAt?: number | null;
  lastError?: string | null;
  sentAt?: number;
}

export const statusOf = (r: { attending: boolean } | null | undefined): ReplyStatus =>
  !r ? 'waiting' : r.attending ? 'attending' : 'declined';

export const idempotencyKey = (emailId: number, guestId: number) => `email-${emailId}-guest-${guestId}`;

/** 'YYYY-MM-DDTHH:MM' wall-clock times are compared as UTC instants. */
export const fromWallClock = (s: string) => Date.parse(`${s}:00.000Z`);
export const toWallClock = (ms: number) => new Date(ms).toISOString().slice(0, 16);
