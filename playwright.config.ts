import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: { trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev:api', url: 'http://localhost:3000/api/auth/me', ignoreHTTPSErrors: true, reuseExistingServer: false, env: { DATABASE_PATH: ':memory:', PORT: '3000' }, timeout: 60_000, stdout: 'pipe', gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 } },
    { command: 'npm run dev:admin', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run dev:rsvp', url: 'http://localhost:5174', reuseExistingServer: false, timeout: 60_000 },
  ],
});
