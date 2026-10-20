import { describe, expect, it } from 'vitest';
import { confirmedPlusOnes, validateGuest } from '../../../src/domain/guests.js';

describe('guest rules (L2-021, L2-022)', () => {
  it('L2-021 AC1 trims and lower-cases, and AC5 defaults plus-ones to 0', () => {
    expect(validateGuest({ name: ' Maya ', email: ' Maya@Example.COM ' })).toEqual({ ok: true, value: { name: 'Maya', email: 'maya@example.com', group: '', plusOnes: 0 } });
  });

  it('L2-021 AC4 limits the name to 1..120 characters', () => {
    expect(validateGuest({ name: 'x'.repeat(120), email: 'a@b.co' }).ok).toBe(true);
    expect(validateGuest({ name: 'x'.repeat(121), email: 'a@b.co' }).ok).toBe(false);
  });

  it('L2-021 AC5 accepts whole numbers 0..9 only', () => {
    for (const plusOnes of [0, 9, '3']) expect(validateGuest({ name: 'A', email: 'a@b.co', plusOnes }).ok).toBe(true);
    for (const plusOnes of [-1, 10, 1.5, 'two']) expect(validateGuest({ name: 'A', email: 'a@b.co', plusOnes }).ok).toBe(false);
  });

  it('L2-022 AC4 counts the places a guest confirmed beyond themselves', () => {
    expect(confirmedPlusOnes(null)).toBe(0);
    expect(confirmedPlusOnes(1)).toBe(0);
    expect(confirmedPlusOnes(3)).toBe(2);
  });
});
