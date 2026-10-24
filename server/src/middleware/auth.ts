import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { HttpError } from '../utils/errors.js';

type AccessPayload = { sub: string; typ: 'access' };

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    let payload: AccessPayload;
    try {
      payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AccessPayload;
    } catch {
      throw new HttpError(401, 'Your session expired. Please sign in again.', 'TOKEN_EXPIRED');
    }
    if (payload.typ !== 'access') throw new HttpError(401, 'Invalid token', 'UNAUTHORIZED');
    const { rows } = await query(
      `SELECT id, username, email, email_verified, is_active, last_seen_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (!rows[0] || !rows[0].is_active) {
      throw new HttpError(401, 'Account is unavailable', 'UNAUTHORIZED');
    }
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AccessPayload;
    query(
      `SELECT id, username, email, email_verified, is_active, last_seen_at, created_at, updated_at
       FROM users WHERE id = $1 AND is_active = true`,
      [payload.sub]
    )
      .then(({ rows }) => {
        if (rows[0]) req.user = rows[0];
        next();
      })
      .catch(next);
  } catch {
    next();
  }
}
