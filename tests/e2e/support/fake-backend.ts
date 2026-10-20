import type { BrowserContext, Request, Route } from '@playwright/test';
import { MAX_BLOCKS, parseBlocks, validateBlocks, type Block } from '../../../src/domain/blocks.js';
import { normaliseCode } from '../../../src/domain/code.js';
import { validateNewEvent } from '../../../src/domain/events.js';
import { confirmedPlusOnes, PLUS_ONES_BELOW_CONFIRMED, validateGuest } from '../../../src/domain/guests.js';
import { invitationText, personalLink, SAMPLE_GUEST } from '../../../src/domain/invitations/message.js';
import { sendTime, validateSchedule, type Audience } from '../../../src/domain/invitations/schedule.js';
import { EMAIL_RE } from '../../../src/domain/result.js';
import { repliesClosedMessage, validateReply, type Reply } from '../../../src/domain/rsvp.js';

/**
 * In-memory stand-in for the Express API, installed with context.route so the browser never reaches a server.
 * It mirrors the HTTP contract of src/api (paths, status codes, JSON shapes and messages) and reuses the pure
 * validators in src/domain, so the apps see the same answers they would get from the real backend.
 */

export const TODAY = '2026-10-19';
export const ORGANISER = { id: 1, email: 'olivia@example.com', password: 'correct horse', name: 'Olivia' };
export const RSVP_URL = 'http://localhost:5174';
export const SESSION_ENDED = 'Your session ended. Sign in again.';
const INVALID_LINK = "This invitation link doesn't work";
const PAGE_SIZE = 50;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface FakeEvent {
  id: number;
  type: string;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  status: 'Draft' | 'Published';
  inviteOpen: string;
  inviteClose: string;
}

export interface FakeGuest {
  id: number;
  eventId: number;
  name: string;
  email: string;
  group: string;
  plusOnes: number;
  code: string;
  token: string;
  updatedAt: string;
}

export interface FakeReply extends Reply {
  guestId: number;
  updatedAt: string;
}

export interface FakeEmail {
  id: number;
  eventId: number;
  audience: Audience;
  subject: string;
  sendAt: string;
  recipients: number;
  status: string;
  senderName: string;
  replyTo: string;
}

export interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
}

type Json = Record<string, unknown>;
type Answer = { status: number; body?: unknown };

interface Override {
  method: string;
  path: string | RegExp;
  times: number;
  status?: number;
  body?: unknown;
  abort?: boolean;
  gate?: Promise<void>;
}

const AUDIENCE_LABEL: Record<Audience, string> = { all: 'All invitees', 'non-responders': "People who haven't replied" };

export class FakeBackend {
  session: 'none' | 'active' | 'ended' = 'none';
  /** Every /api call the apps made, in order. */
  readonly requests: RecordedRequest[] = [];
  /** Calls the fake has no handler for; the fixture fails the test if any are left. */
  readonly unhandled: string[] = [];

  private events: FakeEvent[] = [];
  private pages = new Map<number, { draft: Block[]; published: Block[] | null }>();
  private guests: FakeGuest[] = [];
  private replies = new Map<number, FakeReply>();
  private emails: FakeEmail[] = [];
  private overrides: Override[] = [];
  private ids = { event: 0, guest: 0, email: 0 };
  private clock: number;

  constructor(readonly today = TODAY) {
    this.clock = Date.parse(`${today}T12:00:00Z`);
  }

  async install(context: BrowserContext) {
    await context.route('**/api/**', (route) => this.handle(route));
  }

  // ---- seeding ---------------------------------------------------------------

  signIn() {
    this.session = 'active';
    return this;
  }

  addEvent(over: Partial<Omit<FakeEvent, 'id'>> = {}): FakeEvent {
    const date = over.date ?? '2026-12-12';
    const event: FakeEvent = {
      id: ++this.ids.event,
      type: 'Anniversary',
      name: 'Maya & Sam',
      date,
      startTime: '16:00',
      venue: 'The Barn',
      status: 'Draft',
      inviteOpen: this.today,
      inviteClose: date,
      ...over,
    };
    this.events.push(event);
    this.pages.set(event.id, { draft: [], published: null });
    return event;
  }

