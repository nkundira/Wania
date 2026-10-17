import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initDb() {
  const conn = await mariadb.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    multipleStatements: true
  });

  const schema = readFileSync(join(__dirname, '../../schema.sql'), 'utf8');
  await conn.query(schema);
  console.log('Database schema initialized successfully.');
  await conn.end();
}

initDb().catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
