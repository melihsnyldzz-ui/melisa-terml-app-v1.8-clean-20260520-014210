import { Router } from 'express';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { requirePermission } from '../auth/auth.js';

const router = Router();
const LOW_STOCK_LIMIT = 5;

router.use(requirePermission('reportsView'));

function todayStart() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function parseOptionalDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

router.get('/dashboard-summary', asyncHandler(async (_req, res) => {
  const today = todayStart();
  const [
    todaySalesCount,
    todaySalesTotal,
    todayItems,
    activeCustomerCount,
    productCount,
    lowStockCount,
    pendingSyncCount,
    failedSyncCount,
    lastSync,
  ] = await Promise.all([
    prisma.salesReceipt.count({ where: { createdAt: { gte: today }, cancelled: false } }),
    prisma.salesReceipt.aggregate({ where: { createdAt: { gte: today }, cancelled: false }, _sum: { totalAmount: true } }),
    prisma.salesReceiptItem.aggregate({ where: { salesReceipt: { createdAt: { gte: today }, cancelled: false } }, _sum: { quantity: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true, quantity: { lte: LOW_STOCK_LIMIT } } }),
    prisma.terminalSyncQueue.count({ where: { status: 'PENDING' } }),
    prisma.terminalSyncQueue.count({ where: { status: 'FAILED' } }),
    prisma.terminalSyncQueue.findFirst({ where: { syncedAt: { not: null } }, orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } }),
  ]);

  res.json({
    todaySalesCount,
    todaySalesTotal: numberValue(todaySalesTotal._sum.totalAmount),
    todayItemQuantity: numberValue(todayItems._sum.quantity),
    activeCustomerCount,
    productCount,
    lowStockCount,
    pendingSyncCount,
    failedSyncCount,
    lastSyncAt: lastSync?.syncedAt ?? null,
  });
}));

router.get('/recent-sales', asyncHandler(async (_req, res) => {
  const receipts = await prisma.salesReceipt.findMany({
    where: { cancelled: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      customer: { select: { name: true } },
      items: { select: { quantity: true } },
    },
  });

  res.json(receipts.map((receipt) => ({
    receiptNo: receipt.documentNo,
    customerName: receipt.customer.name,
    itemCount: receipt.items.reduce((sum, item) => sum + numberValue(item.quantity), 0),
    totalAmount: numberValue(receipt.totalAmount),
    originalTotal: numberValue(receipt.originalTotal || receipt.totalAmount),
    totalTry: numberValue(receipt.totalTry || receipt.totalAmountTry || receipt.totalAmount),
    currency: receipt.currency,
    documentCurrency: receipt.documentCurrency || receipt.currency,
    createdAt: receipt.createdAt,
    sourceTerminal: receipt.terminalId ?? 'Web Admin',
  })));
}));

router.get('/top-products', asyncHandler(async (_req, res) => {
  const grouped = await prisma.salesReceiptItem.groupBy({
    by: ['productId'],
    where: { salesReceipt: { cancelled: false } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });
  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((item) => item.productId) } },
    select: { id: true, stockCode: true, brand: true, typeName: true },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  res.json(grouped.map((item) => {
    const product = productMap.get(item.productId);
    return {
      productName: product ? `${product.brand} ${product.typeName}` : `Urun #${item.productId}`,
      productCode: product?.stockCode ?? String(item.productId),
      quantity: numberValue(item._sum.quantity),
      totalAmount: numberValue(item._sum.lineTotal),
    };
  }));
}));

router.get('/customer-summary', asyncHandler(async (_req, res) => {
  const grouped = await prisma.salesReceipt.groupBy({
    by: ['customerId'],
    where: { cancelled: false },
    _count: { _all: true },
    _sum: { totalAmount: true },
    _max: { createdAt: true },
    orderBy: { _count: { customerId: 'desc' } },
    take: 10,
  });
  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map((item) => item.customerId) } },
    select: { id: true, name: true },
  });
  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));

  res.json(grouped.map((item) => ({
    customerName: customerMap.get(item.customerId) ?? `Musteri #${item.customerId}`,
    receiptCount: item._count._all,
    totalAmount: numberValue(item._sum.totalAmount),
    lastSaleAt: item._max.createdAt,
  })));
}));

