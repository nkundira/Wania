import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  cloudinarySignedUrl,
  getMediaById,
  isAllowedMime,
  readLocalMedia,
  signMediaUrl,
  uploadBuffer,
  verifyMediaToken,
} from '../services/media.service.js';
import { canAccessMedia, mediaMessageContext } from '../services/mediaAccess.service.js';
import { markSnapViewed } from '../services/messages.service.js';

export const mediaRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedMime(file.mimetype)) {
      return cb(badRequest('Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, WAV, or WebM audio.'));
    }
    cb(null, true);
  },
});

const allowedPurposes = new Set(['avatar', 'cover', 'post', 'story', 'message', 'snap', 'voice', 'reel']);

mediaRouter.post(
  '/',
  requireAuth,
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    if (!req.file) throw badRequest('Choose a file to upload');
    const purpose = String(req.body.purpose ?? '');
    if (!allowedPurposes.has(purpose)) throw badRequest('Invalid upload purpose');
    const media = await uploadBuffer(user.id, req.file.buffer, req.file.mimetype, purpose);
    res.status(201).json({
      media: {
        id: media.id,
        type: media.media_type,
        mimeType: media.mime_type,
        size: Number(media.size_bytes),
        url: signMediaUrl(media.id, user.id),
      },
    });
  })
);

mediaRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const media = await getMediaById(req.params.id);
    if (!media) throw notFound('Media not found');
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const verified = verifyMediaToken(token, media.id);
    const publicMedia = media.purpose === 'avatar' || media.purpose === 'cover';
    if (!verified && !publicMedia) throw forbidden('This media link is invalid or expired');
    const viewerId = verified?.viewerId ?? null;
    const allowed = await canAccessMedia(media, viewerId);
    if (!allowed) throw forbidden('You do not have access to this media');

    if (media.provider === 'cloudinary') {
      const url = cloudinarySignedUrl(media, Math.floor(Date.now() / 1000) + 300);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.redirect(302, url);
    }

    if (media.purpose === 'snap' && viewerId) {
      const context = await mediaMessageContext(media.id);
      if (context && context.kind === 'snap' && context.sender_id !== viewerId && !context.viewed_at) {
        await markSnapViewed(viewerId, context.id);
      }
    }

    const filePath = await readLocalMedia(media);
    const isStory = media.purpose === 'story';
    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Cache-Control', isStory || media.purpose === 'snap' ? 'private, no-store' : 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  })
);
