import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/data/prisma/schema.prisma',
  migrations: { path: 'src/data/prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://rsvp:rsvp@localhost:5433/rsvp' },
});
