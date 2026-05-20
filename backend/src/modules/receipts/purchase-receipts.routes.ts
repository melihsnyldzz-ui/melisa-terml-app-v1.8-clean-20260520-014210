import { Router } from 'express';
import { Currency, MovementType } from '@prisma/client';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, createDocumentNo, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requirePermission } from '../auth/auth.js';
import { convertCurrency, getActiveRate, type RateSnapshot } from '../currency/currency.js';
import { purchaseReceiptSchema } from './receipts.schemas.js';

const router = Router();

const cancelSchema = purchaseReceiptSchema.pick({ note: true }).extend({
  reason: purchaseReceiptSchema.shape.note.optional(),
});

router.get('/', requirePermission('purchaseView'), asyncHandler(async (_req, res) => {
  const receipts = await prisma.purchaseReceipt.findMany({
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(receipts);
}));

router.get('/:id', requirePermission('purchaseView'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const receipt = await prisma.purchaseReceipt.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!receipt) throw new Error(`Alis fisi bulunamadi: ${id}`);
  const totalQuantity = receipt.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalAmount = Number(receipt.totalAmount);
  res.json({
    ...receipt,
    header: {
      id: receipt.id,
      documentNo: receipt.documentNo,
      supplierId: receipt.supplierId,
      supplierName: receipt.supplier.name,
      currency: receipt.currency,
      status: receipt.status,
      cancelled: receipt.cancelled,
      createdAt: receipt.createdAt,
    },
    totals: {
      totalQuantity,
      subtotal: totalAmount,
      vat: 0,
      grandTotal: totalAmount,
      totalAmountTry: receipt.totalAmountTry,
      currency: receipt.currency,
    },
    supplierDebtEffect: {
      supplierId: receipt.supplierId,
      supplierName: receipt.supplier.name,
      direction: receipt.cancelled || receipt.status === 'CANCELLED' ? 'cancelled' : 'debt_increase',
      amount: receipt.totalAmount,
      currency: receipt.currency,
      balanceTry: receipt.supplier.balanceTry,
      balanceUsd: receipt.supplier.balanceUsd,
      balanceEur: receipt.supplier.balanceEur,
    },
  });
}));

router.post('/', requirePermission('purchaseCreate'), asyncHandler(async (req, res) => {
  const data = purchaseReceiptSchema.parse(req.body);

  const receipt = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new Error(`Tedarikci bulunamadi: ${data.supplierId}`);
    const rate = await getActiveRate(tx);
    const documentCurrency = data.currency ?? supplier.defaultCurrency;
    const accountCurrency = supplier.defaultCurrency;
    const exchangeRateToTry = rateForToTry(documentCurrency, rate);
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const calculatedPrice = item.unitPrice == null
        ? priceFromProductCurrency(documentCurrency, Number(product.purchasePrice), product.currency, rate)
        : { amount: item.unitPrice, originalCurrency: documentCurrency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      const unitCostTry = convertCurrency(calculatedPrice.amount, documentCurrency, 'TRY', rate).amount;
      const lineTotal = item.quantity * calculatedPrice.amount;
      const lineTotalTry = convertCurrency(lineTotal, documentCurrency, 'TRY', rate).amount;
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, unitCostTry, lineTotal, lineTotalTry, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(totalAmount, documentCurrency, accountCurrency, rate).amount;
    const created = await tx.purchaseReceipt.create({
      data: {
        supplierId: data.supplierId,
        documentNo: data.documentNo ?? createDocumentNo('ALI'),
        totalAmount,
        totalAmountTry,
        currency: documentCurrency,
        documentCurrency,
        exchangeRateToTry,
        originalTotal: totalAmount,
        totalTry: totalAmountTry,
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
            lineCurrency: documentCurrency,
            unitPriceOriginal: item.unitPrice,
            lineTotalOriginal: item.quantity * item.unitPrice,
            unitPriceTry: item.unitCostTry,
            lineTotalTry: item.lineTotalTry,
            currency: documentCurrency,
            originalUnitPrice: item.priceMeta.originalUnitPrice,
            originalCurrency: item.priceMeta.originalCurrency,
            receiptCurrency: documentCurrency,
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
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const currentQuantity = Number(product.quantity);
      const currentAverageCostTry = Number(product.averageCostTry);
      const stockAfter = currentQuantity + item.quantity;
      const averageCostTry = stockAfter > 0
        ? ((currentQuantity * currentAverageCostTry) + (item.quantity * item.unitCostTry)) / stockAfter
        : item.unitCostTry;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity }, averageCostTry },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.PURCHASE_IN,
          quantity: item.quantity,
          unitCostTry: item.unitCostTry,
          valueChangeTry: item.quantity * item.unitCostTry,
          stockAfter,
          averageCostAfterTry: averageCostTry,
          sourceDocumentType: 'purchase_receipt',
          sourceDocumentId: created.id,
        },
      });
    }

    await tx.supplier.update({ where: { id: data.supplierId }, data: balanceIncrement(accountCurrency, accountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'SUPPLIER',
        supplierId: data.supplierId,
        documentType: 'PURCHASE_RECEIPT',
        documentId: created.id,
        documentNo: created.documentNo,
        direction: 'CREDIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: totalAmount,
        description: 'Alis fisi',
      },
    });
    await writeAuditLog(tx, {
      action: 'PURCHASE_RECEIPT_CREATED',
      entityType: 'purchase_receipt',
      entityId: created.id,
      userId: req.user?.userId,
      detailsJson: {
        documentNo: created.documentNo,
        supplierId: data.supplierId,
        currency: documentCurrency,
        totalAmount,
      },
    });

    return created;
  });

  res.status(201).json(receipt);
}));

