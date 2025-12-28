/**
 * Admin middleware tests
 * Ensures admin routes are only accessible in development environment
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireDevelopment } from '../middleware/admin.js';

describe('Admin Middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  const createMockReq = (): Partial<Request> => ({});
  const createMockRes = (): Partial<Response> => {
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res;
  };
  const createMockNext = (): NextFunction => vi.fn() as NextFunction;

  describe('requireDevelopment', () => {
    it('should return 403 when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireDevelopment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin routes only available in development',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireDevelopment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next() when NODE_ENV is undefined (defaults to dev)', () => {
      delete process.env.NODE_ENV;

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireDevelopment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next() when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireDevelopment(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should have correct error message in response', () => {
      process.env.NODE_ENV = 'production';

      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      requireDevelopment(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin routes only available in development',
      });
    });
  });
});
