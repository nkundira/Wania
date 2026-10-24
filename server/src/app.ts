import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { errorHandler } from './utils/errors.js';
import { authRouter } from './routes/auth.routes.js';
import { reportsRouter, usersRouter } from './routes/users.routes.js';
import { commentsRouter, discoverRouter, postsRouter, savedRouter } from './routes/posts.routes.js';
import { storiesRouter } from './routes/stories.routes.js';
import { callsRouter, conversationsRouter, messagesRouter } from './routes/messages.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { aiRouter, onboardingRouter } from './routes/ai.routes.js';
import { mediaRouter } from './routes/media.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const allowedOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
  if (process.env.RENDER_EXTERNAL_URL) allowedOrigins.push(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ''));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin) || !isProd) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api/media')) return;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: isProd ? 400 : 4000,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/media'),
      message: { error: { message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' } },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'WANIA', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/saved', savedRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/calls', callsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api', discoverRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { message: 'Endpoint not found', code: 'NOT_FOUND' } });
  });

  if (isProd) {
    const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const clientDist = path.resolve(env.CLIENT_DIST || path.join(serverRoot, '../client/dist'));
    const indexFile = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexFile)) {
      app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
      });
    }
  }

  app.use(errorHandler);
  return app;
}
