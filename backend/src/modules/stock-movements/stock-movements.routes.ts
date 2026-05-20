import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { requirePermission } from '../auth/auth.js';

const router = Router();

const filtersSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  movementType: z.enum(['PURCHASE_IN', 'SALE_OUT', 'ADJUSTMENT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CANCEL']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sourceDocumentType: z.string().optional(),
});

router.get('/', requirePermission('stockView'), asyncHandler(async (req, res) => {
  const filters = filtersSchema.parse(req.query);
  const movements = await prisma.stockMovement.findMany({
    where: {
      productId: filters.productId,
      movementType: filters.movementType as any,
      sourceDocumentType: filters.sourceDocumentType,
      createdAt: filters.dateFrom || filters.dateTo ? {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      } : undefined,
    },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const salesIds = movements.filter((item) => item.sourceDocumentType === 'sales_receipt').map((item) => item.sourceDocumentId);
  const purchaseIds = movements.filter((item) => item.sourceDocumentType === 'purchase_receipt').map((item) => item.sourceDocumentId);
  const [salesReceipts, purchaseReceipts] = await Promise.all([
    salesIds.length ? prisma.salesReceipt.findMany({ where: { id: { in: salesIds } }, select: { id: true, documentNo: true } }) : [],
    purchaseIds.length ? prisma.purchaseReceipt.findMany({ where: { id: { in: purchaseIds } }, select: { id: true, documentNo: true } }) : [],
  ]);
  const salesMap = new Map(salesReceipts.map((item) => [item.id, item.documentNo]));
  const purchaseMap = new Map(purchaseReceipts.map((item) => [item.id, item.documentNo]));

  res.json(movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.typeName,
    productStockCode: movement.product.stockCode,
    movementType: movement.movementType,
    quantity: movement.quantity,
    unitCostTry: movement.unitCostTry,
    valueChangeTry: movement.valueChangeTry,
    stockAfter: movement.stockAfter,
    averageCostAfterTry: movement.averageCostAfterTry,
    sourceDocumentType: movement.sourceDocumentType,
    sourceDocumentId: movement.sourceDocumentId,
    note: movement.note,
    documentNo: movement.sourceDocumentType === 'sales_receipt'
      ? salesMap.get(movement.sourceDocumentId) ?? null
      : movement.sourceDocumentType === 'purchase_receipt'
        ? purchaseMap.get(movement.sourceDocumentId) ?? null
        : null,
    createdAt: movement.createdAt,
  })));
}));

export default router;
