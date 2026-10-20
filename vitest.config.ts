import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/{unit,integration,acceptance}/**/*.spec.{ts,tsx}'],
    // Database-backed tests are slower than pure unit tests on a cold Postgres connection.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
