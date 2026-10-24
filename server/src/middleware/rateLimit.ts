import rateLimit from 'express-rate-limit';
import { isProd } from '../config/env.js';

function limiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max: isProd ? max : max * 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message, code: 'RATE_LIMITED' } },
  });
}

export const loginLimiter = limiter(15 * 60 * 1000, 10, 'Too many sign-in attempts. Please wait 15 minutes.');
export const registerLimiter = limiter(60 * 60 * 1000, 20, 'Too many accounts created. Please try later.');
export const forgotLimiter = limiter(15 * 60 * 1000, 5, 'Too many reset requests. Please try later.');
export const aiLimiter = limiter(60 * 1000, 20, 'WANIA AI is getting a lot of questions. Please wait a moment.');
export const messageLimiter = limiter(60 * 1000, 60, 'You are sending messages too quickly.');
export const uploadLimiter = limiter(60 * 1000, 30, 'Too many uploads. Please wait a moment.');
export const reportLimiter = limiter(60 * 60 * 1000, 20, 'Too many reports submitted. Please try later.');
