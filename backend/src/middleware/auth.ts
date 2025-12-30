import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload, ChildAuthPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      child?: ChildAuthPayload;
    }
  }
}

export function authenticateParent(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    if (payload.type !== 'parent') {
      return res.status(403).json({ error: 'Parent access required' });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authenticateChild(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as ChildAuthPayload;

    if (payload.type !== 'child') {
      return res.status(403).json({ error: 'Child access required' });
    }

    req.child = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authenticateAny(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload | ChildAuthPayload;

    if (payload.type === 'parent') {
      req.user = payload as AuthPayload;
    } else if (payload.type === 'child') {
      req.child = payload as ChildAuthPayload;
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateParentToken(parent: { id: string; email: string; is_admin?: number }): string {
  const payload: AuthPayload = {
    id: parent.id,
    email: parent.email,
    type: 'parent',
    isAdmin: parent.is_admin === 1
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function generateChildToken(child: { id: string; parent_id: string }): string {
  const payload: ChildAuthPayload = {
    id: child.id,
    parentId: child.parent_id,
    type: 'child'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
