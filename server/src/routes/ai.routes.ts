import { Router } from 'express';
import { z } from 'zod';
import { aiLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  aiStatus,
  chatWithAi,
  clearAiHistory,
  deleteAiConversation,
  getAiMessages,
  listAiConversations,
  onboardingProgress,
  restartOnboarding,
  updateOnboarding,
} from '../services/ai.service.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get('/status', (_req, res) => {
  res.json(aiStatus());
});

aiRouter.post(
  '/chat',
  aiLimiter,
  validate({
    body: z.object({
      message: z.string().trim().min(1).max(2000),
      page: z.string().max(80).optional(),
      conversationId: z.string().uuid().optional(),
      historyEnabled: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await chatWithAi(authUser(req).id, req.body));
  })
);

aiRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    res.json({ conversations: await listAiConversations(authUser(req).id) });
  })
);

aiRouter.get(
  '/conversations/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ messages: await getAiMessages(authUser(req).id, req.params.id) });
  })
);

aiRouter.delete(
  '/conversations/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await deleteAiConversation(authUser(req).id, req.params.id));
  })
);

aiRouter.delete(
  '/history',
  asyncHandler(async (req, res) => {
    res.json(await clearAiHistory(authUser(req).id));
  })
);

export const onboardingRouter = Router();
onboardingRouter.use(requireAuth);

onboardingRouter.get(
  '/progress',
  asyncHandler(async (req, res) => {
    res.json({ progress: await onboardingProgress(authUser(req).id) });
  })
);

onboardingRouter.patch(
  '/progress',
  validate({
    body: z.object({
      welcomeSeen: z.boolean().optional(),
      tourStep: z.number().int().min(0).max(50).optional(),
      tourCompleted: z.boolean().optional(),
      tourSkipped: z.boolean().optional(),
      completedSteps: z.array(z.number().int().min(0).max(50)).max(50).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json({ progress: await updateOnboarding(authUser(req).id, req.body) });
  })
);

onboardingRouter.post(
  '/restart',
  asyncHandler(async (req, res) => {
    res.json({ progress: await restartOnboarding(authUser(req).id) });
  })
);
