import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { forgotLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, badRequest, forbidden, notFound, unauthorized } from '../utils/errors.js';
import { authUser } from '../utils/helpers.js';
import {
  clearRefreshCookie,
  consumeAuthToken,
  createAuthToken,
  exposeDevToken,
  findLoginUser,
  findUserById,
  hashPassword,
  issueAuth,
  REFRESH_COOKIE,
  registerUser,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  sendTransactionalEmail,
  verifyPassword,
} from '../services/auth.service.js';
import { getProfileById, deactivateAccount, deleteAccount, reactivateAccount } from '../services/users.service.js';
import { onboardingProgress } from '../services/ai.service.js';

export const authRouter = Router();

const username = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9._]+$/, 'Use only letters, numbers, dots, and underscores');

authRouter.post(
  '/register',
  registerLimiter,
  validate({
    body: z.object({
      username,
      email: z.string().email().max(254),
      password: z.string().min(8, 'Password must be at least 8 characters').max(128),
      displayName: z.string().trim().min(1).max(50),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { username: uname, email, password, displayName } = req.body;
    const user = await registerUser({ username: uname, email, password, displayName });
    const accessToken = await issueAuth(user.id, req, res);
    const [profile, onboarding] = await Promise.all([getProfileById(user.id, user.id), onboardingProgress(user.id)]);
    res.status(201).json({ accessToken, user: profile, onboarding });
  })
);

authRouter.post(
  '/login',
  loginLimiter,
  validate({
    body: z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) }),
  }),
  asyncHandler(async (req, res) => {
    const user = await findLoginUser(req.body.identifier);
    if (!user || !user.password_hash) throw unauthorized('Incorrect username/email or password');
    const valid = await verifyPassword(req.body.password, user.password_hash);
    if (!valid) throw unauthorized('Incorrect username/email or password');
    if (!user.is_active) {
      throw new (await import('../utils/errors.js')).HttpError(
        403,
        'This account is deactivated. Reactivate it to sign in.',
        'ACCOUNT_DEACTIVATED'
      );
    }
    const accessToken = await issueAuth(user.id, req, res);
    const [profile, onboarding] = await Promise.all([getProfileById(user.id, user.id), onboardingProgress(user.id)]);
    res.json({ accessToken, user: profile, onboarding });
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw unauthorized('Session not found');
    const { userId, raw: newRaw } = await rotateRefreshToken(raw, req);
    res.cookie(REFRESH_COOKIE, newRaw, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    });
    const { signAccessToken } = await import('../services/auth.service.js');
    const user = await findUserById(userId);
    if (!user || !user.is_active) throw unauthorized('Account is unavailable');
    const [profile, onboarding] = await Promise.all([getProfileById(userId, userId), onboardingProgress(userId)]);
    res.json({ accessToken: signAccessToken(userId), user: profile, onboarding });
  })
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res);
    res.status(204).end();
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const [profile, onboarding] = await Promise.all([getProfileById(user.id, user.id), onboardingProgress(user.id)]);
    res.json({ user: profile, onboarding });
  })
);

authRouter.post(
  '/forgot-password',
  forgotLimiter,
  validate({ body: z.object({ email: z.string().email() }) }),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT id, username FROM users WHERE email=$1 AND is_active=true`, [
      req.body.email.toLowerCase(),
    ]);
    let devToken: string | undefined;
    if (rows[0]) {
      const token = await createAuthToken(rows[0].id, 'password_reset', 60);
      const link = `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
      await sendTransactionalEmail(
        req.body.email,
        'Reset your WANIA password',
        `Hi @${rows[0].username},\n\nReset your WANIA password using this link (valid for 60 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`
      );
      devToken = exposeDevToken(token);
    }
    res.json({
      message: 'If that email is registered, a reset link has been sent.',
      ...(devToken ? { devToken } : {}),
    });
  })
);

authRouter.post(
  '/reset-password',
  validate({
    body: z.object({ token: z.string().min(10), password: z.string().min(8).max(128) }),
  }),
  asyncHandler(async (req, res) => {
    const userId = await consumeAuthToken(req.body.token, 'password_reset');
    const hash = await hashPassword(req.body.password);
    await query(`UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1`, [userId, hash]);
    await revokeAllUserTokens(userId);
    res.json({ message: 'Password updated. Please sign in.' });
  })
);

authRouter.post(
  '/verify-email',
  validate({ body: z.object({ token: z.string().min(10) }) }),
  asyncHandler(async (req, res) => {
    const userId = await consumeAuthToken(req.body.token, 'email_verify');
    await query(`UPDATE users SET email_verified=true, updated_at=now() WHERE id=$1`, [userId]);
    res.json({ verified: true });
  })
);

authRouter.post(
  '/send-verification',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    if (user.email_verified) return res.json({ message: 'Email already verified' });
    const token = await createAuthToken(user.id, 'email_verify', 24 * 60);
    const link = `${env.CLIENT_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
    await sendTransactionalEmail(
      user.email,
      'Verify your WANIA email',
      `Confirm your WANIA email address (valid for 24 hours):\n${link}`
    );
    res.json({ message: 'Verification email sent', ...(exposeDevToken(token) ? { devToken: exposeDevToken(token) } : {}) });
  })
);

authRouter.patch(
  '/password',
  requireAuth,
  validate({
    body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }),
  }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const full = await findUserById(user.id);
    if (!full?.password_hash || !(await verifyPassword(req.body.currentPassword, full.password_hash))) {
      throw forbidden('Current password is incorrect');
    }
    const hash = await hashPassword(req.body.newPassword);
    await query(`UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1`, [user.id, hash]);
    await revokeAllUserTokens(user.id);
    const accessToken = await issueAuth(user.id, req, res);
    res.json({ message: 'Password changed', accessToken });
  })
);

authRouter.post(
  '/deactivate',
  requireAuth,
  validate({ body: z.object({ password: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const full = await findUserById(user.id);
    if (!full?.password_hash || !(await verifyPassword(req.body.password, full.password_hash))) {
      throw forbidden('Password is incorrect');
    }
    await deactivateAccount(user.id);
    clearRefreshCookie(res);
    res.json({ deactivated: true });
  })
);

authRouter.post(
  '/reactivate',
  validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const userId = await reactivateAccount(req.body.email, req.body.password);
    const accessToken = await issueAuth(userId, req, res);
    const [profile, onboarding] = await Promise.all([getProfileById(userId, userId), onboardingProgress(userId)]);
    res.json({ accessToken, user: profile, onboarding });
  })
);

authRouter.delete(
  '/account',
  requireAuth,
  validate({ body: z.object({ password: z.string().min(1), confirm: z.literal('DELETE') }) }),
  asyncHandler(async (req, res) => {
    const user = authUser(req);
    const full = await findUserById(user.id);
    if (!full?.password_hash || !(await verifyPassword(req.body.password, full.password_hash))) {
      throw forbidden('Password is incorrect');
    }
    await deleteAccount(user.id);
    clearRefreshCookie(res);
    res.json({ deleted: true });
  })
);
