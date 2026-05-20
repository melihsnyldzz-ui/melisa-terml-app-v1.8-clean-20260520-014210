import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { permissionGroups, rolePermissions, requirePermission } from '../auth/auth.js';

const router = Router();

const userSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING', 'VIEWER', 'STAFF']).default('VIEWER'),
  active: z.boolean().default(true),
});

const createUserSchema = userSchema.extend({
  password: z.string().min(8, 'Sifre en az 8 karakter olmalidir.'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Sifre en az 8 karakter olmalidir.'),
});

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

router.get('/', requirePermission('userManage'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: publicUserSelect,
  });
  res.json(users);
}));

router.post('/', requirePermission('userManage'), asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      role: data.role,
      active: data.active,
      passwordHash,
    },
    select: publicUserSelect,
  });
  await writeAuditLog(prisma, {
    action: 'USER_CREATED',
    entityType: 'user',
    entityId: user.id,
    userId: req.user?.userId,
    detailsJson: { username: user.username, role: user.role, active: user.active },
  });
  res.status(201).json(user);
}));

router.put('/:id', requirePermission('userManage'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = userSchema.partial().parse(req.body);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: publicUserSelect,
  });
  await writeAuditLog(prisma, {
    action: 'USER_UPDATED',
    entityType: 'user',
    entityId: id,
    userId: req.user?.userId,
    detailsJson: { changedFields: Object.keys(data), username: user.username },
  });
  res.json(user);
}));

router.patch('/:id/deactivate', requirePermission('userManage'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const user = await prisma.user.update({
    where: { id },
    data: { active: false },
    select: publicUserSelect,
  });
  await writeAuditLog(prisma, {
    action: 'USER_DEACTIVATED',
    entityType: 'user',
    entityId: id,
    userId: req.user?.userId,
    detailsJson: { username: user.username },
  });
  res.json(user);
}));

router.post('/:id/reset-password', requirePermission('userManage'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = resetPasswordSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: publicUserSelect,
  });
  await writeAuditLog(prisma, {
    action: 'USER_PASSWORD_RESET',
    entityType: 'user',
    entityId: id,
    userId: req.user?.userId,
    detailsJson: { username: user.username },
  });
  res.json(user);
}));

router.get('/permissions/matrix', requirePermission('userManage'), (_req, res) => {
  res.json({ permissionGroups, rolePermissions });
});

export default router;
