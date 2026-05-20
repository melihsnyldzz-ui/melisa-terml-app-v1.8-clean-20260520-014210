import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { hasPermission, requirePermission } from '../auth/auth.js';

const router = Router();

const productSchema = z.object({
  stockCode: z.string().min(1),
  barcode: z.string().min(1),
  brand: z.string().min(1),
  typeName: z.string().min(1),
  quantity: z.number().nonnegative().default(0),
  currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  purchasePrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
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

const priceFields = new Set([
  'currency',
  'purchasePrice',
  'salePrice',
  'buyPrice',
  'sellPrice',
  'buyPriceTry',
  'buyPriceUsd',
  'buyPriceEur',
  'sellPriceTry',
  'sellPriceUsd',
  'sellPriceEur',
]);

const stockFields = new Set(['stockCode', 'barcode', 'brand', 'typeName', 'quantity', 'active']);

function requireProductUpdatePermission(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ ok: false, message: 'Oturum gerekli. Lutfen giris yapin.' });
    return;
  }
  const fields = Object.keys(req.body ?? {});
  const touchesPrice = fields.some((field) => priceFields.has(field));
  const touchesStock = fields.some((field) => stockFields.has(field));
  const canUpdatePrice = !touchesPrice || hasPermission(req.user.role, 'priceUpdate');
  const canAdjustStock = !touchesStock || hasPermission(req.user.role, 'stockAdjust');
  if (!canUpdatePrice || !canAdjustStock) {
    res.status(403).json({ ok: false, message: 'Bu islem icin yetkiniz yok.' });
    return;
  }
  next();
}

router.get('/', requirePermission('stockView'), asyncHandler(async (req, res) => {
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

router.get('/stock-cards', requirePermission('stockView'), asyncHandler(async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: [{ active: 'desc' }, { quantity: 'asc' }, { stockCode: 'asc' }],
    take: 300,
    select: {
      id: true,
      stockCode: true,
      barcode: true,
      brand: true,
      typeName: true,
      quantity: true,
      sellPrice: true,
      sellPriceTry: true,
      sellPriceUsd: true,
      sellPriceEur: true,
      active: true,
      updatedAt: true,
    },
  });
  res.json(products.map((product) => ({
    ...product,
    productName: `${product.brand} ${product.typeName}`,
    lowStock: Number(product.quantity) <= 5,
    quantity: Number(product.quantity),
    sellPrice: Number(product.sellPrice),
    sellPriceTry: Number(product.sellPriceTry),
    sellPriceUsd: product.sellPriceUsd == null ? null : Number(product.sellPriceUsd),
    sellPriceEur: product.sellPriceEur == null ? null : Number(product.sellPriceEur),
  })));
}));

router.post('/', requirePermission('stockAdjust'), asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data: normalizeProductData(data, true) as any });
  await writeAuditLog(prisma, {
    action: 'PRODUCT_CREATED',
    entityType: 'product',
    entityId: product.id,
    userId: req.user?.userId,
    detailsJson: { stockCode: product.stockCode, barcode: product.barcode },
  });
  res.status(201).json(product);
}));

router.put('/:id', requireProductUpdatePermission, asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({ where: { id }, data: normalizeProductData(data) as any });
  await writeAuditLog(prisma, {
    action: Object.keys(data).some((field) => priceFields.has(field)) ? 'PRODUCT_PRICE_UPDATED' : 'PRODUCT_UPDATED',
    entityType: 'product',
    entityId: product.id,
    userId: req.user?.userId,
    detailsJson: { changedFields: Object.keys(data), stockCode: product.stockCode },
  });
  res.json(product);
}));

function normalizeProductData(data: Record<string, any>, initializeAverageCost = false) {
  const next = { ...data };
  if (next.purchasePrice == null) next.purchasePrice = next.buyPrice ?? next.buyPriceTry ?? 0;
  if (next.salePrice == null) next.salePrice = next.sellPrice ?? next.sellPriceTry ?? 0;
  if (next.buyPriceTry == null && next.buyPrice != null) next.buyPriceTry = next.buyPrice;
  if (next.sellPriceTry == null && next.sellPrice != null) next.sellPriceTry = next.sellPrice;
  if (next.buyPrice == null && next.buyPriceTry != null) next.buyPrice = next.buyPriceTry;
  if (next.sellPrice == null && next.sellPriceTry != null) next.sellPrice = next.sellPriceTry;
  if (initializeAverageCost) next.averageCostTry = next.buyPriceTry ?? next.buyPrice ?? 0;
  return next;
}

export default router;