router.put('/:id', requirePermission('purchaseCreate'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = purchaseReceiptSchema.parse(req.body);

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.purchaseReceipt.findUnique({
      where: { id },
      include: { items: true, supplier: true },
    });
    if (!current) throw new Error(`Alis fisi bulunamadi: ${id}`);
    if (current.cancelled || current.status === 'CANCELLED') throw new Error('Iptal edilmis alis fisi duzenlenemez.');

    for (const item of current.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      if (Number(product.quantity) < Number(item.quantity)) {
        throw new Error(`${product.stockCode} icin alis fisi duzenlenemez. Mevcut stok: ${product.quantity}, geri alinacak adet: ${item.quantity}`);
      }
    }

    const oldRate = normalizeRateSnapshot(current.exchangeRateSnapshot) ?? rateSnapshotFromReceipt(current);
    const oldDocumentCurrency = current.documentCurrency ?? current.currency;
    const oldAccountCurrency = current.supplier.defaultCurrency;
    const oldAccountAmount = convertCurrency(Number(current.totalAmount), oldDocumentCurrency, oldAccountCurrency, oldRate).amount;

    for (const item of current.items) {
      const quantity = Number(item.quantity);
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const stockAfter = Number(product.quantity) - quantity;
      const unitCostTry = Number(item.unitPriceTry ?? convertCurrency(Number(item.unitPrice), oldDocumentCurrency, 'TRY', oldRate).amount);
      await tx.product.update({ where: { id: item.productId }, data: { quantity: { decrement: quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          unitCostTry,
          valueChangeTry: -(quantity * unitCostTry),
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'purchase_receipt_update_reverse',
          sourceDocumentId: current.id,
        },
      });
    }

    await tx.supplier.update({ where: { id: current.supplierId }, data: balanceDecrement(oldAccountCurrency, oldAccountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'SUPPLIER',
        supplierId: current.supplierId,
        documentType: 'CANCEL',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'DEBIT',
        currency: oldAccountCurrency,
        amount: oldAccountAmount,
        amountTry: current.totalAmountTry,
        accountCurrency: oldAccountCurrency,
        accountAmount: oldAccountAmount,
        documentCurrency: oldDocumentCurrency,
        documentAmount: current.totalAmount,
        description: 'Alis fisi duzenleme geri alma',
      },
    });

    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new Error(`Tedarikci bulunamadi: ${data.supplierId}`);
    const rate = await getActiveRate(tx);
    const documentCurrency = data.currency ?? supplier.defaultCurrency;
    const accountCurrency = supplier.defaultCurrency;
    const exchangeRateToTry = rateForToTry(documentCurrency, rate);
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const calculatedPrice = item.unitPrice == null
        ? priceFromProductCurrency(documentCurrency, Number(product.purchasePrice), product.currency, rate)
        : { amount: item.unitPrice, originalCurrency: documentCurrency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      const unitCostTry = convertCurrency(calculatedPrice.amount, documentCurrency, 'TRY', rate).amount;
      const lineTotal = item.quantity * calculatedPrice.amount;
      const lineTotalTry = convertCurrency(lineTotal, documentCurrency, 'TRY', rate).amount;
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, unitCostTry, lineTotal, lineTotalTry, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(totalAmount, documentCurrency, accountCurrency, rate).amount;

    await tx.purchaseReceiptItem.deleteMany({ where: { purchaseReceiptId: current.id } });
    const updated = await tx.purchaseReceipt.update({
      where: { id: current.id },
      data: {
        supplierId: data.supplierId,
        totalAmount,
        totalAmountTry,
        currency: documentCurrency,
        documentCurrency,
        exchangeRateToTry,
        originalTotal: totalAmount,
        totalTry: totalAmountTry,
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
            lineCurrency: documentCurrency,
            unitPriceOriginal: item.unitPrice,
            lineTotalOriginal: item.quantity * item.unitPrice,
            unitPriceTry: item.unitCostTry,
            lineTotalTry: item.lineTotalTry,
            currency: documentCurrency,
            originalUnitPrice: item.priceMeta.originalUnitPrice,
            originalCurrency: item.priceMeta.originalCurrency,
            receiptCurrency: documentCurrency,
            exchangeRateUsed: item.priceMeta.rateUsed,
            convertedUnitPrice: item.unitPrice,
            usdToTry: rate.usdToTry,
            eurToTry: rate.eurToTry,
            eurToUsd: rate.eurToUsd,
          })),
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    for (const item of calculatedItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const currentQuantity = Number(product.quantity);
      const currentAverageCostTry = Number(product.averageCostTry);
      const stockAfter = currentQuantity + item.quantity;
      const averageCostTry = stockAfter > 0 ? ((currentQuantity * currentAverageCostTry) + (item.quantity * item.unitCostTry)) / stockAfter : item.unitCostTry;
      await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity }, averageCostTry } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.PURCHASE_IN,
          quantity: item.quantity,
          unitCostTry: item.unitCostTry,
          valueChangeTry: item.quantity * item.unitCostTry,
          stockAfter,
          averageCostAfterTry: averageCostTry,
          sourceDocumentType: 'purchase_receipt_update',
          sourceDocumentId: current.id,
        },
      });
    }

    await tx.supplier.update({ where: { id: data.supplierId }, data: balanceIncrement(accountCurrency, accountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'SUPPLIER',
        supplierId: data.supplierId,
        documentType: 'PURCHASE_RECEIPT',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'CREDIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: totalAmount,
        description: 'Alis fisi duzenleme',
      },
    });
    await writeAuditLog(tx, {
      action: 'PURCHASE_RECEIPT_UPDATED',
      entityType: 'purchase_receipt',
      entityId: current.id,
      userId: req.user?.userId,
      detailsJson: { documentNo: current.documentNo, supplierId: data.supplierId, currency: documentCurrency, totalAmount },
    });

    return updated;
  });

  res.json(receipt);
}));

