import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import communityRoutes from './routes/community.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/uploads.js';
import { errorHandler, notFound } from './middleware/validate.js';
import { corsOrigin } from './config/cors.js';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, message: { error: 'Too many requests' } });
app.use('/api', apiLimiter);

// MariaDB returns BIGINT columns as BigInt; JSON.stringify cannot serialize BigInt.
app.set('json replacer', (key, value) => (typeof value === 'bigint' ? Number(value) : value));

app.use('/api/uploads', uploadRoutes);
app.use('/api/uploads', express.static(join(__dirname, 'uploads'), { maxAge: '7d' }));

app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(notFound);
app.use(errorHandler);

export default app;
