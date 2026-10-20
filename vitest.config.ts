import { defineConfig } from 'vitest/config';

// Database-backed tests are slower than pure unit tests on a cold Postgres connection.
const timeouts = { testTimeout: 20_000, hookTimeout: 30_000 };

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tests/{unit,integration,acceptance}/**/*.spec.ts'],
          ...timeouts,
        },
      },
      {
        test: {
          name: 'dom',
          include: ['tests/unit/**/*.spec.tsx'],
          environment: 'jsdom',
          setupFiles: ['tests/unit/dom-setup.ts'],
          ...timeouts,
        },
      },
    ],
  },
});