  addGuest(eventId: number, over: Partial<Omit<FakeGuest, 'id' | 'eventId'>> = {}): FakeGuest {
    const id = ++this.ids.guest;
    const guest: FakeGuest = {
      id,
      eventId,
      name: 'Maya Chen',
      email: `guest${id}@example.com`,
      group: '',
      plusOnes: 0,
      code: codeFor(id),
      token: `token-${id}`,
      updatedAt: this.tick(),
      ...over,
    };
    this.guests.push(guest);
    return guest;
  }

  addReply(guestId: number, over: Partial<Reply> = {}): FakeReply {
    const attending = over.attending ?? true;
    const reply: FakeReply = {
      guestId,
      attending,
      partySize: attending ? 1 : 0,
      meal: attending ? 'Chicken' : null,
      guestNames: [],
      dietary: '',
      song: '',
      message: '',
      ...over,
      updatedAt: this.tick(),
    };
    this.replies.set(guestId, reply);
    return reply;
  }

  addEmail(eventId: number, over: Partial<Omit<FakeEmail, 'id' | 'eventId'>> = {}): FakeEmail {
    const email: FakeEmail = {
      id: ++this.ids.email,
      eventId,
      audience: 'all',
      subject: "You're invited",
      sendAt: '2026-11-01T09:00',
      recipients: 0,
      status: 'Scheduled',
      senderName: '',
      replyTo: '',
      ...over,
    };
    this.emails.push(email);
    return email;
  }

  setDraft(eventId: number, draft: Block[]) {
    this.pageOf(eventId).draft = draft;
  }

  /** Publishes blocks as the live page, which opens the event to guests. */
  publish(eventId: number, blocks: Block[]) {
    this.pages.set(eventId, { draft: blocks, published: blocks });
    this.event(eventId)!.status = 'Published';
  }

  // ---- reading state ---------------------------------------------------------

  event(id: number) {
    return this.events.find((e) => e.id === id);
  }

  allEvents() {
    return [...this.events];
  }

  pageOf(eventId: number) {
    const page = this.pages.get(eventId);
    if (!page) throw new Error(`No page for event ${eventId}`);
    return page;
  }

  guestsOf(eventId: number) {
    return this.guests.filter((g) => g.eventId === eventId);
  }

  replyOf(guestId: number) {
    return this.replies.get(guestId) ?? null;
  }

  emailsOf(eventId: number) {
    return this.emails.filter((e) => e.eventId === eventId);
  }

  /** Requests matching a method and an exact path or pattern. */
  calls(method: string, path: string | RegExp) {
    return this.requests.filter((r) => r.method === method && matches(path, r.path));
  }

  // ---- per-test behaviour ----------------------------------------------------

  /** Answers the next `times` matching calls with a canned response instead of the fake's own. */
  respond(method: string, path: string | RegExp, status: number, body?: unknown, times = 1) {
    this.overrides.push({ method, path, status, body, times });
  }

  /** Answers with the generic 500 the real error handler sends. */
  failNext(method: string, path: string | RegExp, times = 1) {
    this.respond(method, path, 500, { error: 'Something went wrong. Try again.' }, times);
  }

  /** Drops the connection, as when the guest or organiser is offline. */
  abortNext(method: string, path: string | RegExp, times = 1) {
    this.overrides.push({ method, path, abort: true, times });
  }

