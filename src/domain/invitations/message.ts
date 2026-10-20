/** What a guest receives. The preview renders the same text with a sample guest (L2-031 AC1). */
export interface InvitationParts {
  guestName: string;
  eventName: string;
  eventDate: string;
  link: string;
  code: string;
}

export function invitationText(p: InvitationParts): string {
  return [
    `Hi ${p.guestName},`,
    '',
    `You're invited to ${p.eventName} on ${p.eventDate}.`,
    `Reply with your personal link: ${p.link}`,
    '',
    `Or go to the invitation page and enter your code: ${p.code}`,
  ].join('\n');
}

export const SAMPLE_GUEST = { name: 'Maya Sample', token: 'SAMPLE-LINK', code: 'MAYA-7K2Q' } as const;

/** The personal link is the same in every email to a guest, invitation or reminder (L2-033 AC3). */
export const personalLink = (baseUrl: string, token: string) => `${baseUrl.replace(/\/+$/, '')}/i/${encodeURIComponent(token)}`;

/** Exponential back-off between attempts: 1, 2, 4 and 8 minutes, so 5 attempts finish well inside an hour (L2-035 AC2). */
export const MAX_ATTEMPTS = 5;
export const retryDelayMs = (attempts: number) => 60_000 * 2 ** Math.max(attempts - 1, 0);
