import { describe, expect, it } from 'vitest';
import { formatDay, LIMITS, repliesClosedMessage, validateReply } from '../../../src/domain/rsvp.js';

describe('validateReply (L2-040, L2-041)', () => {
  it('L2-041 AC1 needs a yes or no first', () => {
    expect(validateReply({}, 1)).toEqual({ ok: false, errors: { attending: "Choose whether you're coming" } });
  });

  it('L2-043 AC3 a decline clears party size, meal and the yes-only fields', () => {
    const v = validateReply({ attending: false, partySize: 3, meal: 'Fish', dietary: 'x', song: 'y', message: ' Sorry ' }, 3);
    expect(v).toEqual({ ok: true, value: { attending: false, partySize: 0, meal: null, guestNames: [], dietary: '', song: '', message: 'Sorry' } });
  });

  it('L2-040 AC3 asks for one name per extra place and ignores names beyond the party', () => {
    const v = validateReply({ attending: true, partySize: 2, meal: 'Beef', guestNames: ['Sam', 'Extra'] }, 3);
    expect(v.ok && v.value.guestNames).toEqual(['Sam']);
    const missing = validateReply({ attending: true, partySize: 3, meal: 'Beef', guestNames: ['Sam'] }, 3);
    expect(!missing.ok && missing.errors).toEqual({ 'guestNames.1': 'Add the name of your guest' });
  });

  it('L2-040 AC5 enforces the 500 / 120 / 280 limits exactly', () => {
    const at = (k: string, n: number) => validateReply({ attending: true, meal: 'Fish', [k]: 'x'.repeat(n) }, 1);
    expect(at('dietary', LIMITS.dietary).ok).toBe(true);
    expect(at('dietary', LIMITS.dietary + 1).ok).toBe(false);
    expect(at('song', LIMITS.song + 1).ok).toBe(false);
    expect(validateReply({ attending: false, message: 'x'.repeat(LIMITS.message + 1) }, 1).ok).toBe(false);
  });

  it('refuses a party bigger than the invitation or smaller than one, and an unknown meal', () => {
    expect(validateReply({ attending: true, meal: 'Fish', partySize: 0 }, 2).ok).toBe(false);
    expect(validateReply({ attending: true, meal: 'Fish', partySize: 3 }, 2).ok).toBe(false);
    expect(validateReply({ attending: true, meal: 'Pizza' }, 1).ok).toBe(false);
  });
});

describe('dates shown to guests (L2-009 AC4, L2-039 AC2)', () => {
  it('formats a day like "Sat 7 Nov"', () => {
    expect(formatDay('2026-11-07')).toBe('Sat 7 Nov');
    expect(formatDay('2027-01-01')).toBe('Fri 1 Jan');
  });

  it('closes replies at the end of the last day', () => {
    expect(repliesClosedMessage('2026-11-07')).toBe('Replies closed on Sat 7 Nov, 11:59 pm');
  });
});
