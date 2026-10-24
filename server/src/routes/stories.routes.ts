import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  activeStoriesForUser,
  createStory,
  deleteStory,
  getStory,
  listStoryViewers,
  reactToStory,
  replyToStory,
  storyFeed,
} from '../services/stories.service.js';

export const storiesRouter = Router();
storiesRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

storiesRouter.get(
  '/feed',
  asyncHandler(async (req, res) => {
    res.json({ groups: await storyFeed(authUser(req).id) });
  })
);

storiesRouter.get(
  '/user/:username',
  asyncHandler(async (req, res) => {
    res.json({ stories: await activeStoriesForUser(req.params.username, authUser(req).id) });
  })
);

storiesRouter.post(
  '/',
  validate({
    body: z.object({
      mediaId: z.string().uuid(),
      caption: z.string().max(300).optional(),
      privacy: z.enum(['everyone', 'followers']).optional(),
      hours: z.number().min(1).max(24).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const story = await createStory(authUser(req).id, req.body);
    res.status(201).json({ story });
  })
);

storiesRouter.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ story: await getStory(authUser(req).id, req.params.id) });
  })
);

storiesRouter.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await deleteStory(authUser(req).id, req.params.id));
  })
);

storiesRouter.post(
  '/:id/react',
  validate({ params: idParam, body: z.object({ emoji: z.string().min(1).max(8) }) }),
  asyncHandler(async (req, res) => {
    res.json(await reactToStory(authUser(req).id, req.params.id, req.body.emoji));
  })
);

storiesRouter.post(
  '/:id/reply',
  validate({ params: idParam, body: z.object({ body: z.string().trim().min(1).max(1000) }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await replyToStory(authUser(req).id, req.params.id, req.body.body));
  })
);

storiesRouter.get(
  '/:id/viewers',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ viewers: await listStoryViewers(authUser(req).id, req.params.id) });
  })
);
