import { Router } from 'express';
import { MovementType } from '@prisma/client';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, createDocumentNo } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requireRole } from '../auth/auth.js';
import { convertCurrency, getActiveRate, priceForCurrency } from '../currency/currency.js';
import { purchaseReceiptSchema } from './receipts.schemas.js';

const router = Router();

const cancelSchema = purchaseReceiptSchema.pick({ note: true }).extend({
  reason: purchaseReceiptSchema.shape.note.optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
  const receipts = await prisma.purchaseReceipt.findMany({
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(receipts);
}));

router.post('/', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const data = purchaseReceiptSchema.parse(req.body);

  const receipt = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new Error(`Tedarikci bulunamadi: ${data.supplierId}`);
    const rate = await getActiveRate(tx);
    const currency = data.currency ?? supplier.defaultCurrency;
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const calculatedPrice = item.unitPrice == null ? priceForCurrency(currency, {
        tryPrice: product.buyPriceTry,
        usdPrice: product.buyPriceUsd,
        eurPrice: product.buyPriceEur,
      }, rate) : { amount: item.unitPrice, originalCurrency: currency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, lineTotal: item.quantity * calculatedPrice.amount, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, currency, 'TRY', rate).amount;
    const created = await tx.purchaseReceipt.create({
      data: {
        supplierId: data.supplierId,
        documentNo: data.documentNo ?? createDocumentNo('ALI'),
        totalAmount,
        totalAmountTry,
        currency,
        exchangeRateSnapshot: rate,
        usdToTry: rate.usdToTry,
        eurToTry: rate.eurToTry,
        eurToUsd: rate.eurToUsd,
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
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.PURCHASE_IN,
          quantity: item.quantity,
          sourceDocumentType: 'purchase_receipt',
          sourceDocumentId: created.id,
        },
      });
    }

    await tx.supplier.update({ where: { id: data.supplierId }, data: balanceIncrement(currency, totalAmount) });
    await writeAuditLog(tx, {
      action: 'PURCHASE_RECEIPT_CREATED',
      entityType: 'purchase_receipt',
      entityId: created.id,
      userId: req.user?.userId,
      detailsJson: {
        documentNo: created.documentNo,
        supplierId: data.supplierId,
        currency,
        totalAmount,
      },
    });

    return created;
  });

  res.status(201).json(receipt);
}));

router.post('/:id/cancel', requireRole(['ADMIN', 'MANAGER']), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = cancelSchema.parse(req.body);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Gecersiz alis fisi id.');

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.purchaseReceipt.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!current) throw new Error(`Alis fisi bulunamadi: ${id}`);
    if (current.cancelled || current.status === 'CANCELLED') throw new Error('Alis fisi daha once iptal edilmis.');

    for (const item of current.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      if (Number(product.quantity) < Number(item.quantity)) {
        throw new Error(`${product.stockCode} icin alis iptali yapilamaz. Mevcut stok: ${product.quantity}, iptal adedi: ${item.quantity}`);
      }
    }

    const updated = await tx.purchaseReceipt.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelled: true,
        cancelledAt: new Date(),
        cancelReason: data.reason ?? data.note ?? 'Iptal nedeni girilmedi.',
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    for (const item of current.items) {
      const quantity = Number(item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          sourceDocumentType: 'purchase_receipt_cancel',
          sourceDocumentId: current.id,
        },
      });
    }

    await tx.supplier.update({
      where: { id: current.supplierId },
      data: balanceDecrement(current.currency, Number(current.totalAmount)),
    });
    await writeAuditLog(tx, {
      action: 'PURCHASE_RECEIPT_CANCELLED',
      entityType: 'purchase_receipt',
      entityId: current.id,
      userId: req.user?.userId,
      detailsJson: {
        documentNo: current.documentNo,
        supplierId: current.supplierId,
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
