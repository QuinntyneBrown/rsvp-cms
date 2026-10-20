import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), 'prisma', 'migrations');

const SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

/**
 * Drops and recreates `schema`, then applies every Prisma migration in order.
 * Used by the tests and the e2e server to get a clean database quickly; deployments use `prisma migrate deploy`.
 */
export async function resetSchema(url: string, schema: string): Promise<void> {
  if (!SCHEMA_NAME.test(schema)) throw new Error(`Invalid schema name: ${schema}`);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`drop schema if exists "${schema}" cascade`);
    await client.query(`create schema "${schema}"`);
    await client.query(`set search_path to "${schema}"`);
    const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const dir of dirs) await client.query(readFileSync(join(MIGRATIONS, dir, 'migration.sql'), 'utf8'));
  } finally {
    await client.end();
  }
}

/** Every table, for truncating between tests. */
export const TABLES = ['deliveries', 'emails', 'responses', 'guests', 'pages', 'events', 'sessions', 'organisers'] as const;
