import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export type AuthUser = {
  userId: number;
  username: string;
  role: UserRole;
};

export const permissionGroups = {
  salesView: 'satis goruntuleme',
  salesCreate: 'satis olusturma',
  salesCancel: 'satis iptal',
  purchaseView: 'alis goruntuleme',
  purchaseCreate: 'alis olusturma',
  purchaseCancel: 'alis iptal',
  stockView: 'stok goruntuleme',
  stockAdjust: 'stok duzeltme',
  priceUpdate: 'fiyat guncelleme',
  partyManage: 'musteri/tedarikci yonetimi',
  cashMovement: 'odeme/tahsilat',
  importApply: 'import yapma',
  reportsView: 'rapor goruntuleme',
  terminalSyncView: 'terminal sync goruntuleme',
  userManage: 'kullanici yonetimi',
} as const;

export type PermissionCode = keyof typeof permissionGroups;

const allPermissions = Object.keys(permissionGroups) as PermissionCode[];
const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING', 'VIEWER', 'STAFF'];

export const rolePermissions: Record<UserRole, PermissionCode[]> = {
  ADMIN: allPermissions,
  MANAGER: allPermissions.filter((permission) => permission !== 'userManage'),
  SALES: ['salesView', 'salesCreate', 'stockView', 'partyManage', 'reportsView'],
  WAREHOUSE: ['purchaseView', 'stockView', 'stockAdjust', 'importApply', 'terminalSyncView'],
  ACCOUNTING: ['salesView', 'purchaseView', 'partyManage', 'cashMovement', 'reportsView'],
  VIEWER: ['salesView', 'purchaseView', 'stockView', 'reportsView', 'terminalSyncView'],
  STAFF: ['salesView', 'purchaseView', 'stockView', 'reportsView'],
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function isLocalWebAdminOpenMode() {
  return process.env.NODE_ENV !== 'production' && process.env.WEB_ADMIN_OPEN_MODE === 'true';
}

function openAdminUser(): AuthUser {
  return { userId: 0, username: 'open-admin', role: 'ADMIN' };
}

function getDevelopmentHeaderUser(req: Request): AuthUser | null {
  if (process.env.NODE_ENV === 'production') return null;
  const role = String(req.header('x-user-role') ?? '').toUpperCase() as UserRole;
  if (!validRoles.includes(role)) return null;
  return {
    userId: Number(req.header('x-user-id') ?? 0),
    username: String(req.header('x-username') ?? 'dev-header-user'),
    role,
  };
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
  const developmentHeaderUser = getDevelopmentHeaderUser(req);

  if (developmentHeaderUser) {
    req.user = developmentHeaderUser;
    next();
    return;
  }

  if ((!token || token === 'open-admin') && isLocalWebAdminOpenMode()) {
    req.user = openAdminUser();
    next();
    return;
  }

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

export function hasPermission(role: UserRole, permission: PermissionCode) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function requirePermission(permission: PermissionCode) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ ok: false, message: 'Oturum gerekli. Lutfen giris yapin.' });
      return;
    }
    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ ok: false, message: 'Bu islem icin yetkiniz yok.' });
      return;
    }
    next();
  };
}

export function requireAnyPermission(permissions: PermissionCode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ ok: false, message: 'Oturum gerekli. Lutfen giris yapin.' });
      return;
    }
    if (!permissions.some((permission) => hasPermission(req.user!.role, permission))) {
      res.status(403).json({ ok: false, message: 'Bu islem icin yetkiniz yok.' });
      return;
    }
    next();
  };
}
