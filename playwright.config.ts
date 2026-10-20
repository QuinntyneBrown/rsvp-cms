import { defineConfig } from '@playwright/test';

/**
 * Browser tests of the organiser and guest apps. Only the two Vite dev servers run: every /api call is
 * answered by the in-memory fake in tests/e2e/support/fake-backend.ts, so no API server or database is needed.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // Written ahead of the UI against a running API; they await the features they describe and a port to the fake.
  testIgnore: ['organiser.spec.ts', 'guest.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    // Lets a machine with a preinstalled Chromium run the suite without `playwright install`.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: [
    { command: 'npm run dev:admin', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: 'npm run dev:rsvp', url: 'http://localhost:5174', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
