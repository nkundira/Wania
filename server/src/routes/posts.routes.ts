import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  explorePosts,
  feedPosts,
  getPost,
  likePost,
  listComments,
  listLikes,
  popularHashtags,
  reelsFeed,
  savedPosts,
  savePost,
  searchHashtags,
  searchPosts,
  unlikePost,
  unsavePost,
  updatePost,
} from '../services/posts.service.js';
import { searchUsers } from '../services/users.service.js';

export const discoverRouter = Router();
discoverRouter.use(requireAuth);

discoverRouter.get(
  '/feed',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await feedPosts(authUser(req).id, req.query.cursor as string | undefined, Number(req.query.limit) || undefined));
  })
);

discoverRouter.get(
  '/explore',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(
      await explorePosts(authUser(req).id, req.query.cursor as string | undefined, Number(req.query.limit) || undefined)
    );
  })
);

discoverRouter.get(
  '/reels',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await reelsFeed(authUser(req).id, req.query.cursor as string | undefined, Number(req.query.limit) || undefined));
  })
);

discoverRouter.get(
  '/hashtags/trending',
  asyncHandler(async (_req, res) => {
    res.json({ hashtags: await popularHashtags() });
  })
);

discoverRouter.get(
  '/hashtags/:tag/posts',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(
      await explorePosts(
        authUser(req).id,
        req.query.cursor as string | undefined,
        Number(req.query.limit) || undefined,
        req.params.tag
      )
    );
  })
);

discoverRouter.get(
  '/search',
  validate({ query: z.object({ q: z.string().trim().min(1).max(80) }) }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const q = String(req.query.q);
    const [users, posts, hashtags] = await Promise.all([
      searchUsers(user.id, q, 10),
      searchPosts(user.id, q, 12),
      searchHashtags(q, 8),
    ]);
    res.json({ users, posts, hashtags, query: q });
  })
);

export const postsRouter = Router();
postsRouter.use(requireAuth);

const mediaIds = z.array(z.string().uuid()).min(1).max(10);

postsRouter.post(
  '/',
  validate({
    body: z.object({
      type: z.enum(['post', 'reel']).default('post'),
      caption: z.string().max(2200).optional(),
      mediaIds,
      location: z.string().max(120).optional(),
      visibility: z.enum(['public', 'followers']).default('public'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const post = await createPost(authUser(req).id, req.body);
    res.status(201).json({ post });
  })
);

postsRouter.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ post: await getPost(authUser(req).id, req.params.id) });
  })
);

postsRouter.patch(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }), body: z.object({ caption: z.string().max(2200) }) }),
  asyncHandler(async (req, res) => {
    res.json({ post: await updatePost(authUser(req).id, req.params.id, req.body.caption) });
  })
);

postsRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await deletePost(authUser(req).id, req.params.id));
  })
);

postsRouter.post(
  '/:id/like',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await likePost(authUser(req).id, req.params.id));
  })
);

postsRouter.delete(
  '/:id/like',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await unlikePost(authUser(req).id, req.params.id));
  })
);

postsRouter.get(
  '/:id/likes',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ users: await listLikes(req.params.id, authUser(req).id) });
  })
);

postsRouter.get(
  '/:id/comments',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ comments: await listComments(req.params.id, authUser(req).id) });
  })
);

postsRouter.post(
  '/:id/comments',
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ body: z.string().trim().min(1).max(1000), parentId: z.string().uuid().optional() }),
  }),
  asyncHandler(async (req, res) => {
    const comment = await createComment(authUser(req).id, req.params.id, req.body.body, req.body.parentId);
    res.status(201).json({ comment });
  })
);

postsRouter.post(
  '/:id/save',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await savePost(authUser(req).id, req.params.id));
  })
);

postsRouter.delete(
  '/:id/save',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await unsavePost(authUser(req).id, req.params.id));
  })
);

export const commentsRouter = Router();
commentsRouter.use(requireAuth);
commentsRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await deleteComment(authUser(req).id, req.params.id));
  })
);

export const savedRouter = Router();
savedRouter.use(requireAuth);
savedRouter.get(
  '/',
  validate({ query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await savedPosts(authUser(req).id, req.query.cursor as string | undefined, Number(req.query.limit) || undefined));
  })
);
