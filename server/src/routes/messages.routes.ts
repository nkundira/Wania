import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { messageLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  createConversation,
  deleteMessage,
  getConversation,
  insertMessage,
  listCallHistory,
  listConversations,
  listMessages,
  markConversationRead,
} from '../services/messages.service.js';
import { iceServers } from '../services/calls.service.js';

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ conversations: await listConversations(authUser(req).id) });
  })
);

conversationsRouter.post(
  '/',
  validate({
    body: z.object({
      type: z.enum(['direct', 'group']).default('direct'),
      memberIds: z.array(z.string().uuid()).min(1).max(50),
      title: z.string().trim().max(80).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const conversation = await createConversation(authUser(req).id, req.body);
    res.status(201).json({ conversation });
  })
);

conversationsRouter.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ conversation: await getConversation(authUser(req).id, req.params.id) });
  })
);

conversationsRouter.get(
  '/:id/messages',
  validate({
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().optional() }),
  }),
  asyncHandler(async (req, res) => {
    res.json(
      await listMessages(
        authUser(req).id,
        req.params.id,
        req.query.cursor as string | undefined,
        Number(req.query.limit) || undefined
      )
    );
  })
);

conversationsRouter.post(
  '/:id/messages',
  messageLimiter,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      body: z.string().max(4000).optional(),
      kind: z.enum(['text', 'image', 'video', 'voice', 'snap', 'story_reply']).optional(),
      attachmentIds: z.array(z.string().uuid()).max(4).optional(),
      replyToId: z.string().uuid().optional(),
      expiresAt: z.string().datetime().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const message = await insertMessage({
      conversationId: req.params.id,
      senderId: user.id,
      body: req.body.body,
      kind: req.body.kind,
      attachmentIds: req.body.attachmentIds,
      replyToId: req.body.replyToId,
      expiresAt: req.body.expiresAt,
    });
    res.status(201).json({ message });
  })
);

conversationsRouter.post(
  '/:id/read',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await markConversationRead(authUser(req).id, req.params.id));
  })
);

export const messagesRouter = Router();
messagesRouter.use(requireAuth);
messagesRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await deleteMessage(authUser(req).id, req.params.id));
  })
);

export const callsRouter = Router();
callsRouter.use(requireAuth);
callsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ calls: await listCallHistory(authUser(req).id) });
  })
);
callsRouter.get('/ice-servers', (_req, res) => {
  res.json({ iceServers: iceServers() });
});
