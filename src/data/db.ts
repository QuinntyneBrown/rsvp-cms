import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';

export type Db = PrismaClient;

export interface DbOptions {
  url: string;
  /** Postgres schema to use instead of `public`; tests give each worker its own. */
  schema?: string;
}

export function openDb({ url, schema }: DbOptions): Db {
  const adapter = new PrismaPg(
    { connectionString: url, ...(schema ? { options: `-c search_path=${schema}` } : {}) },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({ adapter });
}
