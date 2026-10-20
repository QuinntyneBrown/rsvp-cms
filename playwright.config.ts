import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: { trace: 'retain-on-failure' },
  webServer: [
    // Resets the rsvp_e2e PostgreSQL database (npm run db:up) and runs the API with the mail worker on.
    { command: 'npx tsx scripts/e2e-api.ts', url: 'http://localhost:3000/api/auth/me', ignoreHTTPSErrors: true, reuseExistingServer: false, env: { PORT: '3000' }, timeout: 60_000, stdout: 'pipe', gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 } },
    { command: 'npm run dev:admin', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run dev:rsvp', url: 'http://localhost:5174', reuseExistingServer: false, timeout: 60_000 },
  ],
});
