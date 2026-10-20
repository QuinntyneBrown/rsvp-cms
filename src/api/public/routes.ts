import { Router } from 'express';
import type { EventRecord, ResponseRecord } from '../../data/store.js';
import { normaliseCode } from '../../domain/code.js';
import { repliesClosedMessage, validateReply } from '../../domain/rsvp.js';
import { body, isoDate, type Ctx } from '../context.js';

const INVALID = "This invitation link doesn't work";

type WindowState = 'open' | 'not-open' | 'closed';

/** Draft events are never open to guests (L2-039 AC4). */
function windowState(event: EventRecord, today: string): WindowState {
  if (event.status !== 'Published') return 'not-open';
  if (today < event.inviteOpen) return 'not-open';
  if (today > event.inviteClose) return 'closed';
  return 'open';
}

const replyJson = (r: ResponseRecord | null) =>
  r && {
    attending: r.attending,
    partySize: r.partySize,
    meal: r.meal,
    guestNames: r.guestNames,
    dietary: r.dietary,
    song: r.song,
    message: r.message,
  };

export function publicRoutes(ctx: Ctx): Router {
  const r = Router();

  /** Invitation code → personal token. Every failure looks the same (L2-037). */
  r.post('/code', async (req, res) => {
    const raw = String(body(req).code ?? '').trim();
    if (!raw) {
      res.status(422).json({ errors: { code: 'Enter your invitation code' } });
      return;
    }
    const guest = await ctx.store.guestByCode(normaliseCode(raw));
    if (!guest) {
      res.status(404).json({ error: INVALID });
      return;
    }
    res.json({ token: guest.token });
  });

  r.get('/invite/:token', async (req, res) => {
    const guest = await ctx.store.guestByToken(req.params.token);
    const event = guest ? await ctx.store.getEvent(guest.eventId) : null;
    if (!guest || !event) {
      res.status(404).json({ error: INVALID });
      return;
    }
    const state = windowState(event, isoDate(ctx.now()));
    // Only this guest's own data ever leaves the server (L2-038 AC4).
    const payload: Record<string, unknown> = {
      state,
      guest: { name: guest.name, places: guest.plusOnes + 1 },
      event: { name: event.name, date: event.date, inviteOpen: event.inviteOpen, inviteClose: event.inviteClose },
      reply: replyJson(await ctx.store.getResponse(guest.id)),
    };
    if (state !== 'not-open') payload.blocks = (await ctx.store.getPage(event.id)).published ?? [];
    res.json(payload);
  });

  r.post('/invite/:token/rsvp', async (req, res) => {
    const guest = await ctx.store.guestByToken(req.params.token);
    const event = guest ? await ctx.store.getEvent(guest.eventId) : null;
    if (!guest || !event) {
      res.status(404).json({ error: INVALID });
      return;
    }
    const state = windowState(event, isoDate(ctx.now()));
    if (state !== 'open') {
      res.status(403).json({ error: state === 'closed' ? repliesClosedMessage(event.inviteClose) : 'Replies are not open yet' });
      return;
    }
    const v = validateReply(body(req), guest.plusOnes + 1);
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    res.json({ reply: replyJson(await ctx.store.saveResponse(guest.id, v.value, ctx.now())) });
  });

  return r;
}