  /** Keeps the next matching call in flight until `release` is called, to observe busy states. */
  hold(method: string, path: string | RegExp) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.overrides.push({ method, path, gate, times: 1 });
    return { release };
  }

  // ---- HTTP ------------------------------------------------------------------

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const recorded: RecordedRequest = { method: req.method(), path: url.pathname, query: url.searchParams, body: bodyOf(req) };
    this.requests.push(recorded);

    const override = this.overrides.find((o) => o.method === recorded.method && matches(o.path, recorded.path));
    if (override) {
      if (--override.times <= 0) this.overrides.splice(this.overrides.indexOf(override), 1);
      if (override.gate) await override.gate;
      if (override.abort) return route.abort('internetdisconnected');
      if (override.status !== undefined) return fulfil(route, { status: override.status, body: override.body });
    }

    const answer = this.dispatch(recorded);
    if (!answer) {
      this.unhandled.push(`${recorded.method} ${recorded.path}`);
      return fulfil(route, { status: 501, body: { error: `Fake backend has no handler for ${recorded.method} ${recorded.path}` } });
    }
    return fulfil(route, answer);
  }

  private dispatch(r: RecordedRequest): Answer | null {
    const { method, path } = r;
    if (path.startsWith('/api/auth/')) return this.auth(r);
    if (path.startsWith('/api/public/')) return this.public(r);
    if (!path.startsWith('/api/events')) return null;
    if (this.session !== 'active') return { status: 401, body: { error: this.session === 'ended' ? SESSION_ENDED : 'Sign in to continue' } };

    if (path === '/api/events') {
      if (method === 'GET') return ok({ events: [...this.events].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id) });
      if (method === 'POST') return this.createEvent(r.body);
      return null;
    }

    const m = path.match(/^\/api\/events\/([^/]+)(\/.*)?$/);
    if (!m) return null;
    const event = this.event(Number(m[1]));
    if (!event) return { status: 404, body: { error: 'Event not found' } };
    const rest = m[2] ?? '';
    const key = `${method} ${rest.replace(/\/\d+(?=\/|$)/g, '/:n')}`;
    const subId = Number(rest.match(/\/(\d+)(?:\/|$)/)?.[1]);

    switch (key) {
      case 'GET ':
        return ok({ event });
      case 'GET /page':
        return ok(this.pageJson(event.id));
      case 'PUT /page/draft':
        return this.saveDraft(event, r.body);
      case 'POST /page/publish':
        return this.publishDraft(event);
      case 'POST /page/discard': {
        const page = this.pageOf(event.id);
        page.draft = page.published ?? [];
        return ok(this.pageJson(event.id));
      }
      case 'GET /page/preview':
        return ok({ event, blocks: this.pageOf(event.id).draft });
      case 'GET /guests':
        return this.listGuests(event, r.query);
      case 'POST /guests':
        return this.saveGuest(event, r.body, null);
      case 'PUT /guests/:n':
        return this.saveGuest(event, r.body, subId);
      case 'POST /guests/remove': {
        const ids = Array.isArray(r.body.ids) ? r.body.ids.map(Number) : [];
        const before = this.guests.length;
        this.guests = this.guests.filter((g) => !(g.eventId === event.id && ids.includes(g.id)));
        ids.forEach((id) => this.replies.delete(id));
        return ok({ removed: before - this.guests.length });
      }
      case 'GET /emails':
        return ok({
          emails: this.emailsOf(event.id).sort((a, b) => a.sendAt.localeCompare(b.sendAt) || a.id - b.id).map(emailJson),
          counts: { all: this.guestsOf(event.id).length, nonResponders: this.nonResponders(event.id) },
        });
      case 'POST /emails':
        return this.scheduleEmail(event, r.body);
      case 'GET /emails/:n/preview':
        return this.previewEmail(event, subId);
      case 'GET /responses':
        return this.listResponses(event, r.query);
      default:
        return null;
    }
  }

  private auth({ method, path, body }: RecordedRequest): Answer | null {
    if (method === 'GET' && path === '/api/auth/me') {
      if (this.session !== 'active') return { status: 401, body: { error: this.session === 'ended' ? SESSION_ENDED : 'Sign in to continue' } };
      return ok({ id: ORGANISER.id, name: ORGANISER.name, email: ORGANISER.email, passwordChangedAt: null });
    }
    if (method === 'POST' && path === '/api/auth/sign-in') {
      const email = String(body.email ?? '').trim();
      if (!EMAIL_RE.test(email)) return { status: 422, body: { errors: { email: 'Enter an email like name@example.com' } } };
      if (email.toLowerCase() !== ORGANISER.email || body.password !== ORGANISER.password) {
        return { status: 401, body: { error: 'Email or password is not right' } };
      }
      this.session = 'active';
      return ok({ redirect: '/dashboard', name: ORGANISER.name });
    }
    if (method === 'POST' && path === '/api/auth/sign-out') {
      this.session = 'none';
      return { status: 204 };
    }
    return null;
  }

  private public({ method, path, body }: RecordedRequest): Answer | null {
    if (method === 'POST' && path === '/api/public/code') {
      const raw = String(body.code ?? '').trim();
      if (!raw) return { status: 422, body: { errors: { code: 'Enter your invitation code' } } };
      const guest = this.guests.find((g) => g.code === normaliseCode(raw));
      return guest ? ok({ token: guest.token }) : { status: 404, body: { error: INVALID_LINK } };
    }
    const m = path.match(/^\/api\/public\/invite\/([^/]+)(\/rsvp)?$/);
    if (!m) return null;
    const guest = this.guests.find((g) => g.token === decodeURIComponent(m[1]!));
    const event = guest && this.event(guest.eventId);
    if (!guest || !event) return { status: 404, body: { error: INVALID_LINK } };
    const state = this.windowState(event);

    if (method === 'GET' && !m[2]) {
      const payload: Json = {
        state,
        guest: { name: guest.name, places: guest.plusOnes + 1 },
        event: {
          name: event.name, type: event.type, date: event.date, startTime: event.startTime, venue: event.venue,
          inviteOpen: event.inviteOpen, inviteClose: event.inviteClose, host: ORGANISER.name,
        },
        reply: replyJson(this.replyOf(guest.id)),
      };
      if (state !== 'not-open') payload.blocks = this.pageOf(event.id).published ?? [];
      return ok(payload);
    }
    if (method === 'POST' && m[2]) {
      if (state !== 'open') {
        return { status: 403, body: { error: state === 'closed' ? repliesClosedMessage(event.inviteClose) : 'Replies are not open yet' } };
      }
      const v = validateReply(body, guest.plusOnes + 1);
      if (!v.ok) return { status: 422, body: { errors: v.errors } };
      const reply: FakeReply = { ...v.value, guestId: guest.id, updatedAt: this.tick() };
      this.replies.set(guest.id, reply);
      return ok({ reply: replyJson(reply) });
    }
    return null;
  }

  private createEvent(body: Json): Answer {
    const v = validateNewEvent(body, this.today);
    if (!v.ok) return { status: 422, body: { errors: v.errors } };
    const event = this.addEvent({ ...v.value, inviteOpen: this.today, inviteClose: v.value.date });
    return { status: 201, body: { event, redirect: `/events/${event.id}` } };
  }

  private pageJson(eventId: number) {
    const p = this.pageOf(eventId);
    return { ...p, draftSavedAt: null, publishedAt: null, hasUnpublishedChanges: JSON.stringify(p.draft) !== JSON.stringify(p.published ?? []) };
  }

  private saveDraft(event: FakeEvent, body: Json): Answer {
    const blocks = parseBlocks(body.blocks);
    if (!blocks) return { status: 400, body: { error: 'Blocks are invalid' } };
    if (blocks.length > MAX_BLOCKS) return { status: 422, body: { errors: { page: 'A page can have up to 12 blocks' } } };
    this.pageOf(event.id).draft = blocks;
    return ok(this.pageJson(event.id));
  }

  private publishDraft(event: FakeEvent): Answer {
    const page = this.pageOf(event.id);
    const errors = validateBlocks(page.draft);
    if (Object.keys(errors).length) return { status: 422, body: { errors, firstInvalid: Object.keys(errors)[0] } };
    page.published = page.draft;
    event.status = 'Published';
    return ok(this.pageJson(event.id));
  }

  private status(guestId: number): 'attending' | 'declined' | 'waiting' {
    const r = this.replyOf(guestId);
    return !r ? 'waiting' : r.attending ? 'attending' : 'declined';
  }

  private listGuests(event: FakeEvent, query: URLSearchParams): Answer {
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const status = query.get('status');
    const page = positiveInt(query.get('page'));
    const all = this.guestsOf(event.id)
      .filter((g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q))
      .filter((g) => !['attending', 'declined', 'waiting'].includes(status ?? '') || this.status(g.id) === status)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
    const guests = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((g) => {
      const reply = this.replyOf(g.id);
      return {
        id: g.id,
        name: g.name,
        email: g.email,
        group: g.group,
        plusOnes: g.plusOnes,
        code: g.code,
        status: this.status(g.id),
        partySize: reply?.attending ? reply.partySize : null,
        updatedAt: reply && reply.updatedAt > g.updatedAt ? reply.updatedAt : g.updatedAt,
      };
    });
    return ok({ guests, total: all.length, page, pageSize: PAGE_SIZE, invitees: this.guestsOf(event.id).length });
  }

  private saveGuest(event: FakeEvent, body: Json, guestId: number | null): Answer {
    const existing = guestId === null ? null : this.guestsOf(event.id).find((g) => g.id === guestId);
    if (guestId !== null && !existing) return { status: 404, body: { error: 'Guest not found' } };
    const v = validateGuest(body);
    if (!v.ok) return { status: 422, body: { errors: v.errors } };
    const clash = this.guestsOf(event.id).find((g) => g.email === v.value.email);
    if (clash && clash.id !== guestId) return { status: 422, body: { errors: { email: 'This email is already on the list' } } };
    if (existing) {
      const reply = this.replyOf(existing.id);
      if (reply?.attending && v.value.plusOnes < confirmedPlusOnes(reply.partySize)) {
        return { status: 422, body: { errors: { plusOnes: PLUS_ONES_BELOW_CONFIRMED } } };
      }
      Object.assign(existing, v.value, { updatedAt: this.tick() });
      return ok({ guest: existing });
    }
    return { status: 201, body: { guest: { ...this.addGuest(event.id, v.value), status: 'waiting' } } };
  }

  private nonResponders(eventId: number) {
    return this.guestsOf(eventId).filter((g) => !this.replies.has(g.id)).length;
  }

  private scheduleEmail(event: FakeEvent, body: Json): Answer {
    const v = validateSchedule(body, event.inviteClose);
    if (!v.ok) return { status: 422, body: { errors: v.errors } };
    const email = this.addEmail(event.id, {
      audience: v.value.audience,
      subject: v.value.subject,
      sendAt: sendTime(v.value.sendOn),
      recipients: v.value.audience === 'all' ? this.guestsOf(event.id).length : this.nonResponders(event.id),
      senderName: v.value.senderName,
      replyTo: v.value.replyTo,
    });
    return { status: 201, body: { email: emailJson(email), sendTime: email.sendAt } };
  }

  private previewEmail(event: FakeEvent, emailId: number): Answer {
    const email = this.emailsOf(event.id).find((e) => e.id === emailId);
    if (!email) return { status: 404, body: { error: 'Email not found' } };
    return ok({
      from: email.senderName || ORGANISER.name,
      replyTo: email.replyTo || null,
      subject: email.subject,
      body: invitationText({
        guestName: SAMPLE_GUEST.name,
        eventName: event.name,
        eventDate: event.date,
        link: personalLink(RSVP_URL, SAMPLE_GUEST.token),
        code: SAMPLE_GUEST.code,
      }),
    });
  }

  private listResponses(event: FakeEvent, query: URLSearchParams): Answer {
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const status = query.get('status');
    const page = positiveInt(query.get('page'));
    const guests = new Map(this.guestsOf(event.id).map((g) => [g.id, g]));
    const replies = [...this.replies.values()].filter((r) => guests.has(r.guestId));
    const rows = replies
      .filter((r) => !q || guests.get(r.guestId)!.name.toLowerCase().includes(q))
      .filter((r) => status !== 'attending' || r.attending)
      .filter((r) => status !== 'declined' || !r.attending)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.guestId - a.guestId);
    // Waiting lists the guests with no reply, by name, as MemoryStore.listResponses does.
    const waiting = [...guests.values()]
      .filter((g) => !this.replies.has(g.id) && (!q || g.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
    const attending = replies.filter((r) => r.attending);
    const meals: Record<string, number> = {};
    for (const r of [...attending].sort((a, b) => String(a.meal).localeCompare(String(b.meal)))) {
      if (r.meal) meals[r.meal] = (meals[r.meal] ?? 0) + r.partySize;
    }
    const waitingRows = waiting.map((g) => ({ guestId: g.id, guest: g.name, reply: 'waiting', guestsCount: 0, meal: null, dietary: '', message: '', updatedAt: null }));
    const replyRows = rows.map((r) => ({
        guestId: r.guestId,
        guest: guests.get(r.guestId)!.name,
        reply: r.attending ? 'attending' : 'declined',
        guestsCount: r.attending ? r.partySize : 0,
        meal: r.meal,
        dietary: r.dietary,
        message: r.message,
        updatedAt: r.updatedAt,
      }));
    const all = status === 'waiting' ? waitingRows : replyRows;
    return ok({
      responses: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: all.length,
      page,
      pageSize: PAGE_SIZE,
      totals: {
        attending: attending.length,
        declined: replies.length - attending.length,
        waiting: guests.size - replies.length,
        guestsComing: attending.reduce((n, r) => n + r.partySize, 0),
        meals,
      },
    });
  }

  private windowState(event: FakeEvent): 'open' | 'not-open' | 'closed' {
    if (event.status !== 'Published' || this.today < event.inviteOpen) return 'not-open';
    return this.today > event.inviteClose ? 'closed' : 'open';
  }

  /** A strictly increasing timestamp, so "most recently updated" orderings are deterministic. */
  private tick() {
    this.clock += 60_000;
    return new Date(this.clock).toISOString();
  }
}

