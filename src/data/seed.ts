import type { Db } from './db.js';
import { createOrganiser, findOrganiserByEmail } from './repos.js';
import { hashPassword } from '../domain/password.js';

export const SEED_ORGANISER = { email: 'olivia@example.com', name: 'Olivia', password: 'correct horse' };

/** Idempotent: adds the demo organiser only when missing. */
export function seed(db: Db) {
  if (!findOrganiserByEmail(db, SEED_ORGANISER.email)) {
    createOrganiser(db, SEED_ORGANISER.email, SEED_ORGANISER.name, hashPassword(SEED_ORGANISER.password));
  }
}
