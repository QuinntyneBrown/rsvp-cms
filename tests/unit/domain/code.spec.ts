import { describe, expect, it } from 'vitest';
import { generateCode, normaliseCode } from '../../../src/domain/code.js';

describe('invitation codes (L2-037)', () => {
  it('generates codes like MAYA-7K2Q without look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('AC1 ignores case, spaces and the dash', () => {
    for (const raw of ['maya-7k2q', ' MAYA 7K2Q ', 'maya7k2q', 'Maya.7K2Q']) expect(normaliseCode(raw)).toBe('MAYA-7K2Q');
  });

  it('leaves codes of the wrong length unmatched rather than guessing', () => {
    expect(normaliseCode('abc')).toBe('ABC');
  });
});
