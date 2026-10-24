import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { notFound } from '../utils/errors.js';

export type MediaRow = {
  id: string;
  owner_id: string;
  provider: 'local' | 'cloudinary';
  storage_key: string;
  public_id: string | null;
  url: string | null;
  media_type: 'image' | 'video' | 'audio';
  mime_type: string;
  size_bytes: string;
  width: number | null;
  height: number | null;
  duration_seconds: string | null;
  purpose: string;
  expires_at: string | null;
  created_at: string;
};

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const uploadRoot = path.resolve(serverRoot, env.UPLOAD_DIR);

if (env.MEDIA_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function mediaTypeFor(mime: string): 'image' | 'video' | 'audio' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'image';
}

const allowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
]);

export function isAllowedMime(mime: string) {
  return allowedMimes.has(mime);
}

export async function uploadBuffer(ownerId: string, buffer: Buffer, mime: string, purpose: string) {
  const type = mediaTypeFor(mime);
  let provider: 'local' | 'cloudinary' = 'local';
  let storageKey: string;
  let publicId: string | null = null;
  let url: string | null = null;

  if (env.MEDIA_PROVIDER === 'cloudinary') {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary is selected but credentials are missing');
    }
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', type: 'authenticated', folder: 'wania' },
        (err, uploaded) => (err || !uploaded ? reject(err) : resolve(uploaded as unknown as Record<string, unknown>))
      );
      stream.end(buffer);
    });
    provider = 'cloudinary';
    storageKey = String(result.public_id);
    publicId = String(result.public_id);
    url = String(result.resource_type ?? type);
  } else {
    await fs.promises.mkdir(uploadRoot, { recursive: true });
    const ext = mime.split('/')[1]?.replace('quicktime', 'mov').replace('mpeg', 'mp3') || 'bin';
    storageKey = `${crypto.randomUUID()}.${ext}`;
    await fs.promises.writeFile(path.join(uploadRoot, storageKey), buffer);
  }

  const { rows } = await query<MediaRow>(
    `INSERT INTO media (owner_id, provider, storage_key, public_id, url, media_type, mime_type, size_bytes, purpose)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [ownerId, provider, storageKey, publicId, url, type, mime, buffer.length, purpose]
  );
  return rows[0];
}

export async function getMediaById(id: string) {
  const { rows } = await query<MediaRow>(`SELECT * FROM media WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function readLocalMedia(media: MediaRow): Promise<string> {
  const full = path.resolve(uploadRoot, media.storage_key);
  if (!full.startsWith(path.resolve(uploadRoot) + path.sep)) throw notFound('Media not found');
  if (!fs.existsSync(full)) throw notFound('Media file not found');
  return full;
}

export function cloudinarySignedUrl(media: MediaRow, expiresAt: number) {
  return cloudinary.url(media.storage_key, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
    resource_type: media.url || media.media_type,
    expires_at: expiresAt,
  });
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', env.MEDIA_SIGNING_SECRET).update(payload).digest('base64url');
}

export function signMediaUrl(mediaId: string, viewerId = 'anonymous', ttlSeconds = env.MEDIA_URL_TTL_SECONDS) {
  const payload = Buffer.from(JSON.stringify({ m: mediaId, u: viewerId, e: Date.now() + ttlSeconds * 1000 })).toString(
    'base64url'
  );
  const token = `${payload}.${signPayload(payload)}`;
  const base = env.PUBLIC_API_URL.replace(/\/$/, '');
  return `${base}/api/media/${mediaId}?token=${encodeURIComponent(token)}`;
}

export function verifyMediaToken(token: string | undefined, mediaId: string): { viewerId: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.m !== mediaId) return null;
    if (!data.e || Date.now() > data.e) return null;
    return { viewerId: String(data.u) };
  } catch {
    return null;
  }
}

export async function removeLocalMediaFile(media: MediaRow) {
  if (media.provider !== 'local') return;
  const full = path.resolve(uploadRoot, media.storage_key);
  if (!full.startsWith(path.resolve(uploadRoot) + path.sep)) return;
  await fs.promises.unlink(full).catch(() => undefined);
}
