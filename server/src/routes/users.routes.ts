import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { reportLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  blockUser,
  createReport,
  followUser,
  getProfile,
  listBlockedUsers,
  listFollowers,
  listFollowing,
  listFollowRequests,
  respondFollowRequest,
  searchUsers,
  unblockUser,
  unfollowUser,
  updateProfile,
} from '../services/users.service.js';
import { userPosts } from '../services/posts.service.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const idSchema = z.object({ id: z.string().uuid() });

usersRouter.get(
  '/search',
  validate({ query: z.object({ q: z.string().trim().min(1).max(80), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json({ users: await searchUsers(authUser(req).id, String(req.query.q), Number(req.query.limit) || 20) });
  })
);

usersRouter.patch(
  '/me',
  validate({
    body: z.object({
      displayName: z.string().trim().min(1).max(50).optional(),
      bio: z.string().max(300).optional(),
      isPrivate: z.boolean().optional(),
      showActivity: z.boolean().optional(),
      lastSeenVisibility: z.enum(['everyone', 'followers', 'nobody']).optional(),
      storyPrivacy: z.enum(['everyone', 'followers']).optional(),
      messagePrivacy: z.enum(['everyone', 'followers']).optional(),
      aiEnabled: z.boolean().optional(),
      aiHistoryEnabled: z.boolean().optional(),
      notifyFollows: z.boolean().optional(),
      notifyLikes: z.boolean().optional(),
      notifyComments: z.boolean().optional(),
      notifyMessages: z.boolean().optional(),
      notifyCalls: z.boolean().optional(),
      avatarMediaId: z.string().uuid().nullable().optional(),
      coverMediaId: z.string().uuid().nullable().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const profile = await updateProfile(user.id, req.body);
    res.json({ user: profile });
  })
);

usersRouter.get(
  '/me/follow-requests',
  asyncHandler(async (req, res) => {
    res.json({ requests: await listFollowRequests(authUser(req).id) });
  })
);

usersRouter.post(
  '/me/follow-requests/:requesterId/:action',
  validate({ params: z.object({ requesterId: z.string().uuid(), action: z.enum(['accept', 'decline']) }) }),
  asyncHandler(async (req, res) => {
    const result = await respondFollowRequest(
      authUser(req).id,
      req.params.requesterId,
      req.params.action === 'accept'
    );
    res.json(result);
  })
);

usersRouter.get(
  '/me/blocked',
  asyncHandler(async (req, res) => {
    res.json({ users: await listBlockedUsers(authUser(req).id) });
  })
);

usersRouter.get(
  '/:username',
  asyncHandler(async (req, res) => {
    res.json({ profile: await getProfile(req.params.username, authUser(req).id) });
  })
);

usersRouter.get(
  '/:username/followers',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(
      await listFollowers(
        req.params.username,
        authUser(req).id,
        req.query.cursor as string | undefined,
        Number(req.query.limit) || undefined
      )
    );
  })
);

usersRouter.get(
  '/:username/following',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(
      await listFollowing(
        req.params.username,
        authUser(req).id,
        req.query.cursor as string | undefined,
        Number(req.query.limit) || undefined
      )
    );
  })
);

usersRouter.get(
  '/:username/posts',
  validate({
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().optional(),
      type: z.enum(['post', 'reel', 'all']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(
      await userPosts(req.params.username, authUser(req).id, {
        cursor: req.query.cursor as string | undefined,
        limit: Number(req.query.limit) || undefined,
        type: (req.query.type as 'post' | 'reel' | 'all') || 'all',
      })
    );
  })
);

usersRouter.post(
  '/:id/follow',
  validate({ params: idSchema }),
  asyncHandler(async (req, res) => {
    res.json(await followUser(authUser(req).id, req.params.id));
  })
);

usersRouter.delete(
  '/:id/follow',
  validate({ params: idSchema }),
  asyncHandler(async (req, res) => {
    res.json(await unfollowUser(authUser(req).id, req.params.id));
  })
);

usersRouter.post(
  '/:id/block',
  validate({ params: idSchema }),
  asyncHandler(async (req, res) => {
    res.json(await blockUser(authUser(req).id, req.params.id));
  })
);

usersRouter.delete(
  '/:id/block',
  validate({ params: idSchema }),
  asyncHandler(async (req, res) => {
    res.json(await unblockUser(authUser(req).id, req.params.id));
  })
);

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.post(
  '/',
  reportLimiter,
  validate({
    body: z.object({
      targetType: z.enum(['user', 'post', 'comment', 'story', 'message']),
      targetId: z.string().uuid(),
      reason: z.string().trim().min(3).max(120),
      details: z.string().max(1000).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const report = await createReport(authUser(req).id, req.body);
    res.status(201).json({ report });
  })
);
