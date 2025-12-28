import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/cors.js';

/**
 * Middleware to restrict access to admin routes in production.
 * Admin routes are only available when NODE_ENV !== 'production'.
 */
export function requireDevelopment(req: Request, res: Response, next: NextFunction) {
  if (!isDevelopment()) {
    return res.status(403).json({ error: 'Admin routes only available in development' });
  }
  next();
}
