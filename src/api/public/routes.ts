import { Router } from 'express';
import { getEvent, getPage, getResponse, guestByCode, guestByToken, saveResponse } from '../../data/repos.js';
import { normaliseCode } from '../../domain/code.js';
import { validateReply } from '../../domain/rsvp.js';
import { body, isoDate, isoStamp, type Ctx } from '../context.js';

const INVALID = 'This invitation link doesn\'t work';

type Row = Record<string, unknown>;

type WindowState = 'open' | 'not-open' | 'closed';

/** Draft events are never open to guests (L2-039 AC4). */
function windowState(event: Row, today: string): WindowState {
  if (event.status !== 'Published') return 'not-open';
  if (today < String(event.invite_open)) return 'not-open';
  if (today > String(event.invite_close)) return 'closed';
  return 'open';
}

function replyJson(row: Row | undefined) {
  if (!row) return null;
  return {
    attending: row.attending === 1,
    partySize: row.party_size,
    meal: row.meal,
    guestNames: JSON.parse(String(row.guest_names)) as string[],
    dietary: row.dietary,
    song: row.song,
    message: row.message,
  };
}

export function publicRoutes(ctx: Ctx): Router {
  const r = Router();

  /** Invitation code → personal token. Every failure looks the same (L2-037). */
  r.post('/code', (req, res) => {
    const raw = String(body(req).code ?? '').trim();
    if (!raw) {
      res.status(422).json({ errors: { code: 'Enter your invitation code' } });
      return;
    }
    const guest = guestByCode(ctx.db, normaliseCode(raw));
    if (!guest) {
      res.status(404).json({ error: INVALID });
      return;
    }
    res.json({ token: guest.token });
  });

  r.get('/invite/:token', (req, res) => {
    const guest = guestByToken(ctx.db, req.params.token);
    const event = guest ? getEvent(ctx.db, Number(guest.event_id)) : undefined;
    if (!guest || !event) {
      res.status(404).json({ error: INVALID });
      return;
    }
    const state = windowState(event, isoDate(ctx.now()));
    // Only this guest's own data ever leaves the server (L2-038 AC4).
    const payload: Row = {
      state,
      guest: { name: guest.name, places: Number(guest.plus_ones) + 1 },
      event: { name: event.name, date: event.date, inviteOpen: event.invite_open, inviteClose: event.invite_close },
      reply: replyJson(getResponse(ctx.db, Number(guest.id))),
    };
    if (state !== 'not-open') {
      const page = getPage(ctx.db, Number(event.id))!;
      payload.blocks = page.published ? JSON.parse(String(page.published)) : [];
    }
    res.json(payload);
  });

  r.post('/invite/:token/rsvp', (req, res) => {
    const guest = guestByToken(ctx.db, req.params.token);
    const event = guest ? getEvent(ctx.db, Number(guest.event_id)) : undefined;
    if (!guest || !event) {
      res.status(404).json({ error: INVALID });
      return;
    }
    const state = windowState(event, isoDate(ctx.now()));
    if (state !== 'open') {
      res.status(403).json({ error: state === 'closed' ? `Replies closed on ${event.invite_close}` : 'Replies are not open yet' });
      return;
    }
    const v = validateReply(body(req), Number(guest.plus_ones) + 1);
    if (!v.ok) {
      res.status(422).json({ errors: v.errors });
      return;
    }
    saveResponse(ctx.db, Number(guest.id), v.value, isoStamp(ctx.now()));
    res.json({ reply: replyJson(getResponse(ctx.db, Number(guest.id))) });
  });

  return r;
}
