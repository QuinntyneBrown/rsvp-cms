import { config } from '../config/index.js';
import { openDb } from '../data/db.js';
import { MemoryStore } from '../data/memoryStore.js';
import { PrismaStore } from '../data/prismaStore.js';
import type { Store } from '../data/store.js';
import { seed } from '../data/seed.js';
import { LogTransport, MemoryTransport, SmtpTransport, type MailTransport } from '../shared/mail/transport.js';
import { startMailWorker } from '../shared/mail/worker.js';
import { createApp } from './app.js';

function transport(): MailTransport {
  if (config.MAIL_TRANSPORT === 'smtp') {
    if (!config.SMTP_URL) throw new Error('MAIL_TRANSPORT=smtp needs SMTP_URL');
    return new SmtpTransport(config.SMTP_URL, config.MAIL_FROM);
  }
  return config.MAIL_TRANSPORT === 'memory' ? new MemoryTransport() : new LogTransport();
}

// PostgreSQL in every real deployment; STORE=memory runs without a database (the e2e run uses it).
const db = config.STORE === 'postgres' ? openDb({ url: config.DATABASE_URL, schema: config.DATABASE_SCHEMA }) : null;
const store: Store = db ? new PrismaStore(db) : new MemoryStore();
if (config.SEED === 'true') await seed(store);

const now = () => Date.now();
const stopWorker =
  config.MAIL_WORKER === 'true' ? startMailWorker({ store, transport: transport(), now, rsvpUrl: config.RSVP_URL }, config.MAIL_POLL_MS) : () => {};

const server = createApp({ store, now, rsvpUrl: config.RSVP_URL }).listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopWorker();
    server.close(() => void (db?.$disconnect() ?? Promise.resolve()).then(() => process.exit(0)));
  });
}
