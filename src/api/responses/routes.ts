import { Router } from 'express';
import type { ReplyStatus } from '../../data/store.js';
import { eventOf, ownEvent, toInt, type Ctx } from '../context.js';

const PAGE_SIZE = 50;

export function responseRoutes(ctx: Ctx): Router {
  const r = Router();

  r.get('/:id/responses', ownEvent(ctx), async (req, res) => {
    const status = ['attending', 'declined', 'waiting'].includes(String(req.query.status)) ? (req.query.status as ReplyStatus) : undefined;
    const page = toInt(req.query.page, 1);
    const eventId = eventOf(res).id;
    const [{ total, rows }, totals] = await Promise.all([
      ctx.store.listResponses(eventId, { q: typeof req.query.q === 'string' ? req.query.q.trim() : undefined, status, page, pageSize: PAGE_SIZE }),
      ctx.store.responseTotals(eventId),
    ]);
    res.json({ responses: rows, total, page, pageSize: PAGE_SIZE, totals });
  });

  return r;
}
