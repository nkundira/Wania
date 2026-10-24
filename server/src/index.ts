import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { initSockets } from './sockets/index.js';

const app = createApp();
const server = http.createServer(app);
initSockets(server);

async function cleanupExpired() {
  try {
    await pool.query(`UPDATE stories SET deleted_at=now() WHERE expires_at < now() AND deleted_at IS NULL`);
    await pool.query(
      `UPDATE messages SET body='', deleted_at=now() WHERE expires_at IS NOT NULL AND expires_at < now() AND deleted_at IS NULL`
    );
    await pool.query(`DELETE FROM auth_tokens WHERE expires_at < now() - interval '7 days'`);
    await pool.query(`DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days'`);
  } catch (err) {
    console.error('[cleanup] failed', (err as Error).message);
  }
}

const cleanupTimer = setInterval(cleanupExpired, 5 * 60 * 1000);
cleanupTimer.unref();

server.listen(env.PORT, () => {
  console.log(`WANIA API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down`);
  clearInterval(cleanupTimer);
  server.close(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
