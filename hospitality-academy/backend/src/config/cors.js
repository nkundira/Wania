// Shared CORS origin policy for HTTP and Socket.IO.
import dotenv from 'dotenv';
dotenv.config();

// FRONTEND_URL may be a comma-separated list of allowed origins.
const configured = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function isAllowedOrigin(origin) {
  // Same-origin / non-browser requests have no Origin header.
  if (!origin) return true;
  if (configured.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    // Allow Vercel production + preview deployments.
    if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

export function corsOrigin(origin, callback) {
  callback(null, isAllowedOrigin(origin));
}
