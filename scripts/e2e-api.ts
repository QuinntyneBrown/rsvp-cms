// API server for the Playwright run. Tests never use a real database, so it runs on the in-memory
// store with the demo organiser, keeps sent messages in memory and polls for due emails every second.
Object.assign(process.env, {
  STORE: 'memory',
  SEED: 'true',
  MAIL_TRANSPORT: 'memory',
  MAIL_WORKER: 'true',
  MAIL_POLL_MS: '1000',
  PORT: process.env.PORT ?? '3000',
});
await import('../src/api/server.js');
