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

export function validateSchedule(input: Record<string, unknown>, inviteClose: string): Validated<ScheduleInput> {
  const errors: Record<string, string> = {};
  const subject = stripBreaks(String(input.subject ?? ''));
  const sendOn = String(input.sendOn ?? '');
  const senderName = stripBreaks(String(input.senderName ?? ''));
  const replyTo = stripBreaks(String(input.replyTo ?? ''));
  const audience = input.audience === 'non-responders' ? 'non-responders' : 'all';

  if (!subject) errors.subject = 'Add a subject';
  else if (subject.length > 150) errors.subject = 'Subject can be up to 150 characters';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sendOn)) errors.sendOn = 'Pick a send date';
  else if (sendOn > inviteClose) errors.sendOn = 'Invitations must go out before invites close';
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) errors.replyTo = 'Enter an email like name@example.com';

  return Object.keys(errors).length ? fail(errors) : pass({ audience, subject, sendOn, senderName, replyTo });
}

/** Emails go out at 9:00 am on the send date. */
export const sendTime = (sendOn: string) => `${sendOn}T09:00`;
