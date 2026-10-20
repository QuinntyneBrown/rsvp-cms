import { Router } from 'express';
import { isoDate, organiserId, type Ctx } from '../context.js';

/**
 * The organiser dashboard (L2-051, L2-052): totals and upcoming events over the signed-in organiser's events,
 * computed from the same store calls the per-event pages use, so both report the same numbers.
 */
export function dashboardRoutes(ctx: Ctx): Router {
  const r = Router();

  /** Each event with its invitee count and reply totals. */
  async function eventsWithTotals(ownerId: number) {
    const events = await ctx.store.listEvents(ownerId);
    return Promise.all(
      events.map(async (event) => {
        const [invitees, totals, emails] = await Promise.all([
          ctx.store.countGuests(event.id),
          ctx.store.responseTotals(event.id),
          ctx.store.listEmails(event.id),
        ]);
        return { event, invitees, totals, scheduled: emails.filter((e) => e.status === 'Scheduled').length };
      }),
    );
  }

  r.get('/summary', async (_req, res) => {
    const rows = await eventsWithTotals(organiserId(res));
    const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((n, row) => n + pick(row), 0);
    res.json({
      invitees: sum((row) => row.invitees),
      attending: sum((row) => row.totals.attending),
      waiting: sum((row) => row.totals.waiting),
      emailsScheduled: sum((row) => row.scheduled),
    });
  });

  r.get('/upcoming-events', async (_req, res) => {
    const today = isoDate(ctx.now());
    const rows = await eventsWithTotals(organiserId(res));
    res.json({
      events: rows
        .filter((row) => row.event.date >= today) // listEvents is already in date order
        .map(({ event, invitees, totals }) => ({ id: event.id, name: event.name, date: event.date, invitees, attending: totals.attending, status: event.status })),
    });
  });

  return r;
}
