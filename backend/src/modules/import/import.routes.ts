import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../../prisma/client.js';
import { asyncHandler } from '../../utils.js';
import { writeAuditLog } from '../audit/audit.js';
import { requirePermission } from '../auth/auth.js';

const router = Router();
const currencies = ['TRY', 'USD', 'EUR'] as const;
type Currency = typeof currencies[number];
type ImportMode = 'createOnly' | 'updateOnly' | 'upsert' | 'stockAdjustment';
type ImportKind = 'products' | 'customers' | 'suppliers' | 'prices' | 'stock';
type ImportStatus = 'valid' | 'warning' | 'error' | 'duplicate';
type ImportAction = 'create' | 'update' | 'skip';

type ParsedImport = { headers: string[]; rows: Array<Record<string, string>>; rowWarnings: Record<number, string[]> };
type PreviewRow = {
  rowNumber: number;
  status: ImportStatus;
  valid: boolean;
  warning: string[];
  error: string[];
  duplicate: boolean;
  action: ImportAction;
  data: Record<string, unknown>;
  existingId?: number;
};

type ImportPreview = {
  ok: true;
  kind: ImportKind;
  mode: ImportMode;
  fileName?: string;
  importJobId?: number;
  headers: string[];
  summary: ReturnType<typeof summarize>;
  rows: PreviewRow[];
};

const templates: Record<ImportKind, string> = {
  products: [
    'stockCode,barcode,brand,typeName,currency,purchasePrice,salePrice,buyPriceTry,buyPriceUsd,buyPriceEur,sellPriceTry,sellPriceUsd,sellPriceEur,quantity,active',
    'MB-1001,8690000001001,Melisa Bebe,Bebek Takim,TRY,120,199,120,,,199,,,10,true',
  ].join('\n'),
  customers: [
    'name,phone,defaultCurrency,balanceTry,balanceUsd,balanceEur,active',
    'ABC Baby Store,02120000001,TRY,0,0,0,true',
  ].join('\n'),
  suppliers: [
    'name,phone,defaultCurrency,balanceTry,balanceUsd,balanceEur,active',
    'Melisa Merkez Depo,02120000010,TRY,0,0,0,true',
  ].join('\n'),
  prices: [
    'stockCode,barcode,currency,purchasePrice,salePrice,buyPriceTry,buyPriceUsd,buyPriceEur,sellPriceTry,sellPriceUsd,sellPriceEur',
    'MB-1001,8690000001001,TRY,120,199,120,,,199,,',
  ].join('\n'),
  stock: [
    'stockCode,barcode,quantity,mode,note',
    'MB-1001,8690000001001,12,SET,Sayim duzeltmesi',
  ].join('\n'),
};

const templateRows: Record<ImportKind, string[][]> = {
  products: templates.products.split('\n').map((row) => row.split(',')),
  customers: templates.customers.split('\n').map((row) => row.split(',')),
  suppliers: templates.suppliers.split('\n').map((row) => row.split(',')),
  prices: templates.prices.split('\n').map((row) => row.split(',')),
  stock: templates.stock.split('\n').map((row) => row.split(',')),
};

const bodySchema = (body: unknown): { content: string; fileName?: string; mode: ImportMode; importJobId?: number } => {
  const value = body as { csv?: unknown; fileBase64?: unknown; fileName?: unknown; mode?: unknown; importJobId?: unknown };
  const csv = typeof value.csv === 'string' ? value.csv : '';
  const fileBase64 = typeof value.fileBase64 === 'string' ? value.fileBase64 : '';
  const fileName = typeof value.fileName === 'string' ? value.fileName : undefined;
  const mode = value.mode === 'createOnly' || value.mode === 'updateOnly' || value.mode === 'upsert' || value.mode === 'stockAdjustment' ? value.mode : 'upsert';
  const importJobId = Number(value.importJobId);
  const content = fileBase64 || csv;
  if (!content.trim()) throw new Error('Import dosya icerigi bos.');
  return { content, fileName, mode, importJobId: Number.isFinite(importJobId) && importJobId > 0 ? importJobId : undefined };
};

