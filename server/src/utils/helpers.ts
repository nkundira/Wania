import crypto from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from './errors.js';

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/#([\p{L}\p{N}_]{1,40})/gu)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

export function extractMentions(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/@([A-Za-z0-9_]{3,24})/g)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function parseCursor(cursor?: string | null): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function makeCursor(createdAt: Date | string, id: string) {
  const iso = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
  return Buffer.from(`${iso}|${id}`).toString('base64url');
}

export function authUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'Authentication required', 'UNAUTHORIZED');
  return req.user;
}
