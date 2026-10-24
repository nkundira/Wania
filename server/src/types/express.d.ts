import type { UserRow } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<UserRow, 'password_hash'>;
    }
  }
}

export {};
