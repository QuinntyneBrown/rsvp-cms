import { fail, pass, type Validated } from './result.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Sat 7 Nov'. */
export function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The invite window closes at the end of its last day (L2-009 AC4): "Replies closed on Sat 7 Nov, 11:59 pm". */
export const repliesClosedMessage = (inviteClose: string) => `Replies closed on ${formatDay(inviteClose)}, 11:59 pm`;

export const MEALS = ['Beef', 'Fish', 'Vegetarian'] as const;
export const LIMITS = { dietary: 500, song: 120, message: 280 } as const;

export interface Reply {
  attending: boolean;
  partySize: number; // 0 when declining
  meal: string | null;
  guestNames: string[];
  dietary: string;
  song: string;
  message: string;
}

/** `places` is 1 + the guest's plus-ones. */
export function validateReply(input: Record<string, unknown>, places: number): Validated<Reply> {
  const errors: Record<string, string> = {};
  const text = (k: string) => String(input[k] ?? '').trim();
  const dietary = text('dietary');
  const song = text('song');
  const message = text('message');

  if (typeof input.attending !== 'boolean') {
    return fail({ attending: "Choose whether you're coming" });
  }
  if (dietary.length > LIMITS.dietary) errors.dietary = `Dietary needs can be up to ${LIMITS.dietary} characters`;
  if (song.length > LIMITS.song) errors.song = `Song request can be up to ${LIMITS.song} characters`;
  if (message.length > LIMITS.message) errors.message = `Message can be up to ${LIMITS.message} characters`;

  if (!input.attending) {
    if (Object.keys(errors).length) return fail(errors);
    return pass({ attending: false, partySize: 0, meal: null, guestNames: [], dietary: '', song: '', message });
  }

  const partySize = Number(input.partySize ?? 1);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > places) errors.partySize = `Party size must be between 1 and ${places}`;
  const meal = String(input.meal ?? '');
  if (!MEALS.includes(meal as (typeof MEALS)[number])) errors.meal = 'Choose a meal';
  const names = Array.isArray(input.guestNames) ? input.guestNames.map((n) => String(n ?? '').trim()) : [];
  const guestNames = names.slice(0, Math.max(partySize - 1, 0));
  if (partySize > 1) {
    for (let i = 0; i < partySize - 1; i++) {
      if (!guestNames[i]) errors[`guestNames.${i}`] = 'Add the name of your guest';
    }
  }
  if (Object.keys(errors).length) return fail(errors);
  return pass({ attending: true, partySize, meal, guestNames, dietary, song, message: '' });
}
