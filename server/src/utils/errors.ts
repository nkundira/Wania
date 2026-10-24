import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'You do not have permission to do that') => new HttpError(403, message, 'FORBIDDEN');
export const notFound = (message = 'Not found') => new HttpError(404, message, 'NOT_FOUND');
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, message, code);

export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Please check the highlighted fields', code: 'VALIDATION_ERROR', details: err.flatten() },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
  }
  const e = err as { code?: string; message?: string; type?: string };
  if (e?.code === '23505') {
    const field = e.message?.includes('username') ? 'username' : e.message?.includes('email') ? 'email' : 'value';
    return res.status(409).json({ error: { message: `That ${field} is already in use`, code: 'DUPLICATE' } });
  }
  if (e?.type === 'entity.too.large' || e?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { message: 'File is too large', code: 'FILE_TOO_LARGE' } });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: { message: 'Something went wrong. Please try again.', code: 'INTERNAL' } });
}
