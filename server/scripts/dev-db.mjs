import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'password',
  port: 5433,
  persistent: true,
});

try {
  await pg.initialise();
  console.log('[dev-db] cluster initialized');
} catch (err) {
  console.log('[dev-db] cluster already exists, reusing data directory');
}

await pg.start();
console.log('[dev-db] postgres running on port 5433');

try {
  await pg.createDatabase('wania');
  console.log('[dev-db] database "wania" created');
} catch {
  console.log('[dev-db] database "wania" already exists');
}

console.log('[dev-db] DATABASE_URL=postgres://postgres:password@localhost:5433/wania');
console.log('[dev-db] Press Ctrl+C to stop.');

async function stop() {
  console.log('\n[dev-db] stopping...');
  await pg.stop().catch(() => undefined);
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});
