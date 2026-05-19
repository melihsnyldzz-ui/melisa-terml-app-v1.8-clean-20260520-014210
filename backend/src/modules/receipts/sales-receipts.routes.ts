import { Router } from 'express';
import { MovementType } from '@prisma/client';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, createDocumentNo } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireRole } from '../auth/auth.js';
import { convertCurrency, getActiveRate, priceForCurrency } from '../currency/currency.js';
import { salesReceiptSchema } from './receipts.schemas.js';

const router = Router();

const cancelSchema = salesReceiptSchema.pick({ note: true }).extend({
  reason: salesReceiptSchema.shape.note.optional(),
});

export async function createSalesReceiptFromPayload(payload: unknown) {
  const auditUserId = typeof (payload as { auditUserId?: unknown })?.auditUserId === 'number' ? (payload as { auditUserId: number }).auditUserId : undefined;
  const { auditUserId: _auditUserId, ...payloadWithoutAudit } = payload as Record<string, unknown>;
  const data = salesReceiptSchema.parse(payloadWithoutAudit);
  if (data.localUuid) {
    const existing = await prisma.salesReceipt.findUnique({ where: { localUuid: data.localUuid } });
    if (existing) return existing;
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error(`Musteri bulunamadi: ${data.customerId}`);
    const rate = normalizeRateSnapshot(data.exchangeRateSnapshot ?? data.usedExchangeRate) ?? await getActiveRate(tx);
    const currency = data.currency ?? customer.defaultCurrency;
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Urun bulunamadi: ${item.productId}`);
      }
      if (Number(product.quantity) < item.quantity) {
        throw new Error(`${product.stockCode} icin stok yetersiz. Mevcut: ${product.quantity}, istenen: ${item.quantity}`);
      }
      const calculatedPrice = item.unitPrice == null ? priceForCurrency(currency, {
        tryPrice: product.sellPriceTry,
        usdPrice: product.sellPriceUsd,
        eurPrice: product.sellPriceEur,
      }, rate) : { amount: item.unitPrice, originalCurrency: currency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, lineTotal: item.quantity * calculatedPrice.amount, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, currency, 'TRY', rate).amount;

    const created = await tx.salesReceipt.create({
      data: {
        customerId: data.customerId,
        documentNo: data.documentNo ?? createDocumentNo('SAT'),
        totalAmount,
        totalAmountTry,
        currency,
        exchangeRateSnapshot: rate,
        usdToTry: rate.usdToTry,
        eurToTry: rate.eurToTry,
        eurToUsd: rate.eurToUsd,
        synced: data.synced,
        terminalId: data.terminalId,
        localUuid: data.localUuid,
        note: data.note,
        items: {
          create: calculatedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
            currency,
            originalUnitPrice: item.priceMeta.originalUnitPrice,
            originalCurrency: item.priceMeta.originalCurrency,
            receiptCurrency: currency,
            exchangeRateUsed: item.priceMeta.rateUsed,
            convertedUnitPrice: item.unitPrice,
            usdToTry: rate.usdToTry,
            eurToTry: rate.eurToTry,
            eurToUsd: rate.eurToUsd,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of calculatedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.SALE_OUT,
          quantity: item.quantity,
          sourceDocumentType: 'sales_receipt',
          sourceDocumentId: created.id,
        },
      });
    }

    await tx.customer.update({ where: { id: data.customerId }, data: balanceIncrement(currency, totalAmount) });
    await writeAuditLog(tx, {
      action: 'SALES_RECEIPT_CREATED',
      entityType: 'sales_receipt',
      entityId: created.id,
      userId: auditUserId,
      detailsJson: {
        documentNo: created.documentNo,
        customerId: data.customerId,
        currency,
        totalAmount,
        localUuid: data.localUuid ?? null,
      },
    });

    return created;
  });
}

function normalizeRateSnapshot(rate: unknown) {
  if (!rate || typeof rate !== 'object') return null;
  const raw = rate as Partial<Record<'usdToTry' | 'eurToTry' | 'tryToUsd' | 'tryToEur' | 'eurToUsd' | 'usdToEur', number | null>>;
  if (!raw.usdToTry || !raw.eurToTry) return null;
  const usdToTry = Number(raw.usdToTry);
  const eurToTry = Number(raw.eurToTry);
  return {
    usdToTry,
    eurToTry,
    tryToUsd: Number(raw.tryToUsd ?? 1 / usdToTry),
    tryToEur: Number(raw.tryToEur ?? 1 / eurToTry),
    eurToUsd: raw.eurToUsd == null ? eurToTry / usdToTry : Number(raw.eurToUsd),
    usdToEur: raw.usdToEur == null ? usdToTry / eurToTry : Number(raw.usdToEur),
  };
}

function balanceIncrement(currency: 'TRY' | 'USD' | 'EUR', totalAmount: number) {
  if (currency === 'USD') return { balanceUsd: { increment: totalAmount } };
  if (currency === 'EUR') return { balanceEur: { increment: totalAmount } };
  return { balance: { increment: totalAmount }, balanceTry: { increment: totalAmount } };
}

function balanceDecrement(currency: 'TRY' | 'USD' | 'EUR', totalAmount: number) {
  if (currency === 'USD') return { balanceUsd: { decrement: totalAmount } };
  if (currency === 'EUR') return { balanceEur: { decrement: totalAmount } };
  return { balance: { decrement: totalAmount }, balanceTry: { decrement: totalAmount } };
}

router.get('/', asyncHandler(async (_req, res) => {
  const receipts = await prisma.salesReceipt.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(receipts);
}));

router.post('/', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const receipt = await createSalesReceiptFromPayload({ ...req.body, auditUserId: req.user?.userId });
  res.status(201).json(receipt);
}));

router.post('/:id/cancel', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = cancelSchema.parse(req.body);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Gecersiz satis fisi id.');

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.salesReceipt.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!current) throw new Error(`Satis fisi bulunamadi: ${id}`);
    if (current.cancelled || current.status === 'CANCELLED') throw new Error('Satis fisi daha once iptal edilmis.');

    const cancelledAt = new Date();
    const updated = await tx.salesReceipt.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelled: true,
        cancelledAt,
        cancelReason: data.reason ?? data.note ?? 'Iptal nedeni girilmedi.',
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    for (const item of current.items) {
      const quantity = Number(item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          sourceDocumentType: 'sales_receipt_cancel',
          sourceDocumentId: current.id,
        },
      });
    }

    await tx.customer.update({
      where: { id: current.customerId },
      data: balanceDecrement(current.currency, Number(current.totalAmount)),
    });
    await writeAuditLog(tx, {
      action: 'SALES_RECEIPT_CANCELLED',
      entityType: 'sales_receipt',
      entityId: current.id,
      userId: req.user?.userId,
      detailsJson: {
        documentNo: current.documentNo,
        customerId: current.customerId,
        currency: current.currency,
        totalAmount: Number(current.totalAmount),
        reason: data.reason ?? data.note ?? 'Iptal nedeni girilmedi.',
      },
    });

    return updated;
  });

  res.json(receipt);
}));

export default router;
