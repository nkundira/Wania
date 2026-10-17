import { Router } from 'express';
import { register, login, logout, me, updateProfile, changePassword, registerValidators, loginValidators, changePasswordValidators } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later' } });

router.post('/register', authLimiter, registerValidators, register);
router.post('/login', authLimiter, loginValidators, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePasswordValidators, changePassword);

export default router;
