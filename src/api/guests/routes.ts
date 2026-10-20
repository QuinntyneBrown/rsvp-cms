import { Router } from 'express';
import { DuplicateError, type EmailRecord, type GuestListRow, type GuestRecord, type ReplyStatus } from '../../data/store.js';
import { confirmedPlusOnes, PLUS_ONES_BELOW_CONFIRMED, validateGuest } from '../../domain/guests.js';
import { invitationText, personalLink, SAMPLE_GUEST } from '../../domain/invitations/message.js';
import { sendTime, validateSchedule } from '../../domain/invitations/schedule.js';
import { body, eventOf, ownEvent, toInt, type Ctx } from '../context.js';

const PAGE_SIZE = 50;
const DUPLICATE_EMAIL = { errors: { email: 'This email is already on the list' } };

const guestJson = (g: GuestRecord & Partial<GuestListRow>) => ({
  id: g.id,
  name: g.name,
  email: g.email,
  group: g.group,
  plusOnes: g.plusOnes,
  code: g.code,
  status: g.status ?? 'waiting',
  partySize: g.partySize ?? null,
  updatedAt: g.updatedAt ?? null,
});

const AUDIENCE_LABEL = { all: 'All invitees', 'non-responders': "People who haven't replied" } as const;

const emailJson = (e: EmailRecord) => ({
  id: e.id,
  kind: e.kind,
  audience: AUDIENCE_LABEL[e.audience],
  sendAt: e.sendAt,
  recipients: e.recipients,
  status: e.status,
  subject: e.subject,
});

export function guestRoutes(ctx: Ctx): Router {
  const r = Router({ mergeParams: true });
  const own = ownEvent(ctx);

  // ---- guest list (L2-019, L2-020) ----------------------------------------

  r.get('/:id/guests', own, async (req, res) => {
    const status = ['attending', 'declined', 'waiting'].includes(String(req.query.status)) ? (req.query.status as ReplyStatus) : undefined;
    const page = toInt(req.query.page, 1);
    const eventId = eventOf(res).id;
    const [{ total, rows }, invitees] = await Promise.all([
      ctx.store.listGuests(eventId, { q: typeof req.query.q === 'string' ? req.query.q.trim() : undefined, status, page, pageSize: PAGE_SIZE }),
      ctx.store.countGuests(eventId),
    ]);
    res.json({ guests: rows.map(guestJson), total, page, pageSize: PAGE_SIZE, invitees });
  });

  // ---- add / edit / remove (L2-021..L2-023) --------------------------------

  r.post('/:id/guests', own, async (req, res) => {
    const v = validateGuest(body(req));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const eventId = eventOf(res).id;
    if (await ctx.store.guestByEmail(eventId, v.value.email)) {
      res.status(422).json(DUPLICATE_EMAIL);
      return;
    }
    try {
      const id = await ctx.store.insertGuest(eventId, v.value, ctx.now());
      res.status(201).json({ guest: guestJson((await ctx.store.getGuest(id))!) });
    } catch (e) {
      // Two adds of the same email racing each other: the unique index lets only one through.
      if (!(e instanceof DuplicateError)) throw e;
      res.status(422).json(DUPLICATE_EMAIL);
    }
  });

  r.put('/:id/guests/:guestId', own, async (req, res) => {
    const eventId = eventOf(res).id;
    const guest = await ctx.store.getGuest(Number(req.params.guestId));
    if (!guest || guest.eventId !== eventId) {
      res.status(404).json({ error: 'Guest not found' });
      return;
    }
    const v = validateGuest(body(req));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const clash = await ctx.store.guestByEmail(eventId, v.value.email);
    if (clash && clash.id !== guest.id) {
      res.status(422).json(DUPLICATE_EMAIL);
      return;
    }
    const reply = await ctx.store.getResponse(guest.id);
    if (reply?.attending && v.value.plusOnes < confirmedPlusOnes(reply.partySize)) {
      res.status(422).json({ errors: { plusOnes: PLUS_ONES_BELOW_CONFIRMED } });
      return;
    }
    try {
      await ctx.store.updateGuest(guest.id, v.value, ctx.now());
    } catch (e) {
      if (!(e instanceof DuplicateError)) throw e;
      res.status(422).json(DUPLICATE_EMAIL);
      return;
    }
    res.json({ guest: guestJson((await ctx.store.getGuest(guest.id))!) });
  });

  /** Removing a guest deletes their personal link, reply and pending emails (cascade). */
  r.post('/:id/guests/remove', own, async (req, res) => {
    const raw = body(req).ids;
    const ids = Array.isArray(raw) ? raw.map(Number).filter(Number.isSafeInteger) : [];
    res.json({ removed: await ctx.store.deleteGuests(eventOf(res).id, ids) });
  });

  // ---- invitations (L2-029..L2-031, L2-036) ---------------------------------

  r.post('/:id/emails', own, async (req, res) => {
    const event = eventOf(res);
    const v = validateSchedule(body(req), event.inviteClose);
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const recipients = v.value.audience === 'all' ? await ctx.store.countGuests(event.id) : await ctx.store.countNonResponders(event.id);
    const id = await ctx.store.insertEmail(event.id, {
      kind: 'Invitation',
      audience: v.value.audience,
      subject: v.value.subject,
      sendAt: sendTime(v.value.sendOn),
      recipients,
      senderName: v.value.senderName,
      replyTo: v.value.replyTo,
    }, ctx.now());
    res.status(201).json({ email: emailJson((await ctx.store.getEmail(id))!), sendTime: sendTime(v.value.sendOn) });
  });

  r.get('/:id/emails', own, async (_req, res) => {
    const event = eventOf(res);
    const [emails, invitees, nonResponders] = await Promise.all([
      ctx.store.listEmails(event.id),
      ctx.store.countGuests(event.id),
      ctx.store.countNonResponders(event.id),
    ]);
    res.json({ emails: emails.map(emailJson), counts: { all: invitees, nonResponders } });
  });

  /** The exact text a guest receives, with a sample guest's name, link and code (L2-031 AC1). */
  r.get('/:id/emails/:emailId/preview', own, async (req, res) => {
    const event = eventOf(res);
    const email = await ctx.store.getEmail(Number(req.params.emailId));
    if (!email || email.eventId !== event.id) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    res.json({
      from: email.senderName || res.locals.organiserName,
      replyTo: email.replyTo || null,
      subject: email.subject,
      body: invitationText({
        guestName: SAMPLE_GUEST.name,
        eventName: event.name,
        eventDate: event.date,
        link: personalLink(ctx.rsvpUrl, SAMPLE_GUEST.token),
        code: SAMPLE_GUEST.code,
      }),
    });
  });

  return r;
}
