import { fail, pass, type Validated } from './result.js';

/** The occasions named in L1-002, with the hint shown under each choice on New event. */
export const EVENT_TYPES = ['Birthday', 'Holiday', 'Anniversary', 'Other'] as const;
export const EVENT_TYPE_HINTS: Record<(typeof EVENT_TYPES)[number], string> = {
  Birthday: 'Milestones, dinners and parties',
  Holiday: 'Christmas, Diwali, Hanukkah, New Year',
  Anniversary: 'Weddings, years together',
  Other: 'Office parties, reunions, anything else',
};

export interface NewEvent {
  type: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  venue: string;
}

export function validateNewEvent(input: Record<string, unknown>, today: string): Validated<NewEvent> {
  const errors: Record<string, string> = {};
  const name = String(input.name ?? '').trim();
  const type = String(input.type ?? '');
  const date = String(input.date ?? '');
  const startTime = String(input.startTime ?? '');
  const venue = String(input.venue ?? '').trim();

  if (!name) errors.name = 'Add an event name';
  else if (name.length > 120) errors.name = 'Event name can be up to 120 characters';
  if (!EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) errors.type = 'Choose an event type';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Pick a date';
  else if (date < today) errors.date = 'Pick a date in the future';
  if (!/^\d{2}:\d{2}$/.test(startTime)) errors.startTime = 'Pick a start time';
  if (venue.length > 200) errors.venue = 'Venue can be up to 200 characters';

  return Object.keys(errors).length ? fail(errors) : pass({ type, name, date, startTime, venue });
}
