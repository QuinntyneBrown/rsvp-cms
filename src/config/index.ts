import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_PATH: z.string().default('rsvp-cms.db'),
  SEED: z.string().default('true'),
});

export const config = schema.parse(process.env);
