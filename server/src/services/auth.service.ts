import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { env, isProd } from '../config/env.js';
import { query, withTransaction } from '../db/pool.js';
import { HttpError, conflict, unauthorized } from '../utils/errors.js';
import { randomToken, sha256 } from '../utils/helpers.js';

export type UserRow = {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  email_verified: boolean;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export const REFRESH_COOKIE = 'wania_refresh';

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId, typ: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
}

function requestMeta(req: Request) {
  return { userAgent: req.get('user-agent')?.slice(0, 500) ?? null, ip: req.ip ?? null };
}

export async function createRefreshToken(userId: string, req: Request) {
  const raw = randomToken();
  const meta = requestMeta(req);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)`,
    [userId, sha256(raw), meta.userAgent, meta.ip, String(env.REFRESH_TOKEN_DAYS)]
  );
  return raw;
}

export async function rotateRefreshToken(raw: string, req: Request) {
  const hash = sha256(raw);
  const { rows } = await query(
    `SELECT id, user_id, expires_at, revoked_at, replaced_by FROM refresh_tokens WHERE token_hash = $1`,
    [hash]
  );
  const token = rows[0];
  if (!token) throw unauthorized('Session not found. Please sign in again.');
  if (token.revoked_at) {
    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [token.user_id]);
    throw unauthorized('This session was already used. Please sign in again.');
  }
  if (new Date(token.expires_at).getTime() < Date.now()) {
    throw unauthorized('Your session expired. Please sign in again.');
  }
  const newRaw = await createRefreshToken(token.user_id, req);
  const { rows: newRows } = await query('SELECT id FROM refresh_tokens WHERE token_hash = $1', [sha256(newRaw)]);
  await query('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1', [token.id, newRows[0].id]);
  return { userId: token.user_id as string, raw: newRaw };
}

export async function revokeRefreshToken(raw?: string) {
  if (!raw) return;
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [sha256(raw)]);
}

export async function revokeAllUserTokens(userId: string) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const user = await withTransaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *`,
      [input.username.trim(), input.email.trim().toLowerCase(), passwordHash]
    );
    const created = rows[0];
    await client.query(
      `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`,
      [created.id, input.displayName.trim()]
    );
    await client.query(`INSERT INTO user_onboarding_progress (user_id) VALUES ($1)`, [created.id]);
    return created;
  });
  return user;
}

export async function findLoginUser(identifier: string) {
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
    [identifier.trim()]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function issueAuth(userId: string, req: Request, res: Response) {
  const accessToken = signAccessToken(userId);
  const refresh = await createRefreshToken(userId, req);
  setRefreshCookie(res, refresh);
  await query(`UPDATE users SET last_login_at = now(), last_seen_at = now() WHERE id = $1`, [userId]);
  return accessToken;
}

export async function createAuthToken(userId: string, type: 'email_verify' | 'password_reset', ttlMinutes: number) {
  const raw = randomToken(32);
  await query(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, type, sha256(raw), String(ttlMinutes)]
  );
  return raw;
}

export async function consumeAuthToken(raw: string, type: 'email_verify' | 'password_reset') {
  const { rows } = await query(
    `UPDATE auth_tokens SET used_at = now()
     WHERE token_hash = $1 AND type = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [sha256(raw), type]
  );
  if (!rows[0]) throw new HttpError(400, 'This link is invalid or has expired', 'INVALID_TOKEN');
  return rows[0].user_id as string;
}

export async function sendTransactionalEmail(to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY is not configured; "${subject}" was not sent to ${to}`);
    if (!isProd) console.log(`[email:dev] To: ${to} | ${subject}\n${text}`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
    });
    if (!res.ok) {
      console.error('[email] provider error', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] request failed', (err as Error).message);
    return false;
  }
}

export function exposeDevToken(token: string) {
  return isProd ? undefined : token;
}
