import type { Db } from './db.js';
import { createOrganiser, findOrganiserByEmail } from './repos.js';
import { hashPassword } from '../domain/password.js';

export const SEED_ORGANISER = { email: 'olivia@example.com', name: 'Olivia', password: 'correct horse' };

/** Idempotent: adds the demo organiser only when missing. */
export async function seed(db: Db) {
  if (!(await findOrganiserByEmail(db, SEED_ORGANISER.email))) {
    await createOrganiser(db, SEED_ORGANISER.email, SEED_ORGANISER.name, hashPassword(SEED_ORGANISER.password));
  }
}
