import type { NextFunction, Request, Response } from 'express';
import type { Db } from '../data/db.js';
import { getEvent } from '../data/repos.js';

export interface Ctx {
  db: Db;
  now: () => number;
}

export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const isoStamp = (ms: number) => new Date(ms).toISOString();

export const body = (req: Request): Record<string, unknown> =>
  req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};

export const toInt = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function organiserId(res: Response): number {
  return res.locals.organiserId as number;
}

/** Loads the event for :id and rejects it unless the signed-in organiser owns it. */
export function ownEvent(ctx: Ctx) {
  return (req: Request, res: Response, next: NextFunction) => {
    const event = getEvent(ctx.db, Number(req.params.id));
    if (!event || event.organiser_id !== organiserId(res)) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.locals.event = event;
    next();
  };
}

export type EventRow = Record<string, unknown> & { id: number; invite_open: string; invite_close: string; name: string; status: string; date: string };
export const eventOf = (res: Response) => res.locals.event as EventRow;
