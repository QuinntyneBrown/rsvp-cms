import type { Store } from './store.js';
import { hashPassword } from '../domain/password.js';

export const SEED_ORGANISER = { email: 'olivia@example.com', name: 'Olivia', password: 'correct horse' };

/** Idempotent: adds the demo organiser only when missing. */
export async function seed(store: Store) {
  if (!(await store.findOrganiserByEmail(SEED_ORGANISER.email))) {
    await store.createOrganiser(SEED_ORGANISER.email, SEED_ORGANISER.name, hashPassword(SEED_ORGANISER.password));
  }
}
