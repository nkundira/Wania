import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from '../services/notifications.service.js';
import { updateProfile } from '../services/users.service.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(
      await listNotifications(
        authUser(req).id,
        req.query.cursor as string | undefined,
        Number(req.query.limit) || undefined
      )
    );
  })
);

notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    res.json({ unread: await unreadNotificationCount(authUser(req).id) });
  })
);

notificationsRouter.post(
  '/read',
  validate({ body: z.object({ id: z.string().uuid().optional() }) }),
  asyncHandler(async (req, res) => {
    await markNotificationsRead(authUser(req).id, req.body.id);
    res.json({ unread: await unreadNotificationCount(authUser(req).id) });
  })
);

notificationsRouter.patch(
  '/preferences',
  validate({
    body: z.object({
      notifyFollows: z.boolean().optional(),
      notifyLikes: z.boolean().optional(),
      notifyComments: z.boolean().optional(),
      notifyMessages: z.boolean().optional(),
      notifyCalls: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const profile = await updateProfile(authUser(req).id, req.body);
    res.json({ settings: profile.settings });
  })
);