router.get('/jobs', requirePermission('importApply'), asyncHandler(async (_req, res) => {
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { appliedUser: { select: { id: true, name: true, username: true, role: true, active: true } } },
  });
  res.json(jobs);
}));

router.get('/jobs/:id', requirePermission('importApply'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new Error('Import job id gecersiz.');
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: {
      appliedUser: { select: { id: true, name: true, username: true, role: true, active: true } },
      rows: { orderBy: { rowNumber: 'asc' } },
    },
  });
  if (!job) throw new Error('Import job bulunamadi.');
  res.json(job);
}));

router.get('/jobs/:id/errors.csv', requirePermission('importApply'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new Error('Import job id gecersiz.');
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
  if (!job) throw new Error('Import job bulunamadi.');
  const rows = job.rows.filter((row) => row.status === 'error' || row.status === 'warning' || row.status === 'duplicate');
  const lines = [['rowNumber', 'status', 'action', 'messages', 'entityId', 'rawJson'].join(',')];
  for (const row of rows) {
    const errors = Array.isArray(row.errorJson) ? row.errorJson : [];
    const warnings = Array.isArray(row.warningJson) ? row.warningJson : [];
    lines.push([
      row.rowNumber,
      row.status,
      row.action,
      csvEscape([...errors, ...warnings, row.status === 'duplicate' ? 'duplicate' : ''].filter(Boolean).join(' | ')),
      row.entityId ?? '',
      csvEscape(JSON.stringify(row.rawJson ?? {})),
    ].join(','));
  }
  res
    .type('text/csv')
    .setHeader('Content-Disposition', `attachment; filename="import-job-${id}-errors.csv"`)
    .send(lines.join('\n'));
}));

for (const kind of ['products', 'customers', 'suppliers', 'prices', 'stock'] as ImportKind[]) {
  router.get(`/templates/${kind}`, requirePermission(importPermission(kind)), (_req, res) => {
    res.type('text/csv').send(templates[kind]);
  });
  router.get(`/templates/${kind}.xlsx`, requirePermission(importPermission(kind)), (_req, res) => {
    const buffer = createXlsxTemplate(kind);
    res
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .setHeader('Content-Disposition', `attachment; filename="${kind}-import-template.xlsx"`)
      .send(buffer);
  });
  router.post(`/${kind}/preview`, requirePermission(importPermission(kind)), asyncHandler(async (req, res) => {
    const { content, fileName, mode } = bodySchema(req.body);
    res.json(await previewImport(kind, content, mode, fileName, req.user?.userId));
  }));
  router.post(`/${kind}/apply`, requirePermission(importPermission(kind)), asyncHandler(async (req, res) => {
    const { content, fileName, mode, importJobId } = bodySchema(req.body);
    const preview = importJobId
      ? await loadImportJobPreview(importJobId, kind)
      : await previewImport(kind, content, mode, fileName, req.user?.userId);
    const summary = await applyImport(kind, preview.rows, req.user?.userId, preview.importJobId);
    res.json({ ...preview, summary });
  }));
}

async function previewImport(kind: ImportKind, content: string, mode: ImportMode, fileName?: string, userId?: number): Promise<ImportPreview> {
  const parsed = parseImportContent(content, fileName);
  const rows = kind === 'products'
    ? await previewProducts(parsed, entityImportMode(mode))
    : kind === 'prices'
      ? await previewPrices(parsed)
      : kind === 'stock'
        ? await previewStock(parsed)
    : await previewParties(kind, parsed, entityImportMode(mode));
  const summary = summarize(rows);
  const importJobId = await createImportJob(kind, jobMode(kind, mode), fileName, summary, rows, userId);
  return { ok: true, kind, mode: jobMode(kind, mode), fileName, importJobId, headers: parsed.headers, summary, rows };
}

