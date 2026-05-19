import { Router } from 'express';
import { SyncStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { getActiveRate } from '../currency/currency.js';
import { createSalesReceiptFromPayload } from '../receipts/sales-receipts.routes.js';

const router = Router();

const syncSchema = z.object({
  localUuid: z.string().min(1),
  terminalId: z.string().min(1),
  payload: z.unknown(),
});

router.get('/bootstrap-data', asyncHandler(async (_req, res) => {
  const [products, customers, exchangeRate] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { stockCode: 'asc' } }),
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    getActiveRate(),
  ]);
  const generatedAt = new Date().toISOString();
  res.json({
    products: products.map((product) => ({
      id: product.id,
      stockCode: product.stockCode,
      barcode: product.barcode,
      brand: product.brand,
      typeName: product.typeName,
      quantity: Number(product.quantity),
      buyPrice: Number(product.buyPrice),
      sellPrice: Number(product.sellPrice),
      buyPriceTry: Number(product.buyPriceTry),
      buyPriceUsd: product.buyPriceUsd == null ? null : Number(product.buyPriceUsd),
      buyPriceEur: product.buyPriceEur == null ? null : Number(product.buyPriceEur),
      sellPriceTry: Number(product.sellPriceTry),
      sellPriceUsd: product.sellPriceUsd == null ? null : Number(product.sellPriceUsd),
      sellPriceEur: product.sellPriceEur == null ? null : Number(product.sellPriceEur),
      active: product.active,
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      balance: Number(customer.balance),
      defaultCurrency: customer.defaultCurrency,
      balanceTry: Number(customer.balanceTry),
      balanceUsd: Number(customer.balanceUsd),
      balanceEur: Number(customer.balanceEur),
      active: customer.active,
    })),
    settings: {
      generatedAt,
      terminalMode: 'offline-first',
      currency: 'TRY',
      exchangeRate,
    },
    generatedAt,
  });
}));

router.post('/sync-sales-receipt', asyncHandler(async (req, res) => {
  const data = syncSchema.parse(req.body);
  const existingReceipt = await prisma.salesReceipt.findUnique({ where: { localUuid: data.localUuid } });
  if (existingReceipt) {
    res.json({
      status: 'SYNCED',
      receiptId: existingReceipt.id,
      localUuid: data.localUuid,
      duplicate: true,
      message: 'Bu localUuid ile fis zaten merkezde kayitli.',
    });
    return;
  }

  const queueItem = await prisma.terminalSyncQueue.upsert({
    where: { localUuid: data.localUuid },
    update: { retryCount: { increment: 1 }, payloadJson: data.payload as object, terminalId: data.terminalId },
    create: { localUuid: data.localUuid, terminalId: data.terminalId, payloadJson: data.payload as object },
  });

  try {
    const receipt = await createSalesReceiptFromPayload({
      ...(data.payload as object),
      localUuid: data.localUuid,
      terminalId: data.terminalId,
      synced: true,
    });
    await prisma.terminalSyncQueue.update({
      where: { id: queueItem.id },
      data: { status: SyncStatus.SYNCED, syncedAt: new Date(), lastError: null },
    });
    res.json({
      status: 'SYNCED',
      receiptId: receipt.id,
      localUuid: data.localUuid,
      duplicate: false,
      message: 'Terminal fisi merkeze senkronize edildi.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terminal fisi senkronize edilemedi.';
    await prisma.terminalSyncQueue.update({
      where: { id: queueItem.id },
      data: { status: SyncStatus.FAILED, lastError: message },
    });
    res.status(400).json({
      status: 'FAILED',
      receiptId: null,
      localUuid: data.localUuid,
      duplicate: false,
      message,
    });
  }
}));

export default router;
