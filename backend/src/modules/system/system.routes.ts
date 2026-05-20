import { Router } from 'express';
import { getDatabaseUrl } from '../../config.js';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { permissionGroups, requirePermission, rolePermissions } from '../auth/auth.js';

const router = Router();

router.get('/permissions', requirePermission('reportsView'), (_req, res) => {
  res.json({ permissionGroups, rolePermissions });
});

router.get('/status', requirePermission('reportsView'), asyncHandler(async (_req, res) => {
  let databaseConnected = false;
  if (getDatabaseUrl()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }
  }

  const [activeUser, recentAuditLogs] = await Promise.all([
    prisma.user.findFirst({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, username: true, role: true, active: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, name: true, username: true, role: true } } },
    }),
  ]);

  res.json({
    databaseConnected,
    appVersion: process.env.npm_package_version ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    activeUser: activeUser ?? { id: null, name: 'Hazirlik kullanicisi', username: 'admin', role: 'ADMIN', active: true },
    roleRules: Object.fromEntries(Object.entries(rolePermissions).map(([role, permissions]) => [
      role,
      permissions.map((permission) => permissionGroups[permission]),
    ])),
    recentAuditLogs,
  });
}));

export default router;