async function previewProducts(parsed: ParsedImport, mode: ImportMode): Promise<PreviewRow[]> {
  const products = await prisma.product.findMany({ select: { id: true, stockCode: true, barcode: true } });
  const byStockCode = new Map(products.map((item) => [key(item.stockCode), item]));
  const byBarcode = new Map(products.map((item) => [key(item.barcode), item]));
  const seenStockCode = new Map<string, number>();
  const seenBarcode = new Map<string, number>();

  return parsed.rows.map((row, index) => {
    const rowNumber = index + 2;
    const stockCode = text(row.stockCode);
    const barcode = text(row.barcode);
    const errors: string[] = [];
    const warnings: string[] = [...(parsed.rowWarnings[rowNumber] ?? [])];
    const data: Record<string, unknown> = {
      stockCode,
      barcode,
      brand: text(row.brand),
      typeName: text(row.typeName),
      currency: currencyValue(row.currency, warnings),
      purchasePrice: decimalValue(row.purchasePrice, 'purchasePrice', errors),
      salePrice: decimalValue(row.salePrice, 'salePrice', errors),
      buyPrice: decimalValue(row.buyPriceTry || row.buyPrice || row.purchasePrice, 'buyPriceTry', errors),
      sellPrice: decimalValue(row.sellPriceTry || row.sellPrice || row.salePrice, 'sellPriceTry', errors),
      buyPriceTry: decimalValue(row.buyPriceTry || row.buyPrice || row.purchasePrice, 'buyPriceTry', errors),
      buyPriceUsd: optionalDecimal(row.buyPriceUsd, 'buyPriceUsd', errors),
      buyPriceEur: optionalDecimal(row.buyPriceEur, 'buyPriceEur', errors),
      sellPriceTry: decimalValue(row.sellPriceTry || row.sellPrice || row.salePrice, 'sellPriceTry', errors),
      sellPriceUsd: optionalDecimal(row.sellPriceUsd, 'sellPriceUsd', errors),
      sellPriceEur: optionalDecimal(row.sellPriceEur, 'sellPriceEur', errors),
      quantity: decimalValue(row.quantity, 'quantity', errors),
      active: boolValue(row.active),
    };
    if (!stockCode) errors.push('stockCode zorunlu.');
    if (!barcode) errors.push('barcode zorunlu.');
    if (!text(row.brand)) errors.push('brand zorunlu.');
    if (!text(row.typeName)) errors.push('typeName zorunlu.');
    markSeen(seenStockCode, stockCode, rowNumber, 'stockCode', errors);
    markSeen(seenBarcode, barcode, rowNumber, 'barcode', errors);

    const stockMatch = stockCode ? byStockCode.get(key(stockCode)) : undefined;
    const barcodeMatch = barcode ? byBarcode.get(key(barcode)) : undefined;
    if (stockMatch && barcodeMatch && stockMatch.id !== barcodeMatch.id) {
      errors.push('stockCode ve barcode farkli urunlere ait.');
    }
    const existing = stockMatch ?? barcodeMatch;
    const duplicate = Boolean(existing);
    const action = decideAction(mode, duplicate, errors);
    if (mode === 'createOnly' && duplicate) errors.push('Urun zaten var.');
    if (mode === 'updateOnly' && !duplicate) errors.push('Guncellenecek urun bulunamadi.');
    return buildPreviewRow(rowNumber, data, action, errors, warnings, duplicate, existing?.id);
  });
}

async function previewParties(kind: 'customers' | 'suppliers', parsed: ParsedImport, mode: ImportMode): Promise<PreviewRow[]> {
  const existing = kind === 'customers'
    ? await prisma.customer.findMany({ select: { id: true, name: true } })
    : await prisma.supplier.findMany({ select: { id: true, name: true } });
  const byName = new Map(existing.map((item) => [key(item.name), item]));
  const seenName = new Map<string, number>();

  return parsed.rows.map((row, index) => {
    const rowNumber = index + 2;
    const name = text(row.name);
    const errors: string[] = [];
    const warnings: string[] = [...(parsed.rowWarnings[rowNumber] ?? [])];
    const data: Record<string, unknown> = {
      name,
      phone: text(row.phone) || null,
      defaultCurrency: currencyValue(row.defaultCurrency, warnings),
      balance: decimalValue(row.balanceTry || row.balance, 'balanceTry', errors),
      balanceTry: decimalValue(row.balanceTry || row.balance, 'balanceTry', errors),
      balanceUsd: decimalValue(row.balanceUsd, 'balanceUsd', errors),
      balanceEur: decimalValue(row.balanceEur, 'balanceEur', errors),
      active: boolValue(row.active),
    };
    if (!name) errors.push('name zorunlu.');
    markSeen(seenName, name, rowNumber, 'name', errors);
    const match = name ? byName.get(key(name)) : undefined;
    const duplicate = Boolean(match);
    const action = decideAction(mode, duplicate, errors);
    if (mode === 'createOnly' && duplicate) errors.push('Kayit zaten var.');
    if (mode === 'updateOnly' && !duplicate) errors.push('Guncellenecek kayit bulunamadi.');
    return buildPreviewRow(rowNumber, data, action, errors, warnings, duplicate, match?.id);
  });
}

