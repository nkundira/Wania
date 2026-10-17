import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as cc from '../controllers/communityController.js';

const router = Router();
const postLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many posts, slow down' } });

router.get('/posts', optionalAuth, cc.listPosts);
router.post('/posts', requireAuth, postLimiter, cc.createPost);
router.get('/posts/:postId', optionalAuth, cc.getPost);
router.delete('/posts/:postId', requireAuth, cc.deletePost);
router.post('/posts/:postId/like', requireAuth, cc.likePost);
router.get('/posts/:postId/comments', cc.listComments);
router.post('/posts/:postId/comments', requireAuth, postLimiter, cc.addComment);
router.post('/users/:userId/follow', requireAuth, cc.followUser);
router.get('/users/:username/profile', optionalAuth, cc.getUserProfile);
router.get('/users/search', optionalAuth, cc.searchUsers);
router.get('/users/suggested', optionalAuth, cc.suggestedUsers);
router.get('/notifications', requireAuth, cc.getNotifications);
router.post('/notifications/read', requireAuth, cc.markNotificationsRead);
router.post('/reports', requireAuth, cc.reportContent);

export default router;
