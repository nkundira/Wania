import { env, isProd } from './env.js';

const allowedOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
if (process.env.RENDER_EXTERNAL_URL) allowedOrigins.push(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ''));

export function isAllowedOrigin(origin: string) {
  if (allowedOrigins.includes(origin)) return true;
  if (!isProd) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.onrender.com');
  } catch {
    return false;
  }
}