async function previewPrices(parsed: ParsedImport): Promise<PreviewRow[]> {
  const products = await prisma.product.findMany({ select: { id: true, stockCode: true, barcode: true } });
  const byStockCode = new Map(products.map((item) => [key(item.stockCode), item]));
  const byBarcode = new Map(products.map((item) => [key(item.barcode), item]));
  const seenStockCode = new Map<string, number>();
  const seenBarcode = new Map<string, number>();

  return parsed.rows.map((row, index) => {
    const rowNumber = index + 2;
    const stockCode = text(row.stockCode);
    const barcode = text(row.barcode);
    const errors: string[] = [];
    const warnings: string[] = [...(parsed.rowWarnings[rowNumber] ?? [])];
    const data: Record<string, unknown> = {
      stockCode,
      barcode,
    };
    const currency = strictCurrencyValue(row.currency, errors);
    if (currency) data.currency = currency;
    assignOptionalPrice(data, 'purchasePrice', row.purchasePrice, errors);
    assignOptionalPrice(data, 'salePrice', row.salePrice, errors);
    assignOptionalPrice(data, 'buyPriceTry', row.buyPriceTry, errors);
    assignOptionalPrice(data, 'buyPriceUsd', row.buyPriceUsd, errors);
    assignOptionalPrice(data, 'buyPriceEur', row.buyPriceEur, errors);
    assignOptionalPrice(data, 'sellPriceTry', row.sellPriceTry, errors);
    assignOptionalPrice(data, 'sellPriceUsd', row.sellPriceUsd, errors);
    assignOptionalPrice(data, 'sellPriceEur', row.sellPriceEur, errors);
    if (data.purchasePrice != null) data.buyPrice = data.purchasePrice;
    if (data.salePrice != null) data.sellPrice = data.salePrice;
    if (data.buyPriceTry != null && data.buyPrice == null) data.buyPrice = data.buyPriceTry;
    if (data.sellPriceTry != null && data.sellPrice == null) data.sellPrice = data.sellPriceTry;

    if (!stockCode && !barcode) errors.push('stockCode veya barcode zorunlu.');
    markSeen(seenStockCode, stockCode, rowNumber, 'stockCode', errors);
    markSeen(seenBarcode, barcode, rowNumber, 'barcode', errors);
    const priceFieldCount = ['purchasePrice', 'salePrice', 'buyPriceTry', 'buyPriceUsd', 'buyPriceEur', 'sellPriceTry', 'sellPriceUsd', 'sellPriceEur'].filter((field) => data[field] != null).length;
    if (priceFieldCount === 0) errors.push('Guncellenecek fiyat alani yok.');

    const stockMatch = stockCode ? byStockCode.get(key(stockCode)) : undefined;
    const barcodeMatch = barcode ? byBarcode.get(key(barcode)) : undefined;
    if (stockMatch && barcodeMatch && stockMatch.id !== barcodeMatch.id) {
      errors.push('stockCode ve barcode farkli urunlere ait.');
    }
    const existing = stockMatch ?? barcodeMatch;
    if (!existing) errors.push('Urun bulunamadi.');
    const updateData = Object.fromEntries(Object.entries(data).filter(([field]) => !['stockCode', 'barcode'].includes(field)));
    return buildPreviewRow(rowNumber, { stockCode, barcode, ...updateData }, 'update', errors, warnings, false, existing?.id);
  });
}

