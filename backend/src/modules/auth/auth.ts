import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export type AuthUser = {
  userId: number;
  username: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET production ortaminda zorunludur.');
  }
  return secret ?? 'DEV_ONLY_CHANGE_ME_JWT_SECRET';
}

export function signToken(user: AuthUser) {
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'] };
  return jwt.sign(user, getJwtSecret(), options);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ ok: false, message: 'Oturum gerekli. Lutfen giris yapin.' });
    return;
  }

  try {
    req.user = jwt.verify(token, getJwtSecret()) as AuthUser;
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Oturum gecersiz veya suresi dolmus.' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ ok: false, message: 'Oturum gerekli. Lutfen giris yapin.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, message: 'Bu islem icin yetkiniz yok.' });
      return;
    }
    next();
  };
}
