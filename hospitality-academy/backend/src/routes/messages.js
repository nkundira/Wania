import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import * as mc from '../controllers/messageController.js';

const router = Router();
const msgLimiter = rateLimit({ windowMs: 1000, max: 20, message: { error: 'Too many messages' } });

router.get('/conversations', requireAuth, mc.listConversations);
router.post('/conversations', requireAuth, mc.getOrCreatePrivateConversation);
router.get('/conversations/:conversationId/messages', requireAuth, mc.getMessages);
router.post('/conversations/:conversationId/messages', requireAuth, msgLimiter, mc.sendMessage);
router.post('/users/:userId/block', requireAuth, mc.blockUser);
router.delete('/users/:userId/block', requireAuth, mc.unblockUser);
router.get('/calls/history', requireAuth, mc.getCallHistory);

export default router;
