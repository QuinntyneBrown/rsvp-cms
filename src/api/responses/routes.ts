import { Router } from 'express';
import { listResponses, responseTotals } from '../../data/repos.js';
import { eventOf, ownEvent, toInt, type Ctx } from '../context.js';

const PAGE_SIZE = 50;

export function responseRoutes(ctx: Ctx): Router {
  const r = Router();

  r.get('/:id/responses', ownEvent(ctx), (req, res) => {
    const status = ['attending', 'declined'].includes(String(req.query.status)) ? (req.query.status as 'attending' | 'declined') : undefined;
    const page = toInt(req.query.page, 1);
    const eventId = eventOf(res).id;
    const { total, rows } = listResponses(ctx.db, eventId, {
      q: typeof req.query.q === 'string' ? req.query.q.trim() : undefined,
      status,
      page,
      pageSize: PAGE_SIZE,
    });
    res.json({
      responses: rows.map((x) => ({
        guestId: x.guest_id,
        guest: x.guest,
        reply: x.attending === 1 ? 'attending' : 'declined',
        guestsCount: x.party_size,
        meal: x.meal,
        dietary: x.dietary,
        message: x.message,
        updatedAt: x.updated_at,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      totals: responseTotals(ctx.db, eventId),
    });
  });

  return r;
}
