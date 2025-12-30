import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateParentToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { Request, Response, NextFunction } from 'express';
import { AuthPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

describe('Auth Middleware - Admin Functionality', () => {
  describe('generateParentToken', () => {
    it('should include isAdmin: true when is_admin = 1', () => {
      const parent = {
        id: 'test-id',
        email: 'admin@example.com',
        is_admin: 1
      };

      const token = generateParentToken(parent);
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

      expect(payload.isAdmin).toBe(true);
      expect(payload.id).toBe('test-id');
      expect(payload.email).toBe('admin@example.com');
      expect(payload.type).toBe('parent');
    });

    it('should include isAdmin: false when is_admin = 0', () => {
      const parent = {
        id: 'test-id',
        email: 'user@example.com',
        is_admin: 0
      };

      const token = generateParentToken(parent);
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

      expect(payload.isAdmin).toBe(false);
    });

    it('should include isAdmin: false when is_admin is undefined', () => {
      const parent = {
        id: 'test-id',
        email: 'user@example.com'
      };

      const token = generateParentToken(parent);
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

      expect(payload.isAdmin).toBe(false);
    });
  });

  describe('requireAdmin middleware', () => {
    it('should allow request when user.isAdmin is true', () => {
      const req = {
        user: {
          id: 'admin-id',
          email: 'admin@example.com',
          type: 'parent',
          isAdmin: true
        }
      } as Request;

      const res = {
        status: () => ({ json: () => {} })
      } as Response;

      const next = (() => {}) as NextFunction;
      let nextCalled = false;
      const mockNext = (() => { nextCalled = true; }) as NextFunction;

      requireAdmin(req, res, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should reject request when user.isAdmin is false', () => {
      const req = {
        user: {
          id: 'user-id',
          email: 'user@example.com',
          type: 'parent',
          isAdmin: false
        }
      } as Request;

      let statusCode = 0;
      let responseJson: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseJson = data;
            }
          };
        }
      } as unknown as Response;

      const next = (() => {}) as NextFunction;

      requireAdmin(req, res, next);

      expect(statusCode).toBe(403);
      expect(responseJson).toEqual({ error: 'Admin access required' });
    });

    it('should reject request when user is undefined', () => {
      const req = {} as Request;

      let statusCode = 0;
      let responseJson: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseJson = data;
            }
          };
        }
      } as unknown as Response;

      const next = (() => {}) as NextFunction;

      requireAdmin(req, res, next);

      expect(statusCode).toBe(403);
      expect(responseJson).toEqual({ error: 'Admin access required' });
    });
  });
});
