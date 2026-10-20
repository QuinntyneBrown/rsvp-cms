import type { NextFunction, Request, Response } from 'express';
import type { EventRecord, Store } from '../data/store.js';

export interface Ctx {
  store: Store;
  now: () => number;
  /** Base URL of the guest app, for personal links in previews. */
  rsvpUrl: string;
}

export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const body = (req: Request): Record<string, unknown> =>
  req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};

export const toInt = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};

export function organiserId(res: Response): number {
  return res.locals.organiserId as number;
}

/** Loads the event for :id and rejects it unless the signed-in organiser owns it. */
export function ownEvent(ctx: Ctx) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const event = await ctx.store.getEvent(Number(req.params.id));
    if (!event || event.organiserId !== organiserId(res)) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.locals.event = event;
    next();
  };
}

export const eventOf = (res: Response) => res.locals.event as EventRecord;
