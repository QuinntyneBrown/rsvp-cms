import { formatDay } from '../../domain/rsvp.js';

export { formatDay };

/** '16:00' → '4:00 pm', as the mocks write times. */
export function formatTime(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** 'YYYY-MM-DD' → 'Sat 14 Nov 2026'. */
export const formatDate = (day: string) => `${formatDay(day)} ${day.slice(0, 4)}`;

/** The last moment of the invite window: 'Sat 7 Nov, 11:59 pm'. */
export const formatClose = (inviteClose: string) => `${formatDay(inviteClose)}, 11:59 pm`;

/** ISO instant → 'Mon 19 Oct at 10:42 am' (UTC, the server's clock). */
export function formatInstant(iso: string): string {
  return `${formatDay(iso.slice(0, 10))} at ${formatTime(iso.slice(11, 16))}`;
}

/** 'Maya Chen' → 'Maya'. */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
