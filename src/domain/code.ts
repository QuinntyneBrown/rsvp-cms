import { randomBytes, randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function chunk(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Personal-link token: 256 random bits, URL-safe (L2-033 AC1 asks for at least 128). */
export const generateToken = () => randomBytes(32).toString('base64url');

/** Invitation code like MAYA-7K2Q. */
export function generateCode(): string {
  return `${chunk(4)}-${chunk(4)}`;
}

/** Case, spaces and a missing dash must not matter (L2-037). */
export function normaliseCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}
