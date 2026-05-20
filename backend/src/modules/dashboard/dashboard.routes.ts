import { Router } from 'express';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { requirePermission } from '../auth/auth.js';

const router = Router();

router.get('/stats', requirePermission('reportsView'), asyncHandler(async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    productCount,
    customerCount,
    supplierCount,
    todaySales,
    totalSales,
    lastSale,
    pendingTerminalReceipts,
    customerBalances,
    supplierBalances,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.supplier.count({ where: { active: true } }),
    prisma.salesReceipt.count({ where: { createdAt: { gte: today }, cancelled: false } }),
    prisma.salesReceipt.count({ where: { cancelled: false } }),
    prisma.salesReceipt.findFirst({ where: { cancelled: false }, orderBy: { createdAt: 'desc' }, select: { documentNo: true, totalAmount: true, currency: true, createdAt: true } }),
    prisma.terminalSyncQueue.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
    prisma.customer.aggregate({
      where: { active: true },
      _sum: { balanceTry: true, balanceUsd: true, balanceEur: true },
    }),
    prisma.supplier.aggregate({
      where: { active: true },
      _sum: { balanceTry: true, balanceUsd: true, balanceEur: true },
    }),
  ]);

  res.json({
    productCount,
    customerCount,
    supplierCount,
    todaySales,
    totalSales,
    lastSale: lastSale
      ? { documentNo: lastSale.documentNo, totalAmount: Number(lastSale.totalAmount), currency: lastSale.currency, createdAt: lastSale.createdAt }
      : null,
    pendingTerminalReceipts,
    receivables: {
      try: Number(customerBalances._sum.balanceTry ?? 0),
      usd: Number(customerBalances._sum.balanceUsd ?? 0),
      eur: Number(customerBalances._sum.balanceEur ?? 0),
    },
    supplierPayables: {
      try: Number(supplierBalances._sum.balanceTry ?? 0),
      usd: Number(supplierBalances._sum.balanceUsd ?? 0),
      eur: Number(supplierBalances._sum.balanceEur ?? 0),
    },
  });
}));

export default router;
