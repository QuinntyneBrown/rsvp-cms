import { describe, expect, it } from 'vitest';
import { EVENT_TYPES, validateNewEvent } from '../../../src/domain/events.js';

const valid = { type: 'Birthday', name: "Maya's 30th", date: '2026-11-14', startTime: '19:00', venue: '' };

describe('new event rules (L2-006)', () => {
  it('offers the L1-002 occasions', () => {
    expect(EVENT_TYPES).toEqual(['Birthday', 'Holiday', 'Anniversary', 'Other']);
  });

  it('AC2 needs a name of up to 120 characters', () => {
    expect(validateNewEvent({ ...valid, name: ' ' }, '2026-10-19').ok).toBe(false);
    expect(validateNewEvent({ ...valid, name: 'x'.repeat(120) }, '2026-10-19').ok).toBe(true);
    expect(validateNewEvent({ ...valid, name: 'x'.repeat(121) }, '2026-10-19').ok).toBe(false);
  });

  it('AC3 refuses a past date but accepts today', () => {
    const past = validateNewEvent({ ...valid, date: '2026-10-18' }, '2026-10-19');
    expect(!past.ok && past.errors.date).toBe('Pick a date in the future');
    expect(validateNewEvent({ ...valid, date: '2026-10-19' }, '2026-10-19').ok).toBe(true);
  });

  it('needs a known type and a start time', () => {
    const v = validateNewEvent({ ...valid, type: 'Wedding', startTime: '' }, '2026-10-19');
    expect(!v.ok && Object.keys(v.errors)).toEqual(['type', 'startTime']);
  });
});
