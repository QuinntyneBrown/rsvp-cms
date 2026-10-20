import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  /** postgres for every real deployment; memory keeps everything in the process (e2e runs, demos without Docker). */
  STORE: z.enum(['postgres', 'memory']).default('postgres'),
  DATABASE_URL: z.string().default('postgresql://rsvp:rsvp@localhost:5433/rsvp'),
  /** Postgres schema; leave unset for `public`. */
  DATABASE_SCHEMA: z.string().optional(),
  SEED: z.string().default('true'),
  /** Base URL of the guest app, used in personal links. */
  RSVP_URL: z.string().default('http://localhost:5174'),
  /** log prints messages, smtp sends them through SMTP_URL, memory keeps them in the process (e2e). */
  MAIL_TRANSPORT: z.enum(['log', 'smtp', 'memory']).default('log'),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('invitations@invitely.example'),
  MAIL_WORKER: z.string().default('true'),
  MAIL_POLL_MS: z.coerce.number().int().positive().default(30_000),
});

export const config = schema.parse(process.env);