router.get('/product-profit', asyncHandler(async (req, res) => {
  const rows = await buildSalesProfitRows(req.query);
  const grouped = new Map<number, {
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    salesAmountTry: number;
    costTry: number;
    grossProfitTry: number;
    missingCostCount: number;
  }>();
  for (const row of rows) {
    const current = grouped.get(row.productId) ?? {
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      quantity: 0,
      salesAmountTry: 0,
      costTry: 0,
      grossProfitTry: 0,
      missingCostCount: 0,
    };
    current.quantity += row.quantity;
    current.salesAmountTry += row.salesAmountTry;
    current.costTry += row.costTry;
    current.grossProfitTry += row.grossProfitTry;
    current.missingCostCount += row.costStatus === 'ok' ? 0 : 1;
    grouped.set(row.productId, current);
  }
  res.json(Array.from(grouped.values()).map((row) => ({
    ...row,
    profitMargin: row.salesAmountTry > 0 ? (row.grossProfitTry / row.salesAmountTry) * 100 : 0,
    costStatus: row.missingCostCount > 0 ? 'missing' : 'ok',
  })).sort((a, b) => b.grossProfitTry - a.grossProfitTry));
}));

router.get('/sales-profit', asyncHandler(async (req, res) => {
  const rows = await buildSalesProfitRows(req.query);
  const grouped = new Map<number, {
    receiptId: number;
    documentNo: string;
    customerName: string;
    documentCurrency: string;
    originalTotal: number;
    totalTry: number;
    createdAt: Date;
    quantity: number;
    salesAmountTry: number;
    costTry: number;
    grossProfitTry: number;
    missingCostCount: number;
  }>();
  for (const row of rows) {
    const current = grouped.get(row.receiptId) ?? {
      receiptId: row.receiptId,
      documentNo: row.documentNo,
      customerName: row.customerName,
      documentCurrency: row.documentCurrency,
      originalTotal: row.originalTotal,
      totalTry: row.totalTry,
      createdAt: row.createdAt,
      quantity: 0,
      salesAmountTry: 0,
      costTry: 0,
      grossProfitTry: 0,
      missingCostCount: 0,
    };
    current.quantity += row.quantity;
    current.salesAmountTry += row.salesAmountTry;
    current.costTry += row.costTry;
    current.grossProfitTry += row.grossProfitTry;
    current.missingCostCount += row.costStatus === 'ok' ? 0 : 1;
    grouped.set(row.receiptId, current);
  }
  res.json(Array.from(grouped.values()).map((row) => ({
    ...row,
    profitMargin: row.salesAmountTry > 0 ? (row.grossProfitTry / row.salesAmountTry) * 100 : 0,
    costStatus: row.missingCostCount > 0 ? 'missing' : 'ok',
  })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
}));

router.get('/low-profit-products', asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold ?? 15);
  const rows = await buildSalesProfitRows(req.query);
  const grouped = new Map<number, {
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    salesAmountTry: number;
    costTry: number;
    grossProfitTry: number;
    missingCostCount: number;
  }>();
  for (const row of rows) {
    const current = grouped.get(row.productId) ?? {
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      quantity: 0,
      salesAmountTry: 0,
      costTry: 0,
      grossProfitTry: 0,
      missingCostCount: 0,
    };
    current.quantity += row.quantity;
    current.salesAmountTry += row.salesAmountTry;
    current.costTry += row.costTry;
    current.grossProfitTry += row.grossProfitTry;
    current.missingCostCount += row.costStatus === 'ok' ? 0 : 1;
    grouped.set(row.productId, current);
  }
  res.json(Array.from(grouped.values()).map((row) => {
    const profitMargin = row.salesAmountTry > 0 ? (row.grossProfitTry / row.salesAmountTry) * 100 : 0;
    return { ...row, profitMargin, threshold, costStatus: row.missingCostCount > 0 ? 'missing' : 'ok' };
  }).filter((row) => row.costStatus !== 'ok' || row.profitMargin <= threshold).sort((a, b) => a.profitMargin - b.profitMargin));
}));