async function previewStock(parsed: ParsedImport): Promise<PreviewRow[]> {
  const products = await prisma.product.findMany({ select: { id: true, stockCode: true, barcode: true, quantity: true } });
  const byStockCode = new Map(products.map((item) => [key(item.stockCode), item]));
  const byBarcode = new Map(products.map((item) => [key(item.barcode), item]));
  const seenStockCode = new Map<string, number>();
  const seenBarcode = new Map<string, number>();

  return parsed.rows.map((row, index) => {
    const rowNumber = index + 2;
    const stockCode = text(row.stockCode);
    const barcode = text(row.barcode);
    const errors: string[] = [];
    const warnings: string[] = [...(parsed.rowWarnings[rowNumber] ?? [])];
    const quantity = decimalValue(row.quantity, 'quantity', errors);
    const mode = stockModeValue(row.mode, errors);
    if (!stockCode && !barcode) errors.push('stockCode veya barcode zorunlu.');
    markSeen(seenStockCode, stockCode, rowNumber, 'stockCode', errors);
    markSeen(seenBarcode, barcode, rowNumber, 'barcode', errors);

    const stockMatch = stockCode ? byStockCode.get(key(stockCode)) : undefined;
    const barcodeMatch = barcode ? byBarcode.get(key(barcode)) : undefined;
    if (stockMatch && barcodeMatch && stockMatch.id !== barcodeMatch.id) {
      errors.push('stockCode ve barcode farkli urunlere ait.');
    }
    const existing = stockMatch ?? barcodeMatch;
    if (!existing) errors.push('Urun bulunamadi.');

    const previousStock = Number(existing?.quantity ?? 0);
    const newStock = mode === 'SET'
      ? quantity
      : mode === 'ADD'
        ? previousStock + quantity
        : previousStock - quantity;
    const difference = newStock - previousStock;
    if (mode === 'SUBTRACT' && newStock < 0) errors.push('SUBTRACT sonucu stok eksiye dusemez.');
    if (mode === 'SET' && newStock < 0) errors.push('SET sonucu stok negatif olamaz.');

    return buildPreviewRow(rowNumber, {
      stockCode,
      barcode,
      productId: existing?.id,
      quantity,
      mode,
      note: text(row.note),
      previousStock,
      newStock,
      difference,
    }, 'update', errors, warnings, false, existing?.id);
  });
}

async function applyImport(kind: ImportKind, rows: PreviewRow[], userId?: number, importJobId?: number) {
  const summary = summarize(rows);
  let appliedCreate = 0;
  let appliedUpdate = 0;
  const appliedBy = userId && userId > 0 ? userId : null;
  try {
    for (const row of rows) {
      if (!row.valid || row.action === 'skip') continue;
      let entityId = row.existingId;
      if (kind === 'products') {
        if (row.action === 'create') entityId = (await prisma.product.create({ data: row.data as any })).id;
        if (row.action === 'update' && row.existingId) entityId = (await prisma.product.update({ where: { id: row.existingId }, data: row.data as any })).id;
      } else if (kind === 'prices') {
        if (row.existingId) entityId = (await prisma.product.update({ where: { id: row.existingId }, data: priceUpdateData(row.data) as any })).id;
      } else if (kind === 'stock') {
        if (row.existingId) await applyStockAdjustment(row);
      } else if (kind === 'customers') {
        if (row.action === 'create') entityId = (await prisma.customer.create({ data: row.data as any })).id;
        if (row.action === 'update' && row.existingId) entityId = (await prisma.customer.update({ where: { id: row.existingId }, data: row.data as any })).id;
      } else {
        if (row.action === 'create') entityId = (await prisma.supplier.create({ data: row.data as any })).id;
        if (row.action === 'update' && row.existingId) entityId = (await prisma.supplier.update({ where: { id: row.existingId }, data: row.data as any })).id;
      }
      if (importJobId && entityId) {
        await prisma.importJobRow.updateMany({
          where: { importJobId, rowNumber: row.rowNumber },
          data: { entityId },
        });
      }
      if (row.action === 'create') appliedCreate += 1;
      if (row.action === 'update') appliedUpdate += 1;
    }
  } catch (error) {
    if (importJobId) {
      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: 'FAILED',
          appliedBy,
          appliedAt: new Date(),
        },
      });
    }
    throw error;
  }
  if (importJobId) {
    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'APPLIED',
        createdCount: appliedCreate,
        updatedCount: appliedUpdate,
        skippedCount: summary.skipped,
        appliedBy,
        appliedAt: new Date(),
      },
    });
  }
  const action = kind === 'products' ? 'PRODUCT_IMPORT_APPLIED' : kind === 'customers' ? 'CUSTOMER_IMPORT_APPLIED' : kind === 'suppliers' ? 'SUPPLIER_IMPORT_APPLIED' : kind === 'prices' ? 'PRICE_IMPORT_APPLIED' : 'STOCK_IMPORT_APPLIED';
  await writeAuditLog(prisma, {
    action,
    entityType: 'import',
    entityId: importJobId ?? 0,
    userId,
    detailsJson: { importJobId, kind, created: appliedCreate, updated: appliedUpdate, skipped: summary.skipped, duplicate: summary.duplicate, failed: summary.error },
  });
  return { ...summary, created: appliedCreate, updated: appliedUpdate };
}

