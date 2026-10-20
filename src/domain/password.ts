import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fail, pass, type Validated } from './result.js';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const MIN_PASSWORD = 12;

/** The same rule as a reset (L2-004 AC4): at least 12 characters and not the email address. */
export function validateNewPassword(password: string, email: string): Validated<string> {
  if (password.length < MIN_PASSWORD) return fail({ newPassword: `Use at least ${MIN_PASSWORD} characters` });
  if (password.trim().toLowerCase() === email.trim().toLowerCase()) return fail({ newPassword: "Your password can't be your email address" });
  return pass(password);
}
