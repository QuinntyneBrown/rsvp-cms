import type { Db } from './db.js';
import { emailRecord, toDay, type EmailRecord } from './repos.js';

/** How long a worker owns an email it is sending before another instance may take over. */
export const LEASE_MS = 5 * 60_000;

/** Ids of emails due at `now` that no live worker holds. */
export async function dueEmailIds(db: Db, now: number, limit = 20): Promise<number[]> {
  const at = new Date(now);
  const rows = await db.email.findMany({
    where: { status: { in: ['Scheduled', 'Sending'] }, sendAt: { lte: at }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: at } }] },
    select: { id: true },
    orderBy: [{ sendAt: 'asc' }, { id: 'asc' }],
    take: limit,
  });
  return rows.map((r) => r.id);
}

/** Takes the lease with a conditional update, so two instances never send the same email at once. */
export async function claimEmail(db: Db, id: number, now: number): Promise<boolean> {
  const at = new Date(now);
  const res = await db.email.updateMany({
    where: { id, status: { in: ['Scheduled', 'Sending'] }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: at } }] },
    data: { status: 'Sending', lockedUntil: new Date(now + LEASE_MS) },
  });
  return res.count === 1;
}

export interface SendContext {
  email: EmailRecord;
  event: { name: string; date: string };
  organiserName: string;
}

export async function sendContext(db: Db, emailId: number): Promise<SendContext | null> {
  const e = await db.email.findUnique({ where: { id: emailId }, include: { event: { include: { organiser: true } } } });
  if (!e) return null;
  return { email: emailRecord(e), event: { name: e.event.name, date: toDay(e.event.date) }, organiserName: e.event.organiser.name };
}

/**
 * Creates one delivery per recipient, resolved now rather than at scheduling time (L2-032 AC1).
 * ON CONFLICT DO NOTHING keeps this safe to repeat after a crash.
 */
export async function materialiseDeliveries(db: Db, email: EmailRecord) {
  const guests = await db.guest.findMany({
    where: { eventId: email.eventId, ...(email.audience === 'non-responders' ? { response: { is: null } } : {}) },
    select: { id: true },
  });
  await db.delivery.createMany({
    data: guests.map((g) => ({ emailId: email.id, guestId: g.id, idempotencyKey: `email-${email.id}-guest-${g.id}` })),
    skipDuplicates: true,
  });
}

export async function dueDeliveries(db: Db, emailId: number, now: number) {
  return db.delivery.findMany({
    where: { emailId, status: 'Pending', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date(now) } }] },
    include: { guest: { include: { response: { select: { guestId: true } } } } },
    orderBy: { id: 'asc' },
  });
}

export const markDelivery = (db: Db, id: number, data: { status: 'Sent' | 'Failed' | 'Cancelled' | 'Pending'; attempts?: number; nextAttemptAt?: Date | null; lastError?: string | null; sentAt?: Date }) =>
  db.delivery.update({ where: { id }, data });

/** Closes the email once nothing is pending: Sent if anything went out (or nothing needed to), Failed if every delivery failed. */
export async function settleEmail(db: Db, emailId: number, now: number) {
  const counts = await db.delivery.groupBy({ by: ['status'], where: { emailId }, _count: { _all: true }, orderBy: { status: 'asc' } });
  const n = (s: string) => counts.find((c) => c.status === s)?._count?._all ?? 0;
  if (n('Pending') > 0) {
    await db.email.update({ where: { id: emailId }, data: { lockedUntil: null } });
    return 'Sending' as const;
  }
  const status = n('Failed') > 0 && n('Sent') === 0 ? 'Failed' : 'Sent';
  await db.email.update({ where: { id: emailId }, data: { status, recipients: n('Sent'), sentAt: new Date(now), lockedUntil: null } });
  return status;
}
