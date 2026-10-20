import type { Db } from '../../data/db.js';
import {
  claimEmail, dueDeliveries, dueEmailIds, markDelivery, materialiseDeliveries, sendContext, settleEmail,
} from '../../data/mailQueue.js';
import { invitationText, MAX_ATTEMPTS, personalLink, retryDelayMs } from '../../domain/invitations/message.js';
import type { MailTransport } from './transport.js';

export interface MailWorkerDeps {
  db: Db;
  transport: MailTransport;
  now: () => number;
  /** Base URL of the guest app, used to build personal links. */
  rsvpUrl: string;
}

/**
 * Sends every email that is due. Safe to run on several instances at once: each email is leased,
 * and each delivery has a unique idempotency key, so a guest gets one message per email.
 */
export async function sendDueEmails(deps: MailWorkerDeps): Promise<{ sent: number; failed: number }> {
  const { db, transport } = deps;
  let sent = 0;
  let failed = 0;
  for (const id of await dueEmailIds(db, deps.now())) {
    if (!(await claimEmail(db, id, deps.now()))) continue;
    const ctx = await sendContext(db, id);
    if (!ctx) continue;
    await materialiseDeliveries(db, ctx.email);
    for (const d of await dueDeliveries(db, id, deps.now())) {
      // A guest who replied since scheduling no longer gets a "haven't replied" email (L2-032).
      if (ctx.email.audience === 'non-responders' && d.guest.response) {
        await markDelivery(db, d.id, { status: 'Cancelled' });
        continue;
      }
      const attempts = d.attempts + 1;
      try {
        await transport.send({
          to: d.guest.email,
          fromName: ctx.email.senderName || ctx.organiserName,
          replyTo: ctx.email.replyTo || undefined,
          subject: ctx.email.subject,
          text: invitationText({
            guestName: d.guest.name,
            eventName: ctx.event.name,
            eventDate: ctx.event.date,
            link: personalLink(deps.rsvpUrl, d.guest.token),
            code: d.guest.code,
          }),
          idempotencyKey: d.idempotencyKey,
        });
        await markDelivery(db, d.id, { status: 'Sent', attempts, sentAt: new Date(deps.now()), lastError: null });
        sent++;
      } catch (err) {
        const last = attempts >= MAX_ATTEMPTS;
        await markDelivery(db, d.id, {
          status: last ? 'Failed' : 'Pending',
          attempts,
          nextAttemptAt: last ? null : new Date(deps.now() + retryDelayMs(attempts)),
          lastError: err instanceof Error ? err.message : String(err),
        });
        if (last) failed++;
      }
    }
    await settleEmail(db, id, deps.now());
  }
  return { sent, failed };
}

/** Polls for due emails until stopped. Errors are logged and the next tick tries again. */
export function startMailWorker(deps: MailWorkerDeps, intervalMs = 30_000): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueEmails(deps);
    } catch (err) {
      console.error('[mail] worker tick failed', err);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  void tick();
  return () => clearInterval(timer);
}
