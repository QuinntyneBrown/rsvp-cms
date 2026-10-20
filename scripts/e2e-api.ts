// API server for the Playwright run: a freshly migrated rsvp_e2e database, the demo organiser,
// messages kept in memory and a fast mail worker, so scheduled emails are really sent during the run.
import { resetSchema } from '../src/data/migrate.js';

const url = process.env.E2E_DATABASE_URL ?? 'postgresql://rsvp:rsvp@localhost:5433/rsvp_e2e';
await resetSchema(url, 'public');

Object.assign(process.env, {
  DATABASE_URL: url,
  SEED: 'true',
  MAIL_TRANSPORT: 'memory',
  MAIL_WORKER: 'true',
  MAIL_POLL_MS: '1000',
  PORT: process.env.PORT ?? '3000',
});
await import('../src/api/server.js');