/** Deterministic codes in the real XXXX-XXXX alphabet: guest 1 is GUES-AAAB, guest 2 GUES-AAAC... */
function codeFor(id: number) {
  let tail = '';
  for (let n = id, i = 0; i < 4; i++, n = Math.floor(n / ALPHABET.length)) tail = ALPHABET[n % ALPHABET.length] + tail;
  return `GUES-${tail}`;
}

const ok = (body: unknown): Answer => ({ status: 200, body });

const matches = (pattern: string | RegExp, path: string) => (typeof pattern === 'string' ? pattern === path : pattern.test(path));

const positiveInt = (v: string | null) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
};

function bodyOf(req: Request): Json {
  try {
    const data: unknown = req.postDataJSON();
    return data && typeof data === 'object' ? (data as Json) : {};
  } catch {
    return {};
  }
}

const replyJson = (r: FakeReply | null) =>
  r && { attending: r.attending, partySize: r.partySize, meal: r.meal, guestNames: r.guestNames, dietary: r.dietary, song: r.song, message: r.message, updatedAt: r.updatedAt };

const emailJson = (e: FakeEmail) => ({
  id: e.id,
  kind: 'Invitation',
  audience: AUDIENCE_LABEL[e.audience],
  sendAt: e.sendAt,
  recipients: e.recipients,
  status: e.status,
  subject: e.subject,
});

function fulfil(route: Route, { status, body }: Answer) {
  if (status === 204 || body === undefined) return route.fulfill({ status });
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}
