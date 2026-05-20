import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requirePermission } from '../auth/auth.js';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  balance: z.number().default(0),
  defaultCurrency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  balanceTry: z.number().default(0),
  balanceUsd: z.number().default(0),
  balanceEur: z.number().default(0),
  active: z.boolean().default(true),
});

router.get('/', requirePermission('partyManage'), asyncHandler(async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { updatedAt: 'desc' }, take: 200 });
  res.json(suppliers);
}));

router.get('/:id/movements', requirePermission('partyManage'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const receipts = await prisma.purchaseReceipt.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(receipts.map((receipt) => ({
    id: receipt.id,
    documentNo: receipt.documentNo,
    type: 'PURCHASE',
    currency: receipt.currency,
    amount: receipt.totalAmount,
    createdAt: receipt.createdAt,
    receiptId: receipt.id,
  })));
}));

router.post('/', requirePermission('partyManage'), asyncHandler(async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await prisma.supplier.create({ data: normalizePartyData(data) as any });
  await writeAuditLog(prisma, {
    action: 'SUPPLIER_CREATED',
    entityType: 'supplier',
    entityId: supplier.id,
    userId: req.user?.userId,
    detailsJson: { name: supplier.name, defaultCurrency: supplier.defaultCurrency },
  });
  res.status(201).json(supplier);
}));

router.put('/:id', requirePermission('partyManage'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = supplierSchema.partial().parse(req.body);
  const supplier = await prisma.supplier.update({ where: { id }, data: normalizePartyData(data) as any });
  await writeAuditLog(prisma, {
    action: 'SUPPLIER_UPDATED',
    entityType: 'supplier',
    entityId: supplier.id,
    userId: req.user?.userId,
    detailsJson: { changedFields: Object.keys(data), name: supplier.name },
  });
  res.json(supplier);
}));

function normalizePartyData(data: Record<string, any>) {
  const next = { ...data };
  if (next.balanceTry == null && next.balance != null) next.balanceTry = next.balance;
  if (next.balance == null && next.balanceTry != null) next.balance = next.balanceTry;
  return next;
}

export default router;
