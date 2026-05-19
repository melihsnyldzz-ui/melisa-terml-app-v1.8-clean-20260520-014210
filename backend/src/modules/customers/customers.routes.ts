import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireRole } from '../auth/auth.js';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  balance: z.number().default(0),
  defaultCurrency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  balanceTry: z.number().default(0),
  balanceUsd: z.number().default(0),
  balanceEur: z.number().default(0),
  active: z.boolean().default(true),
});

router.get('/', asyncHandler(async (_req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { updatedAt: 'desc' }, take: 200 });
  res.json(customers);
}));

router.get('/:id/movements', asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const receipts = await prisma.salesReceipt.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(receipts.map((receipt) => ({
    id: receipt.id,
    documentNo: receipt.documentNo,
    type: 'SALE',
    currency: receipt.currency,
    amount: receipt.totalAmount,
    createdAt: receipt.createdAt,
    receiptId: receipt.id,
  })));
}));

router.post('/', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data: normalizePartyData(data) as any });
  await writeAuditLog(prisma, {
    action: 'CUSTOMER_CREATED',
    entityType: 'customer',
    entityId: customer.id,
    userId: req.user?.userId,
    detailsJson: { name: customer.name, defaultCurrency: customer.defaultCurrency },
  });
  res.status(201).json(customer);
}));

router.put('/:id', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = customerSchema.partial().parse(req.body);
  const customer = await prisma.customer.update({ where: { id }, data: normalizePartyData(data) as any });
  await writeAuditLog(prisma, {
    action: 'CUSTOMER_UPDATED',
    entityType: 'customer',
    entityId: customer.id,
    userId: req.user?.userId,
    detailsJson: { changedFields: Object.keys(data), name: customer.name },
  });
  res.json(customer);
}));

function normalizePartyData(data: Record<string, any>) {
  const next = { ...data };
  if (next.balanceTry == null && next.balance != null) next.balanceTry = next.balance;
  if (next.balance == null && next.balanceTry != null) next.balance = next.balanceTry;
  return next;
}

export default router;
