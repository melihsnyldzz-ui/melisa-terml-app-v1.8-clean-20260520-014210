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

const heartbeatSchema = z.object({
  terminalId: z.string().min(1),
  deviceName: z.string().optional(),
  appVersion: z.string().optional(),
  platform: z.string().optional(),
  batteryLevel: z.number().optional(),
  checkedAt: z.string().optional(),
});

function toTerminalSyncSuccess(input: { localUuid: string; serverId: number | null; duplicate: boolean; message: string }) {
  return {
    ok: true,
    localUuid: input.localUuid,
    serverId: input.serverId,
    status: input.duplicate ? 'duplicate' : 'synced',
    duplicate: input.duplicate,
    message: input.message,
  };
}

function toTerminalSyncFailure(input: { localUuid?: string; error: string }) {
  return {
    ok: false,
    localUuid: input.localUuid ?? null,
    serverId: null,
    status: 'failed',
    error: input.error,
    message: input.error,
  };
}

export async function syncTerminalSalesReceipt(body: unknown) {
  const data = syncSchema.parse(body);
  const existingReceipt = await prisma.salesReceipt.findUnique({ where: { localUuid: data.localUuid } });
  if (existingReceipt) {
    return toTerminalSyncSuccess({
      localUuid: data.localUuid,
      serverId: existingReceipt.id,
      duplicate: true,
      message: 'Bu localUuid ile fis zaten merkezde kayitli.',
    });
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
    return toTerminalSyncSuccess({
      localUuid: data.localUuid,
      serverId: receipt.id,
      duplicate: false,
      message: 'Terminal fisi merkeze senkronize edildi.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terminal fisi senkronize edilemedi.';
    await prisma.terminalSyncQueue.update({
      where: { id: queueItem.id },
      data: { status: SyncStatus.FAILED, lastError: message },
    });
    return toTerminalSyncFailure({ localUuid: data.localUuid, error: message });
  }
}

export async function listTerminalSyncLogs() {
  const logs = await prisma.terminalSyncQueue.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return logs.map((log) => ({
    id: log.id,
    localUuid: log.localUuid,
    terminalId: log.terminalId,
    status: log.status.toLowerCase(),
    retryCount: log.retryCount,
    lastError: log.lastError,
    createdAt: log.createdAt,
    syncedAt: log.syncedAt,
    payload: log.payloadJson,
  }));
}

export async function getTerminalSyncSummary() {
  const [total, pending, synced, failed] = await Promise.all([
    prisma.terminalSyncQueue.count(),
    prisma.terminalSyncQueue.count({ where: { status: SyncStatus.PENDING } }),
    prisma.terminalSyncQueue.count({ where: { status: SyncStatus.SYNCED } }),
    prisma.terminalSyncQueue.count({ where: { status: SyncStatus.FAILED } }),
  ]);
  return { ok: true, total, pending, synced, failed };
}

export async function saveTerminalHeartbeat(body: unknown) {
  const data = heartbeatSchema.parse(body);
  const now = new Date();
  const localUuid = `heartbeat:${data.terminalId}`;
  await prisma.terminalSyncQueue.upsert({
    where: { localUuid },
    update: {
      terminalId: data.terminalId,
      payloadJson: { type: 'heartbeat', ...data, serverSeenAt: now.toISOString() },
      status: SyncStatus.SYNCED,
      syncedAt: now,
      lastError: null,
    },
    create: {
      localUuid,
      terminalId: data.terminalId,
      payloadJson: { type: 'heartbeat', ...data, serverSeenAt: now.toISOString() },
      status: SyncStatus.SYNCED,
      syncedAt: now,
    },
  });
  return {
    ok: true,
    terminalId: data.terminalId,
    status: 'online',
    serverSeenAt: now.toISOString(),
    message: 'Terminal heartbeat alindi.',
  };
}

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
  const result = await syncTerminalSalesReceipt(req.body);
  res.status(result.ok ? 200 : 400).json(result);
}));

export default router;
