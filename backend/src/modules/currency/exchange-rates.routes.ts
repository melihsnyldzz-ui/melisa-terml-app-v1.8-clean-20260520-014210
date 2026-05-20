import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireAuth, requirePermission } from '../auth/auth.js';

const router = Router();

const rateSchema = z.object({
  usdToTry: z.number().positive(),
  eurToTry: z.number().positive(),
  tryToUsd: z.number().positive().optional(),
  tryToEur: z.number().positive().optional(),
  eurToUsd: z.number().positive().optional().nullable(),
  usdToEur: z.number().positive().optional().nullable(),
  effectiveDate: z.string().datetime().optional(),
});

router.get('/active', asyncHandler(async (_req, res) => {
  const rate = await prisma.exchangeRate.findFirst({ where: { active: true }, orderBy: { effectiveDate: 'desc' } });
  res.json(rate);
}));

router.get('/', requireAuth, requirePermission('reportsView'), asyncHandler(async (_req, res) => {
  const rates = await prisma.exchangeRate.findMany({ orderBy: { effectiveDate: 'desc' }, take: 50 });
  res.json(rates);
}));

router.post('/', requireAuth, requirePermission('priceUpdate'), asyncHandler(async (req, res) => {
  const data = rateSchema.parse(req.body);
  const tryToUsd = data.tryToUsd ?? 1 / data.usdToTry;
  const tryToEur = data.tryToEur ?? 1 / data.eurToTry;
  const eurToUsd = data.eurToUsd ?? data.eurToTry / data.usdToTry;
  const usdToEur = data.usdToEur ?? data.usdToTry / data.eurToTry;
  const rate = await prisma.$transaction(async (tx) => {
    await tx.exchangeRate.updateMany({ where: { active: true }, data: { active: false } });
    const created = await tx.exchangeRate.create({
      data: {
        usdToTry: data.usdToTry,
        eurToTry: data.eurToTry,
        tryToUsd,
        tryToEur,
        eurToUsd,
        usdToEur,
        baseCurrency: 'TRY',
        targetCurrency: 'USD',
        rate: tryToUsd,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        active: true,
      },
    });
    await writeAuditLog(tx, {
      action: 'EXCHANGE_RATE_UPDATED',
      entityType: 'exchange_rate',
      entityId: created.id,
      userId: req.user?.userId,
      detailsJson: { usdToTry: data.usdToTry, eurToTry: data.eurToTry, tryToUsd, tryToEur, eurToUsd, usdToEur },
    });
    return created;
  });
  res.status(201).json(rate);
}));

export default router;
