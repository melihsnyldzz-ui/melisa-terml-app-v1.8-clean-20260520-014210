import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { signToken } from './auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { username: data.username } });
  const valid = Boolean(user?.active && await bcrypt.compare(data.password, user.passwordHash));

  await writeAuditLog(prisma, {
    action: valid ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILED',
    entityType: 'user',
    entityId: user?.id ?? 0,
    userId: valid ? user?.id : null,
    detailsJson: { username: data.username },
  });

  if (!user || !valid) {
    res.status(401).json({ ok: false, message: 'Kullanici adi veya sifre hatali.' });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active },
  });
}));

export default router;