router.post('/:id/cancel', requirePermission('purchaseCancel'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = cancelSchema.parse(req.body);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Gecersiz alis fisi id.');

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.purchaseReceipt.findUnique({
      where: { id },
      include: { items: true, supplier: true },
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
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const stockAfter = Number(product.quantity) - quantity;
      const unitCostTry = convertCurrency(Number(item.unitPrice), current.currency, 'TRY', {
        usdToTry: Number(item.usdToTry),
        eurToTry: Number(item.eurToTry),
        tryToUsd: 1 / Number(item.usdToTry),
        tryToEur: 1 / Number(item.eurToTry),
        eurToUsd: item.eurToUsd == null ? Number(item.eurToTry) / Number(item.usdToTry) : Number(item.eurToUsd),
        usdToEur: item.eurToUsd == null ? Number(item.usdToTry) / Number(item.eurToTry) : 1 / Number(item.eurToUsd),
      }).amount;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          unitCostTry,
          valueChangeTry: -(quantity * unitCostTry),
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'purchase_receipt_cancel',
          sourceDocumentId: current.id,
        },
      });
    }

    const rate = {
      usdToTry: Number(current.usdToTry),
      eurToTry: Number(current.eurToTry),
      tryToUsd: 1 / Number(current.usdToTry),
      tryToEur: 1 / Number(current.eurToTry),
      eurToUsd: current.eurToUsd == null ? Number(current.eurToTry) / Number(current.usdToTry) : Number(current.eurToUsd),
      usdToEur: current.eurToUsd == null ? Number(current.usdToTry) / Number(current.eurToTry) : 1 / Number(current.eurToUsd),
    };
    const documentCurrency = current.documentCurrency ?? current.currency;
    const accountCurrency = current.supplier.defaultCurrency;
    const accountAmount = convertCurrency(Number(current.totalAmount), documentCurrency, accountCurrency, rate).amount;

    await tx.supplier.update({
      where: { id: current.supplierId },
      data: balanceDecrement(accountCurrency, accountAmount),
    });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'SUPPLIER',
        supplierId: current.supplierId,
        documentType: 'CANCEL',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'DEBIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: current.totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: current.totalAmount,
        description: data.reason ?? data.note ?? 'Alis fisi iptali',
      },
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
    usdToEur: raw.usdToEur == null ? usdToTry / eurToTry : 1 / Number(raw.eurToUsd),
  };
}

function rateSnapshotFromReceipt(receipt: { usdToTry: unknown; eurToTry: unknown; eurToUsd?: unknown }) {
  const usdToTry = Number(receipt.usdToTry);
  const eurToTry = Number(receipt.eurToTry);
  const eurToUsd = receipt.eurToUsd == null ? eurToTry / usdToTry : Number(receipt.eurToUsd);
  return {
    usdToTry,
    eurToTry,
    tryToUsd: 1 / usdToTry,
    tryToEur: 1 / eurToTry,
    eurToUsd,
    usdToEur: 1 / eurToUsd,
  };
}

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

function rateForToTry(currency: Currency, rate: RateSnapshot) {
  if (currency === 'USD') return rate.usdToTry;
  if (currency === 'EUR') return rate.eurToTry;
  return 1;
}

function priceFromProductCurrency(documentCurrency: Currency, productPrice: number, productCurrency: Currency, rate: RateSnapshot) {
  const converted = convertCurrency(productPrice, productCurrency, documentCurrency, rate);
  return {
    amount: converted.amount,
    originalCurrency: productCurrency,
    originalUnitPrice: productPrice,
    rateUsed: converted.rateUsed,
    converted: productCurrency !== documentCurrency,
  };
}
