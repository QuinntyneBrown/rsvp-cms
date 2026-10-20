import { Router } from 'express';
import {
  countGuests, countNonResponders, deleteGuests, getEmail, getGuest, getResponse, guestByEmail,
  insertEmail, insertGuest, listEmails, listGuests, updateGuest,
} from '../../data/repos.js';
import { confirmedPlusOnes, PLUS_ONES_BELOW_CONFIRMED, validateGuest } from '../../domain/guests.js';
import { sendTime, validateSchedule } from '../../domain/invitations/schedule.js';
import { body, eventOf, isoStamp, ownEvent, toInt, type Ctx } from '../context.js';

const PAGE_SIZE = 50;

const guestJson = (g: Record<string, unknown>) => ({
  id: g.id,
  name: g.name,
  email: g.email,
  group: g.group_name,
  plusOnes: g.plus_ones,
  code: g.code,
  status: g.attending === null || g.attending === undefined ? 'waiting' : g.attending === 1 ? 'attending' : 'declined',
});

export function guestRoutes(ctx: Ctx): Router {
  const r = Router({ mergeParams: true });
  const own = ownEvent(ctx);

  // ---- guest list (L2-019, L2-020) ----------------------------------------

  r.get('/:id/guests', own, (req, res) => {
    const status = ['attending', 'declined', 'waiting'].includes(String(req.query.status))
      ? (req.query.status as 'attending' | 'declined' | 'waiting')
      : undefined;
    const page = toInt(req.query.page, 1);
    const { total, rows } = listGuests(ctx.db, eventOf(res).id, {
      q: typeof req.query.q === 'string' ? req.query.q.trim() : undefined,
      status,
      page,
      pageSize: PAGE_SIZE,
    });
    res.json({ guests: rows.map(guestJson), total, page, pageSize: PAGE_SIZE, invitees: countGuests(ctx.db, eventOf(res).id) });
  });

  // ---- add / edit / remove (L2-021..L2-023) --------------------------------

  r.post('/:id/guests', own, (req, res) => {
    const v = validateGuest(body(req));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    if (guestByEmail(ctx.db, eventOf(res).id, v.value.email)) {
      res.status(422).json({ errors: { email: 'This email is already on the list' } });
      return;
    }
    const id = insertGuest(ctx.db, eventOf(res).id, v.value, isoStamp(ctx.now()));
    res.status(201).json({ guest: guestJson(getGuest(ctx.db, id)!) });
  });

  r.put('/:id/guests/:guestId', own, (req, res) => {
    const guest = getGuest(ctx.db, Number(req.params.guestId));
    if (!guest || guest.event_id !== eventOf(res).id) {
      res.status(404).json({ error: 'Guest not found' });
      return;
    }
    const v = validateGuest(body(req));
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const clash = guestByEmail(ctx.db, eventOf(res).id, v.value.email);
    if (clash && clash.id !== guest.id) {
      res.status(422).json({ errors: { email: 'This email is already on the list' } });
      return;
    }
    const reply = getResponse(ctx.db, Number(guest.id));
    if (reply && reply.attending === 1 && v.value.plusOnes < confirmedPlusOnes(Number(reply.party_size))) {
      res.status(422).json({ errors: { plusOnes: PLUS_ONES_BELOW_CONFIRMED } });
      return;
    }
    updateGuest(ctx.db, Number(guest.id), v.value);
    res.json({ guest: guestJson(getGuest(ctx.db, Number(guest.id))!) });
  });

  /** Removing a guest deletes their personal link and reply (cascade). */
  r.post('/:id/guests/remove', own, (req, res) => {
    const ids = Array.isArray(body(req).ids) ? (body(req).ids as unknown[]).map(Number).filter(Number.isInteger) : [];
    res.json({ removed: deleteGuests(ctx.db, eventOf(res).id, ids) });
  });

  // ---- invitations (L2-029..L2-031, L2-036) ---------------------------------

  r.post('/:id/emails', own, (req, res) => {
    const event = eventOf(res);
    const v = validateSchedule(body(req), event.invite_close);
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    const recipients = v.value.audience === 'all' ? countGuests(ctx.db, event.id) : countNonResponders(ctx.db, event.id);
    const id = insertEmail(ctx.db, event.id, {
      kind: 'Invitation',
      audience: v.value.audience === 'all' ? 'All invitees' : "People who haven't replied",
      subject: v.value.subject,
      sendAt: sendTime(v.value.sendOn),
      status: 'Scheduled',
      recipients,
      senderName: v.value.senderName,
      replyTo: v.value.replyTo,
    });
    res.status(201).json({ email: emailJson(getEmail(ctx.db, id)!), sendTime: sendTime(v.value.sendOn) });
  });

  r.get('/:id/emails', own, (_req, res) => {
    res.json({ emails: listEmails(ctx.db, eventOf(res).id).map(emailJson) });
  });

  r.get('/:id/emails/:emailId/preview', own, (req, res) => {
    const email = getEmail(ctx.db, Number(req.params.emailId));
    if (!email || email.event_id !== eventOf(res).id) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    const event = eventOf(res);
    res.json({
      from: String(email.sender_name) || res.locals.organiserName,
      replyTo: email.reply_to || null,
      subject: email.subject,
      body: `Hi Maya Sample,\n\nYou're invited to ${event.name} on ${event.date}.\nReply with your personal link: https://rsvp.example/i/SAMPLE-CODE`,
    });
  });

  return r;
}

const emailJson = (e: Record<string, unknown>) => ({
  id: e.id,
  kind: e.kind,
  audience: e.audience,
  sendAt: e.send_at,
  recipients: e.recipients,
  status: e.status,
  subject: e.subject,
});
