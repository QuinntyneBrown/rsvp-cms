import { config } from '../config/index.js';
import { openDb } from '../data/db.js';
import { seed } from '../data/seed.js';
import { createApp } from './app.js';

const db = openDb(config.DATABASE_PATH);
if (config.SEED === 'true') seed(db);

createApp({ db, now: () => Date.now() }).listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});
