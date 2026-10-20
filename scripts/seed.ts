// Adds the demo organiser (olivia@example.com / "correct horse") to the PostgreSQL database in DATABASE_URL.
import { config } from '../src/config/index.js';
import { openDb } from '../src/data/db.js';
import { PrismaStore } from '../src/data/prismaStore.js';
import { seed, SEED_ORGANISER } from '../src/data/seed.js';

const db = openDb({ url: config.DATABASE_URL, schema: config.DATABASE_SCHEMA });
await seed(new PrismaStore(db));
await db.$disconnect();
console.log(`Seeded ${SEED_ORGANISER.email}`);
