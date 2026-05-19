import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireRole } from '../auth/auth.js';

const router = Router();

const productSchema = z.object({
  stockCode: z.string().min(1),
  barcode: z.string().min(1),
  brand: z.string().min(1),
  typeName: z.string().min(1),
  quantity: z.number().nonnegative().default(0),
  buyPrice: z.number().nonnegative().default(0),
  sellPrice: z.number().nonnegative().default(0),
  buyPriceTry: z.number().nonnegative().optional(),
  buyPriceUsd: z.number().nonnegative().optional().nullable(),
  buyPriceEur: z.number().nonnegative().optional().nullable(),
  sellPriceTry: z.number().nonnegative().optional(),
  sellPriceUsd: z.number().nonnegative().optional().nullable(),
  sellPriceEur: z.number().nonnegative().optional().nullable(),
  active: z.boolean().default(true),
});

router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const products = await prisma.product.findMany({
    where: search
      ? {
          OR: [
            { stockCode: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { typeName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: 'desc' },
    include: { stockMovements: { orderBy: { createdAt: 'desc' }, take: 5 } },
    take: 200,
  });
  res.json(products);
}));

router.post('/', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data: normalizeProductData(data) as any });
  await writeAuditLog(prisma, {
    action: 'PRODUCT_CREATED',
    entityType: 'product',
    entityId: product.id,
    userId: req.user?.userId,
    detailsJson: { stockCode: product.stockCode, barcode: product.barcode },
  });
  res.status(201).json(product);
}));

router.put('/:id', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({ where: { id }, data: normalizeProductData(data) as any });
  await writeAuditLog(prisma, {
    action: 'PRODUCT_UPDATED',
    entityType: 'product',
    entityId: product.id,
    userId: req.user?.userId,
    detailsJson: { changedFields: Object.keys(data), stockCode: product.stockCode },
  });
  res.json(product);
}));

function normalizeProductData(data: Record<string, any>) {
  const next = { ...data };
  if (next.buyPriceTry == null && next.buyPrice != null) next.buyPriceTry = next.buyPrice;
  if (next.sellPriceTry == null && next.sellPrice != null) next.sellPriceTry = next.sellPrice;
  if (next.buyPrice == null && next.buyPriceTry != null) next.buyPrice = next.buyPriceTry;
  if (next.sellPrice == null && next.sellPriceTry != null) next.sellPrice = next.sellPriceTry;
  return next;
}

export default router;
