import { Router } from 'express';
import { Currency, MovementType } from '@prisma/client';
import { prisma } from '../../prisma/client.js';
import { asyncHandler, createDocumentNo, idParamSchema } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requirePermission } from '../auth/auth.js';
import { convertCurrency, getActiveRate, type RateSnapshot } from '../currency/currency.js';
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
    const documentCurrency = data.currency ?? customer.defaultCurrency;
    const accountCurrency = customer.defaultCurrency;
    const exchangeRateToTry = rateForToTry(documentCurrency, rate);
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Urun bulunamadi: ${item.productId}`);
      }
      if (Number(product.quantity) < item.quantity) {
        throw new Error(`${product.stockCode} icin stok yetersiz. Mevcut: ${product.quantity}, istenen: ${item.quantity}`);
      }
      const calculatedPrice = item.unitPrice == null
        ? priceFromProductCurrency(documentCurrency, Number(product.salePrice), product.currency, rate)
        : { amount: item.unitPrice, originalCurrency: documentCurrency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      const lineTotal = item.quantity * calculatedPrice.amount;
      const unitPriceTry = convertCurrency(calculatedPrice.amount, documentCurrency, 'TRY', rate).amount;
      const lineTotalTry = convertCurrency(lineTotal, documentCurrency, 'TRY', rate).amount;
      const unitCostTry = Number(product.averageCostTry);
      const totalCostTry = item.quantity * unitCostTry;
      const grossProfitTry = lineTotalTry - totalCostTry;
      const profitMargin = lineTotalTry > 0 ? (grossProfitTry / lineTotalTry) * 100 : 0;
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, lineTotal, unitPriceTry, lineTotalTry, unitCostTry, totalCostTry, grossProfitTry, profitMargin, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(totalAmount, documentCurrency, accountCurrency, rate).amount;

    const created = await tx.salesReceipt.create({
      data: {
        customerId: data.customerId,
        documentNo: data.documentNo ?? createDocumentNo('SAT'),
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
            lineCurrency: documentCurrency,
            unitPriceOriginal: item.unitPrice,
            lineTotalOriginal: item.quantity * item.unitPrice,
            unitPriceTry: item.unitPriceTry,
            lineTotalTry: item.lineTotalTry,
            unitCostTry: item.unitCostTry,
            totalCostTry: item.totalCostTry,
            grossProfitTry: item.grossProfitTry,
            profitMargin: item.profitMargin,
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
      const stockAfter = Number(product.quantity) - item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.SALE_OUT,
          quantity: item.quantity,
          unitCostTry: item.unitCostTry,
          valueChangeTry: -item.totalCostTry,
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'sales_receipt',
          sourceDocumentId: created.id,
        },
      });
    }

    await tx.customer.update({ where: { id: data.customerId }, data: balanceIncrement(accountCurrency, accountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'CUSTOMER',
        customerId: data.customerId,
        documentType: 'SALES_RECEIPT',
        documentId: created.id,
        documentNo: created.documentNo,
        direction: 'DEBIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: totalAmount,
        description: 'Satis fisi',
      },
    });
    await writeAuditLog(tx, {
      action: 'SALES_RECEIPT_CREATED',
      entityType: 'sales_receipt',
      entityId: created.id,
      userId: auditUserId,
      detailsJson: {
        documentNo: created.documentNo,
        customerId: data.customerId,
        currency: documentCurrency,
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

router.get('/', requirePermission('salesView'), asyncHandler(async (_req, res) => {
  const receipts = await prisma.salesReceipt.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(receipts);
}));

router.get('/:id/profit', requirePermission('reportsView'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const receipt = await prisma.salesReceipt.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!receipt) throw new Error(`Satis fisi bulunamadi: ${id}`);

  const items = receipt.items.map((item) => {
    const salesAmountTry = Number(item.lineTotalTry || item.lineTotal);
    const costTry = Number(item.totalCostTry);
    const grossProfitTry = Number(item.grossProfitTry || (costTry > 0 ? salesAmountTry - costTry : 0));
    const profitMargin = salesAmountTry > 0 ? (grossProfitTry / salesAmountTry) * 100 : 0;
    return {
      itemId: item.id,
      productId: item.productId,
      productCode: item.product.stockCode,
      productName: `${item.product.brand} ${item.product.typeName}`,
      quantity: Number(item.quantity),
      lineCurrency: item.lineCurrency ?? item.currency,
      lineTotalOriginal: Number(item.lineTotalOriginal || item.lineTotal),
      lineTotalTry: salesAmountTry,
      unitCostTry: Number(item.unitCostTry),
      totalCostTry: costTry,
      grossProfitTry,
      profitMargin,
      costStatus: costTry > 0 ? 'ok' : 'missing',
    };
  });
  const salesAmountTry = items.reduce((sum, item) => sum + item.lineTotalTry, 0);
  const costTry = items.reduce((sum, item) => sum + item.totalCostTry, 0);
  const grossProfitTry = items.reduce((sum, item) => sum + item.grossProfitTry, 0);
  res.json({
    receiptId: receipt.id,
    documentNo: receipt.documentNo,
    customerName: receipt.customer.name,
    createdAt: receipt.createdAt,
    documentCurrency: receipt.documentCurrency ?? receipt.currency,
    originalTotal: Number(receipt.originalTotal || receipt.totalAmount),
    totalTry: Number(receipt.totalTry || receipt.totalAmountTry || receipt.totalAmount),
    salesAmountTry,
    costTry,
    grossProfitTry,
    profitMargin: salesAmountTry > 0 ? (grossProfitTry / salesAmountTry) * 100 : 0,
    costStatus: items.some((item) => item.costStatus !== 'ok') ? 'missing' : 'ok',
    items,
  });
}));

router.get('/:id', requirePermission('salesView'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const receipt = await prisma.salesReceipt.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!receipt) throw new Error(`Satis fisi bulunamadi: ${id}`);
  res.json(receipt);
}));

router.post('/', requirePermission('salesCreate'), asyncHandler(async (req, res) => {
  const receipt = await createSalesReceiptFromPayload({ ...req.body, auditUserId: req.user?.userId });
  res.status(201).json(receipt);
}));

router.put('/:id', requirePermission('salesCreate'), asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const data = salesReceiptSchema.parse(req.body);

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.salesReceipt.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
    if (!current) throw new Error(`Satis fisi bulunamadi: ${id}`);
    if (current.cancelled || current.status === 'CANCELLED') throw new Error('Iptal edilmis satis fisi duzenlenemez.');

    for (const item of current.items) {
      const quantity = Number(item.quantity);
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const stockAfter = Number(product.quantity) + quantity;
      const unitCostTry = Number(item.unitCostTry);
      const totalCostTry = Number(item.totalCostTry);
      await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          unitCostTry,
          valueChangeTry: totalCostTry,
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'sales_receipt_update_reverse',
          sourceDocumentId: current.id,
        },
      });
    }

    const oldRate = normalizeRateSnapshot(current.exchangeRateSnapshot) ?? rateSnapshotFromReceipt(current);
    const oldDocumentCurrency = current.documentCurrency ?? current.currency;
    const oldAccountCurrency = current.customer.defaultCurrency;
    const oldAccountAmount = convertCurrency(Number(current.totalAmount), oldDocumentCurrency, oldAccountCurrency, oldRate).amount;
    await tx.customer.update({ where: { id: current.customerId }, data: balanceDecrement(oldAccountCurrency, oldAccountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'CUSTOMER',
        customerId: current.customerId,
        documentType: 'CANCEL',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'CREDIT',
        currency: oldAccountCurrency,
        amount: oldAccountAmount,
        amountTry: current.totalAmountTry,
        accountCurrency: oldAccountCurrency,
        accountAmount: oldAccountAmount,
        documentCurrency: oldDocumentCurrency,
        documentAmount: current.totalAmount,
        description: 'Satis fisi duzenleme geri alma',
      },
    });

    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error(`Musteri bulunamadi: ${data.customerId}`);
    const rate = normalizeRateSnapshot(data.exchangeRateSnapshot ?? data.usedExchangeRate) ?? await getActiveRate(tx);
    const documentCurrency = data.currency ?? customer.defaultCurrency;
    const accountCurrency = customer.defaultCurrency;
    const exchangeRateToTry = rateForToTry(documentCurrency, rate);
    const calculatedItems = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      if (Number(product.quantity) < item.quantity) {
        throw new Error(`${product.stockCode} icin stok yetersiz. Mevcut: ${product.quantity}, istenen: ${item.quantity}`);
      }
      const calculatedPrice = item.unitPrice == null
        ? priceFromProductCurrency(documentCurrency, Number(product.salePrice), product.currency, rate)
        : { amount: item.unitPrice, originalCurrency: documentCurrency, originalUnitPrice: item.unitPrice, rateUsed: 1, converted: false };
      const lineTotal = item.quantity * calculatedPrice.amount;
      const unitPriceTry = convertCurrency(calculatedPrice.amount, documentCurrency, 'TRY', rate).amount;
      const lineTotalTry = convertCurrency(lineTotal, documentCurrency, 'TRY', rate).amount;
      const unitCostTry = Number(product.averageCostTry);
      const totalCostTry = item.quantity * unitCostTry;
      const grossProfitTry = lineTotalTry - totalCostTry;
      const profitMargin = lineTotalTry > 0 ? (grossProfitTry / lineTotalTry) * 100 : 0;
      calculatedItems.push({ ...item, unitPrice: calculatedPrice.amount, lineTotal, unitPriceTry, lineTotalTry, unitCostTry, totalCostTry, grossProfitTry, profitMargin, priceMeta: calculatedPrice });
    }
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmountTry = convertCurrency(totalAmount, documentCurrency, 'TRY', rate).amount;
    const accountAmount = convertCurrency(totalAmount, documentCurrency, accountCurrency, rate).amount;

    await tx.salesReceiptItem.deleteMany({ where: { salesReceiptId: current.id } });
    const updated = await tx.salesReceipt.update({
      where: { id: current.id },
      data: {
        customerId: data.customerId,
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
            lineCurrency: documentCurrency,
            unitPriceOriginal: item.unitPrice,
            lineTotalOriginal: item.quantity * item.unitPrice,
            unitPriceTry: item.unitPriceTry,
            lineTotalTry: item.lineTotalTry,
            unitCostTry: item.unitCostTry,
            totalCostTry: item.totalCostTry,
            grossProfitTry: item.grossProfitTry,
            profitMargin: item.profitMargin,
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
      include: { customer: true, items: { include: { product: true } } },
    });

    for (const item of calculatedItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const stockAfter = Number(product.quantity) - item.quantity;
      await tx.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.SALE_OUT,
          quantity: item.quantity,
          unitCostTry: item.unitCostTry,
          valueChangeTry: -item.totalCostTry,
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'sales_receipt_update',
          sourceDocumentId: current.id,
        },
      });
    }

    await tx.customer.update({ where: { id: data.customerId }, data: balanceIncrement(accountCurrency, accountAmount) });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'CUSTOMER',
        customerId: data.customerId,
        documentType: 'SALES_RECEIPT',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'DEBIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: totalAmount,
        description: 'Satis fisi duzenleme',
      },
    });
    await writeAuditLog(tx, {
      action: 'SALES_RECEIPT_UPDATED',
      entityType: 'sales_receipt',
      entityId: current.id,
      userId: req.user?.userId,
      detailsJson: { documentNo: current.documentNo, customerId: data.customerId, currency: documentCurrency, totalAmount },
    });

    return updated;
  });

  res.json(receipt);
}));

router.post('/:id/cancel', requirePermission('salesCancel'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = cancelSchema.parse(req.body);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Gecersiz satis fisi id.');

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.salesReceipt.findUnique({
      where: { id },
      include: { items: true, customer: true },
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
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Urun bulunamadi: ${item.productId}`);
      const stockAfter = Number(product.quantity) + quantity;
      const unitCostTry = Number(item.unitCostTry);
      const totalCostTry = Number(item.totalCostTry);
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.CANCEL,
          quantity,
          unitCostTry,
          valueChangeTry: totalCostTry,
          stockAfter,
          averageCostAfterTry: product.averageCostTry,
          sourceDocumentType: 'sales_receipt_cancel',
          sourceDocumentId: current.id,
        },
      });
    }

    const rate = normalizeRateSnapshot(current.exchangeRateSnapshot) ?? {
      usdToTry: Number(current.usdToTry),
      eurToTry: Number(current.eurToTry),
      tryToUsd: 1 / Number(current.usdToTry),
      tryToEur: 1 / Number(current.eurToTry),
      eurToUsd: current.eurToUsd == null ? Number(current.eurToTry) / Number(current.usdToTry) : Number(current.eurToUsd),
      usdToEur: current.eurToUsd == null ? Number(current.usdToTry) / Number(current.eurToTry) : 1 / Number(current.eurToUsd),
    };
    const documentCurrency = current.documentCurrency ?? current.currency;
    const accountCurrency = current.customer.defaultCurrency;
    const accountAmount = convertCurrency(Number(current.totalAmount), documentCurrency, accountCurrency, rate).amount;

    await tx.customer.update({
      where: { id: current.customerId },
      data: balanceDecrement(accountCurrency, accountAmount),
    });
    await tx.currentAccountMovement.create({
      data: {
        partyType: 'CUSTOMER',
        customerId: current.customerId,
        documentType: 'CANCEL',
        documentId: current.id,
        documentNo: current.documentNo,
        direction: 'CREDIT',
        currency: accountCurrency,
        amount: accountAmount,
        amountTry: current.totalAmountTry,
        accountCurrency,
        accountAmount,
        documentCurrency,
        documentAmount: current.totalAmount,
        description: data.reason ?? data.note ?? 'Satis fisi iptali',
      },
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