router.get('/stock-movements', asyncHandler(async (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : undefined;
  const validProductId = productId !== undefined && Number.isInteger(productId) && productId > 0 ? productId : undefined;
  const dateFrom = parseOptionalDate(req.query.dateFrom);
  const dateTo = parseOptionalDate(req.query.dateTo);
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(validProductId ? { productId: validProductId } : {}),
      ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { product: { select: { stockCode: true, barcode: true, brand: true, typeName: true } } },
  });
  res.json(movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productCode: movement.product.stockCode,
    productName: `${movement.product.brand} ${movement.product.typeName}`,
    barcode: movement.product.barcode,
    movementType: movement.movementType,
    quantity: numberValue(movement.quantity),
    sourceDocumentType: movement.sourceDocumentType,
    sourceDocumentId: movement.sourceDocumentId,
    note: movement.note,
    createdAt: movement.createdAt,
  })));
}));

router.get('/stock-valuation', asyncHandler(async (_req, res) => {
  const rows = await buildStockValuationRows();
  res.json(rows);
}));

router.get('/stock-valuation/summary', asyncHandler(async (_req, res) => {
  const rows = await buildStockValuationRows();
  res.json(stockValuationSummary(rows));
}));

router.get('/sales-analytics', asyncHandler(async (_req, res) => {
  const today = todayStart();
  const week = new Date(today);
  week.setDate(week.getDate() - 6);
  const [daily, weekly, currencyRows, topProducts, activeCustomers] = await Promise.all([
    prisma.salesReceipt.aggregate({ where: { createdAt: { gte: today }, cancelled: false }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.salesReceipt.aggregate({ where: { createdAt: { gte: week }, cancelled: false }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.salesReceipt.groupBy({ by: ['currency'], where: { cancelled: false }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.salesReceiptItem.groupBy({
      by: ['productId'],
      where: { salesReceipt: { cancelled: false } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    }),
    prisma.salesReceipt.groupBy({
      by: ['customerId'],
      where: { cancelled: false },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: 1,
    }),
  ]);
  const [topProduct, activeCustomer] = await Promise.all([
    topProducts[0] ? prisma.product.findUnique({ where: { id: topProducts[0].productId }, select: { stockCode: true, brand: true, typeName: true } }) : null,
    activeCustomers[0] ? prisma.customer.findUnique({ where: { id: activeCustomers[0].customerId }, select: { name: true } }) : null,
  ]);

  res.json({
    dailySales: { receiptCount: daily._count._all, totalAmount: numberValue(daily._sum.totalAmount) },
    weeklySales: { receiptCount: weekly._count._all, totalAmount: numberValue(weekly._sum.totalAmount) },
    topProduct: topProducts[0] ? {
      productCode: topProduct?.stockCode ?? String(topProducts[0].productId),
      productName: topProduct ? `${topProduct.brand} ${topProduct.typeName}` : `Urun #${topProducts[0].productId}`,
      quantity: numberValue(topProducts[0]._sum.quantity),
      totalAmount: numberValue(topProducts[0]._sum.lineTotal),
    } : null,
    activeCustomer: activeCustomers[0] ? {
      customerName: activeCustomer?.name ?? `Musteri #${activeCustomers[0].customerId}`,
      receiptCount: activeCustomers[0]._count._all,
      totalAmount: numberValue(activeCustomers[0]._sum.totalAmount),
    } : null,
    currencyTotals: currencyRows.map((row) => ({ currency: row.currency, receiptCount: row._count._all, totalAmount: numberValue(row._sum.totalAmount) })),
  });
}));

async function buildStockValuationRows() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ quantity: 'asc' }, { stockCode: 'asc' }],
    select: {
      id: true,
      stockCode: true,
      barcode: true,
      brand: true,
      typeName: true,
      quantity: true,
      currency: true,
      purchasePrice: true,
      salePrice: true,
      averageCostTry: true,
      sellPrice: true,
      sellPriceTry: true,
    },
  });

  return products.map((product) => {
    const stockQuantity = numberValue(product.quantity);
    const averageCostTry = numberValue(product.averageCostTry);
    const purchasePrice = numberValue(product.purchasePrice);
    const salePrice = numberValue(product.salePrice || product.sellPriceTry || product.sellPrice);
    const salePriceTry = product.currency === 'TRY' ? salePrice : numberValue(product.sellPriceTry || product.sellPrice);
    const stockValueTry = stockQuantity * averageCostTry;
    const potentialSaleValueTry = stockQuantity * salePriceTry;
    const potentialGrossProfitTry = potentialSaleValueTry - stockValueTry;
    const profitMargin = potentialSaleValueTry > 0 ? (potentialGrossProfitTry / potentialSaleValueTry) * 100 : 0;

    return {
      productId: product.id,
      productCode: product.stockCode,
      barcode: product.barcode,
      name: `${product.brand} ${product.typeName}`,
      brand: product.brand,
      currency: product.currency,
      stockQuantity,
      purchasePrice,
      averageCostTry,
      stockValueTry,
      salePrice,
      salePriceTry,
      potentialSaleValueTry,
      potentialGrossProfitTry,
      profitMargin,
      lowStock: stockQuantity <= LOW_STOCK_LIMIT,
    };
  });
}

function stockValuationSummary(rows: Awaited<ReturnType<typeof buildStockValuationRows>>) {
  return rows.reduce((summary, row) => ({
    totalProductCount: summary.totalProductCount + 1,
    totalStockQuantity: summary.totalStockQuantity + row.stockQuantity,
    totalStockValueTry: summary.totalStockValueTry + row.stockValueTry,
    totalPotentialSaleValueTry: summary.totalPotentialSaleValueTry + row.potentialSaleValueTry,
    totalPotentialGrossProfitTry: summary.totalPotentialGrossProfitTry + row.potentialGrossProfitTry,
    lowStockCount: summary.lowStockCount + (row.lowStock ? 1 : 0),
  }), {
    totalProductCount: 0,
    totalStockQuantity: 0,
    totalStockValueTry: 0,
    totalPotentialSaleValueTry: 0,
    totalPotentialGrossProfitTry: 0,
    lowStockCount: 0,
  });
}

async function buildSalesProfitRows(query: Record<string, unknown>) {
  const dateFrom = parseOptionalDate(query.dateFrom);
  const dateTo = parseOptionalDate(query.dateTo);
  const currency = typeof query.currency === 'string' && ['TRY', 'USD', 'EUR'].includes(query.currency) ? query.currency as 'TRY' | 'USD' | 'EUR' : undefined;
  const items = await prisma.salesReceiptItem.findMany({
    where: {
      salesReceipt: {
        cancelled: false,
        ...(currency ? { documentCurrency: currency } : {}),
        ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
      },
    },
    orderBy: { salesReceipt: { createdAt: 'desc' } },
    take: 1000,
    include: {
      product: { select: { stockCode: true, brand: true, typeName: true } },
      salesReceipt: { include: { customer: { select: { name: true } } } },
    },
  });

  return items.map((item) => {
    const quantity = numberValue(item.quantity);
    const salesAmountTry = numberValue(item.lineTotalTry || item.lineTotal);
    const costTry = numberValue(item.totalCostTry);
    const grossProfitTry = numberValue(item.grossProfitTry || (costTry > 0 ? salesAmountTry - costTry : 0));
    const profitMargin = salesAmountTry > 0 ? (grossProfitTry / salesAmountTry) * 100 : 0;
    const costStatus = costTry > 0 ? 'ok' : 'missing';
    return {
      receiptId: item.salesReceiptId,
      documentNo: item.salesReceipt.documentNo,
      customerName: item.salesReceipt.customer.name,
      documentCurrency: item.salesReceipt.documentCurrency || item.salesReceipt.currency,
      originalTotal: numberValue(item.salesReceipt.originalTotal || item.salesReceipt.totalAmount),
      totalTry: numberValue(item.salesReceipt.totalTry || item.salesReceipt.totalAmountTry || item.salesReceipt.totalAmount),
      createdAt: item.salesReceipt.createdAt,
      productId: item.productId,
      productCode: item.product.stockCode,
      productName: `${item.product.brand} ${item.product.typeName}`,
      quantity,
      salesAmountTry,
      costTry,
      grossProfitTry,
      profitMargin,
      costStatus,
    };
  });
}

export default router;
