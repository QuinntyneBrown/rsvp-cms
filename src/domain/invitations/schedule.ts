import { fail, pass, type Validated } from '../result.js';

export type Audience = 'all' | 'non-responders';

export interface ScheduleInput {
  audience: Audience;
  subject: string;
  sendOn: string; // YYYY-MM-DD
  senderName: string;
  replyTo: string;
}

const stripBreaks = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export interface SenderInput {
  senderName: string;
  replyTo: string;
}

/** The sender identity: line breaks are removed from the name (L2-036 AC3) and the reply-to must be an email (AC2). */
export function validateSender(input: Record<string, unknown>): Validated<SenderInput> {
  const senderName = stripBreaks(String(input.senderName ?? ''));
  const replyTo = stripBreaks(String(input.replyTo ?? ''));
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return fail({ replyTo: 'Enter a valid email address' });
  if (senderName.length > 120) return fail({ senderName: 'Sender name can be up to 120 characters' });
  return pass({ senderName, replyTo });
}

export function validateSchedule(input: Record<string, unknown>, inviteClose: string): Validated<ScheduleInput> {
  const errors: Record<string, string> = {};
  const subject = stripBreaks(String(input.subject ?? ''));
  const sendOn = String(input.sendOn ?? '');
  const sender = validateSender(input);
  const { senderName, replyTo } = sender.ok ? sender.value : { senderName: '', replyTo: '' };
  const audience = input.audience === 'non-responders' ? 'non-responders' : 'all';

  if (!subject) errors.subject = 'Add a subject';
  else if (subject.length > 150) errors.subject = 'Subject can be up to 150 characters';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sendOn)) errors.sendOn = 'Pick a send date';
  else if (sendOn > inviteClose) errors.sendOn = 'Invitations must go out before invites close';
  if (!sender.ok) Object.assign(errors, sender.errors);

  return Object.keys(errors).length ? fail(errors) : pass({ audience, subject, sendOn, senderName, replyTo });
}

/** Emails go out at 9:00 am on the send date. */
export const sendTime = (sendOn: string) => `${sendOn}T09:00`;
