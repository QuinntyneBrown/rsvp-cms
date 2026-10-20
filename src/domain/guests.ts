import { EMAIL_RE, fail, pass, type Validated } from './result.js';

export interface GuestInput {
  name: string;
  email: string;
  group: string;
  plusOnes: number;
}

export function validateGuest(input: Record<string, unknown>): Validated<GuestInput> {
  const errors: Record<string, string> = {};
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const group = String(input.group ?? '').trim();
  const rawPlus = input.plusOnes ?? 0;
  const plusOnes = typeof rawPlus === 'number' ? rawPlus : Number(rawPlus);

  if (!name) errors.name = "Add the guest's full name";
  else if (name.length > 120) errors.name = 'Full name can be up to 120 characters';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter an email like name@example.com';
  if (!Number.isInteger(plusOnes) || plusOnes < 0 || plusOnes > 9) errors.plusOnes = 'Plus-ones must be a whole number from 0 to 9';

  return Object.keys(errors).length ? fail(errors) : pass({ name, email, group, plusOnes });
}

/** Places a guest already confirmed beyond themselves (party size - 1). */
export function confirmedPlusOnes(partySize: number | null): number {
  return partySize && partySize > 1 ? partySize - 1 : 0;
}

export const PLUS_ONES_BELOW_CONFIRMED =
  'This guest has already confirmed more places. Ask them to change their reply before lowering plus-ones.';
