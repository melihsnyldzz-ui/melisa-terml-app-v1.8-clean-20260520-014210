import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, createDocumentNo } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireAnyPermission, requirePermission } from '../auth/auth.js';
import { convertCurrency, getActiveRate } from '../currency/currency.js';

const router = Router();

const filtersSchema = z.object({
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']).optional(),
  partyId: z.coerce.number().int().positive().optional(),
  currency: z.enum(['TRY', 'USD', 'EUR']).optional(),
  documentType: z.enum(['SALES_RECEIPT', 'PURCHASE_RECEIPT', 'PAYMENT', 'COLLECTION', 'CANCEL']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const partyParamsSchema = z.object({
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']),
  partyId: z.coerce.number().int().positive(),
});

const cashMovementSchema = z.object({
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  amount: z.number().positive(),
  currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  amountTry: z.number().positive().optional(),
  description: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD', 'OTHER']).default('CASH'),
  createdAt: z.string().datetime().optional(),
});

router.post('/collection', requirePermission('cashMovement'), asyncHandler(async (req, res) => {
  const data = cashMovementSchema.parse(req.body);
  if (!data.customerId) throw new Error('Tahsilat icin customerId gerekli.');
  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error(`Musteri bulunamadi: ${data.customerId}`);
    const rate = await getActiveRate(tx);
    const documentCurrency = data.currency;
    const accountCurrency = customer.defaultCurrency;
    const amountTry = data.amountTry ?? convertCurrency(data.amount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(data.amount, documentCurrency, accountCurrency, rate).amount;
    await tx.customer.update({ where: { id: data.customerId }, data: balanceDecrement(accountCurrency, accountAmount) });
    const movement = await tx.currentAccountMovement.create({
      data: {
        partyType: 'CUSTOMER',
        customerId: data.customerId,
        documentType: 'COLLECTION',
        documentId: 0,
        documentNo: createDocumentNo('TAH'),
        direction: 'CREDIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: data.amount,
        description: data.description ?? 'Musteri tahsilati',
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      },
      include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
    });
    await writeAuditLog(tx, {
      action: 'COLLECTION_CREATED',
      entityType: 'current_account_movement',
      entityId: movement.id,
      userId: req.user?.userId,
      detailsJson: { customerId: data.customerId, amount: data.amount, currency: data.currency, paymentMethod: data.paymentMethod },
    });
    return movement;
  });
  res.status(201).json(formatMovement(result));
}));

router.post('/payment', requirePermission('cashMovement'), asyncHandler(async (req, res) => {
  const data = cashMovementSchema.parse(req.body);
  if (!data.supplierId) throw new Error('Odeme icin supplierId gerekli.');
  const result = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new Error(`Tedarikci bulunamadi: ${data.supplierId}`);
    const rate = await getActiveRate(tx);
    const documentCurrency = data.currency;
    const accountCurrency = supplier.defaultCurrency;
    const amountTry = data.amountTry ?? convertCurrency(data.amount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(data.amount, documentCurrency, accountCurrency, rate).amount;
    await tx.supplier.update({ where: { id: data.supplierId }, data: balanceDecrement(accountCurrency, accountAmount) });
    const movement = await tx.currentAccountMovement.create({
      data: {
        partyType: 'SUPPLIER',
        supplierId: data.supplierId,
        documentType: 'PAYMENT',
        documentId: 0,
        documentNo: createDocumentNo('ODE'),
        direction: 'DEBIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: data.amount,
        description: data.description ?? 'Tedarikci odemesi',
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      },
      include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
    });
    await writeAuditLog(tx, {
      action: 'PAYMENT_CREATED',
      entityType: 'current_account_movement',
      entityId: movement.id,
      userId: req.user?.userId,
      detailsJson: { supplierId: data.supplierId, amount: data.amount, currency: data.currency, paymentMethod: data.paymentMethod },
    });
    return movement;
  });
  res.status(201).json(formatMovement(result));
}));

router.get('/movements', requireAnyPermission(['partyManage', 'cashMovement']), asyncHandler(async (req, res) => {
  const filters = filtersSchema.parse(req.query);
  const rows = await prisma.currentAccountMovement.findMany({
    where: {
      partyType: filters.partyType,
      customerId: filters.partyType === 'CUSTOMER' ? filters.partyId : undefined,
      supplierId: filters.partyType === 'SUPPLIER' ? filters.partyId : undefined,
      currency: filters.currency,
      documentType: filters.documentType,
      createdAt: filters.dateFrom || filters.dateTo ? {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      } : undefined,
    },
    include: {
      customer: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(rows.map(formatMovement));
}));

router.get('/movements/:partyType/:partyId', requireAnyPermission(['partyManage', 'cashMovement']), asyncHandler(async (req, res) => {
  const params = partyParamsSchema.parse(req.params);
  const rows = await prisma.currentAccountMovement.findMany({
    where: {
      partyType: params.partyType,
      customerId: params.partyType === 'CUSTOMER' ? params.partyId : undefined,
      supplierId: params.partyType === 'SUPPLIER' ? params.partyId : undefined,
    },
    include: {
      customer: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(rows.map(formatMovement));
}));

function formatMovement(row: Awaited<ReturnType<typeof prisma.currentAccountMovement.findMany>>[number] & { customer?: { id: number; name: string } | null; supplier?: { id: number; name: string } | null }) {
  return {
    id: row.id,
    partyType: row.partyType,
    partyId: row.partyType === 'CUSTOMER' ? row.customerId : row.supplierId,
    partyName: row.partyType === 'CUSTOMER' ? row.customer?.name ?? '-' : row.supplier?.name ?? '-',
    customerId: row.customerId,
    supplierId: row.supplierId,
    documentType: row.documentType,
    documentId: row.documentId,
    documentNo: row.documentNo,
    direction: row.direction,
    currency: row.currency,
    amount: row.amount,
    amountTry: row.amountTry,
    accountCurrency: row.accountCurrency,
    accountAmount: row.accountAmount,
    documentCurrency: row.documentCurrency,
    documentAmount: row.documentAmount,
    description: row.description,
    paymentMethod: row.paymentMethod,
    createdAt: row.createdAt,
  };
}

function balanceDecrement(currency: 'TRY' | 'USD' | 'EUR', totalAmount: number) {
  if (currency === 'USD') return { balanceUsd: { decrement: totalAmount } };
  if (currency === 'EUR') return { balanceEur: { decrement: totalAmount } };
  return { balance: { decrement: totalAmount }, balanceTry: { decrement: totalAmount } };
}

export default router;