async function applyStockAdjustment(row: PreviewRow) {
  const productId = row.existingId;
  if (!productId) return;
  const data = row.data as { newStock: number; difference: number; note?: string; mode?: string };
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: productId },
      data: { quantity: data.newStock },
      select: { quantity: true, averageCostTry: true },
    });
    const difference = Number(data.difference ?? 0);
    await tx.stockMovement.create({
      data: {
        productId,
        movementType: difference >= 0 ? 'ADJUSTMENT_IN' as any : 'ADJUSTMENT_OUT' as any,
        quantity: Math.abs(difference),
        unitCostTry: product.averageCostTry,
        valueChangeTry: Number(product.averageCostTry) * difference,
        stockAfter: product.quantity,
        averageCostAfterTry: product.averageCostTry,
        sourceDocumentType: 'stock_import',
        sourceDocumentId: 0,
        note: data.note || `Stok import ${data.mode ?? ''}`.trim(),
      },
    });
  });
}

async function createImportJob(kind: ImportKind, mode: ImportMode, fileName: string | undefined, summary: ReturnType<typeof summarize>, rows: PreviewRow[], userId?: number) {
  const appliedBy = userId && userId > 0 ? userId : null;
  const job = await prisma.importJob.create({
    data: {
      kind: jobKind(kind),
      mode,
      fileName: fileName ?? null,
      status: 'PREVIEWED',
      totalRows: summary.total,
      validRows: summary.valid,
      warningRows: summary.warning,
      errorRows: summary.error,
      duplicateRows: summary.duplicate,
      createdCount: summary.created,
      updatedCount: summary.updated,
      skippedCount: summary.skipped,
      appliedBy,
      rows: {
        create: rows.map((row) => ({
          rowNumber: row.rowNumber,
          status: row.status,
          action: row.action,
          errorJson: row.error as any,
          warningJson: row.warning as any,
          rawJson: row.data as any,
          entityId: row.existingId ?? null,
        })),
      },
    },
    select: { id: true },
  });
  return job.id;
}

async function loadImportJobPreview(importJobId: number, kind: ImportKind): Promise<ImportPreview> {
  const job = await prisma.importJob.findUnique({
    where: { id: importJobId },
    include: { rows: { orderBy: { rowNumber: 'asc' } } },
  });
  if (!job) throw new Error('Import job bulunamadi.');
  if (job.kind !== jobKind(kind)) throw new Error('Import job tipi endpoint ile uyusmuyor.');
  if (job.status === 'APPLIED') throw new Error('Bu import job daha once uygulanmis.');
  const rows: PreviewRow[] = job.rows.map((row) => {
    const errors = Array.isArray(row.errorJson) ? row.errorJson.map(String) : [];
    const warnings = Array.isArray(row.warningJson) ? row.warningJson.map(String) : [];
    const action = row.action === 'create' || row.action === 'update' || row.action === 'skip' ? row.action : 'skip';
    return {
      rowNumber: row.rowNumber,
      status: row.status === 'valid' || row.status === 'warning' || row.status === 'error' || row.status === 'duplicate' ? row.status : 'error',
      valid: errors.length === 0 && action !== 'skip',
      warning: warnings,
      error: errors,
      duplicate: row.status === 'duplicate',
      action,
      data: typeof row.rawJson === 'object' && row.rawJson ? row.rawJson as Record<string, unknown> : {},
      existingId: row.entityId ?? undefined,
    };
  });
  return {
    ok: true,
    kind,
    mode: job.mode as ImportMode,
    fileName: job.fileName ?? undefined,
    importJobId: job.id,
    headers: [],
    summary: summarize(rows),
    rows,
  };
}

