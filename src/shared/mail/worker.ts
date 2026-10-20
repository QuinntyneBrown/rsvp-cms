import type { Store } from '../../data/store.js';
import { invitationText, MAX_ATTEMPTS, personalLink, retryDelayMs } from '../../domain/invitations/message.js';
import type { MailTransport } from './transport.js';

export interface MailWorkerDeps {
  store: Store;
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
  const { store, transport } = deps;
  let sent = 0;
  let failed = 0;
  for (const id of await store.dueEmailIds(deps.now())) {
    if (!(await store.claimEmail(id, deps.now()))) continue;
    const ctx = await store.sendContext(id);
    if (!ctx) continue;
    await store.materialiseDeliveries(ctx.email);
    for (const d of await store.dueDeliveries(id, deps.now())) {
      // A guest who replied since scheduling no longer gets a "haven't replied" email (L2-032).
      if (ctx.email.audience === 'non-responders' && d.guest.hasReplied) {
        await store.markDelivery(d.id, { status: 'Cancelled' });
        continue;
      }
      const attempts = d.attempts + 1;
      try {
        await transport.send({
          to: d.guest.email,
          // The email's own sender wins, then Event settings, then the organiser (L2-036 AC1).
          fromName: ctx.email.senderName || ctx.event.senderName || ctx.organiserName,
          replyTo: ctx.email.replyTo || ctx.event.replyTo || undefined,
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
        await store.markDelivery(d.id, { status: 'Sent', attempts, sentAt: deps.now(), lastError: null });
        sent++;
      } catch (err) {
        const last = attempts >= MAX_ATTEMPTS;
        await store.markDelivery(d.id, {
          status: last ? 'Failed' : 'Pending',
          attempts,
          nextAttemptAt: last ? null : deps.now() + retryDelayMs(attempts),
          lastError: err instanceof Error ? err.message : String(err),
        });
        if (last) failed++;
      }
    }
    await store.settleEmail(id, deps.now());
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