function jobKind(kind: ImportKind) {
  return kind === 'products' ? 'PRODUCTS' : kind === 'customers' ? 'CUSTOMERS' : kind === 'suppliers' ? 'SUPPLIERS' : kind === 'prices' ? 'PRICES' : 'STOCK';
}

function importPermission(kind: ImportKind) {
  if (kind === 'prices') return 'priceUpdate';
  if (kind === 'stock') return 'stockAdjust';
  return 'importApply';
}

function jobMode(kind: ImportKind, mode: ImportMode): ImportMode {
  return kind === 'stock' ? 'stockAdjustment' : entityImportMode(mode);
}

function entityImportMode(mode: ImportMode): 'createOnly' | 'updateOnly' | 'upsert' {
  return mode === 'createOnly' || mode === 'updateOnly' ? mode : 'upsert';
}

function decideAction(mode: ImportMode, duplicate: boolean, errors: string[]): ImportAction {
  if (errors.length > 0) return 'skip';
  if (mode === 'createOnly') return duplicate ? 'skip' : 'create';
  if (mode === 'updateOnly') return duplicate ? 'update' : 'skip';
  return duplicate ? 'update' : 'create';
}

function buildPreviewRow(rowNumber: number, data: Record<string, unknown>, action: ImportAction, errors: string[], warnings: string[], duplicate: boolean, existingId?: number): PreviewRow {
  const valid = errors.length === 0 && action !== 'skip';
  const status: ImportStatus = errors.length > 0 ? 'error' : duplicate ? 'duplicate' : warnings.length > 0 ? 'warning' : 'valid';
  return { rowNumber, status, valid, warning: warnings, error: errors, duplicate, action: valid ? action : 'skip', data, existingId };
}

function summarize(rows: PreviewRow[]) {
  return rows.reduce((acc, row) => ({
    total: acc.total + 1,
    valid: acc.valid + (row.valid ? 1 : 0),
    warning: acc.warning + (row.warning.length > 0 ? 1 : 0),
    error: acc.error + (row.error.length > 0 ? 1 : 0),
    duplicate: acc.duplicate + (row.duplicate ? 1 : 0),
    created: acc.created + (row.action === 'create' && row.valid ? 1 : 0),
    updated: acc.updated + (row.action === 'update' && row.valid ? 1 : 0),
    skipped: acc.skipped + (!row.valid || row.action === 'skip' ? 1 : 0),
  }), { total: 0, valid: 0, warning: 0, error: 0, duplicate: 0, created: 0, updated: 0, skipped: 0 });
}

function parseImportContent(content: string, fileName?: string): ParsedImport {
  if (fileName && /\.xlsx$/i.test(fileName)) return parseXlsx(content);
  return parseCsv(content);
}

function createXlsxTemplate(kind: ImportKind) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(templateRows[kind]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function parseXlsx(fileBase64: string): ParsedImport {
  const buffer = Buffer.from(fileBase64, 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: false, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel sayfasi bulunamadi.');
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  const headers: string[] = [];
  const rows: Array<Record<string, string>> = [];
  const rowWarnings: Record<number, string[]> = {};
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    headers.push(formatCell(sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })]).replace(/^\uFEFF/, '').trim());
  }
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const header = headers[col - range.s.c];
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      const cell = sheet[cellAddress];
      const value = formatCell(cell);
      if (value.trim()) hasValue = true;
      row[header] = value.trim();
      if (['barcode', 'stockCode'].includes(header) && cell && cell.t === 'n') {
        const warning = `${header} Excel tarafindan sayi olarak okunmus; bastaki sifir veya bilimsel gosterim kontrol edin.`;
        const excelRowNumber = rowIndex + 1;
        rowWarnings[excelRowNumber] = [...(rowWarnings[excelRowNumber] ?? []), warning];
      }
      if (['barcode', 'stockCode'].includes(header) && /e\+/i.test(value)) {
        const excelRowNumber = rowIndex + 1;
        rowWarnings[excelRowNumber] = [...(rowWarnings[excelRowNumber] ?? []), `${header} bilimsel gosterim gibi gorunuyor; degeri metin olarak kontrol edin.`];
      }
    }
    if (hasValue) rows.push(row);
  }
  return { headers, rows, rowWarnings };
}

function formatCell(cell: XLSX.CellObject | undefined) {
  if (!cell) return '';
  if (cell.w != null) return String(cell.w);
  if (cell.v == null) return '';
  return String(cell.v);
}

function parseCsv(input: string): ParsedImport {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (rows.length === 0) throw new Error('CSV satiri bulunamadi.');
  const headers = rows[0].map((cell) => cell.replace(/^\uFEFF/, '').trim());
  const dataRows = rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, String(cells[index] ?? '').trim()])));
  return { headers, rows: dataRows, rowWarnings: {} };
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function key(value: unknown) {
  return text(value).toLocaleLowerCase('tr-TR');
}

function currencyValue(value: unknown, warnings: string[]): Currency {
  const currency = text(value).toUpperCase();
  if (!currency) return 'TRY';
  if (currencies.includes(currency as Currency)) return currency as Currency;
  warnings.push(`Gecersiz para birimi '${currency}', TRY kullanildi.`);
  return 'TRY';
}

function strictCurrencyValue(value: unknown, errors: string[]): Currency | null {
  const currency = text(value).toUpperCase();
  if (!currency) {
    errors.push('currency zorunlu.');
    return null;
  }
  if (currencies.includes(currency as Currency)) return currency as Currency;
  errors.push(`currency TRY/USD/EUR disinda olamaz: ${currency}`);
  return null;
}

function stockModeValue(value: unknown, errors: string[]) {
  const mode = text(value).toUpperCase();
  if (mode === 'SET' || mode === 'ADD' || mode === 'SUBTRACT') return mode;
  errors.push('mode SET/ADD/SUBTRACT olmalidir.');
  return 'SET';
}

function decimalValue(value: unknown, field: string, errors: string[]) {
  const raw = text(value).replace(',', '.');
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} sayisal degil.`);
    return 0;
  }
  if (parsed < 0) errors.push(`${field} negatif olamaz.`);
  return parsed;
}

function optionalDecimal(value: unknown, field: string, errors: string[]) {
  return text(value) ? decimalValue(value, field, errors) : null;
}

function assignOptionalPrice(target: Record<string, unknown>, field: string, value: unknown, errors: string[]) {
  if (!text(value)) return;
  target[field] = decimalValue(value, field, errors);
}

function priceUpdateData(data: Record<string, unknown>) {
  const allowed = new Set(['currency', 'purchasePrice', 'salePrice', 'buyPrice', 'sellPrice', 'buyPriceTry', 'buyPriceUsd', 'buyPriceEur', 'sellPriceTry', 'sellPriceUsd', 'sellPriceEur']);
  return Object.fromEntries(Object.entries(data).filter(([field]) => allowed.has(field)));
}

function boolValue(value: unknown) {
  const raw = key(value);
  if (!raw) return true;
  return ['1', 'true', 'evet', 'yes', 'aktif'].includes(raw);
}

function markSeen(seen: Map<string, number>, value: string, rowNumber: number, field: string, errors: string[]) {
  if (!value) return;
  const normalized = key(value);
  const first = seen.get(normalized);
  if (first) errors.push(`${field} dosya icinde tekrar ediyor. Ilk satir: ${first}`);
  else seen.set(normalized, rowNumber);
}

function csvEscape(value: unknown) {
  const textValue = String(value ?? '');
  if (/[",\n\r]/.test(textValue)) return `"${textValue.replace(/"/g, '""')}"`;
  return textValue;
}

export default router;
