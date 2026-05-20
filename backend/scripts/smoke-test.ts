import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

type Product = {
  id: number;
  stockCode: string;
  barcode: string;
  quantity: string | number;
  currency?: 'TRY' | 'USD' | 'EUR';
  purchasePrice?: string | number;
  salePrice?: string | number;
  buyPrice: string | number;
  sellPrice: string | number;
  buyPriceTry?: string | number;
  buyPriceUsd?: string | number | null;
  buyPriceEur?: string | number | null;
  sellPriceTry?: string | number;
  sellPriceUsd?: string | number | null;
  sellPriceEur?: string | number | null;
  averageCostTry?: string | number;
};

type Customer = {
  id: number;
  name: string;
  balance: string | number;
  balanceTry: string | number;
  balanceUsd: string | number;
  balanceEur: string | number;
  defaultCurrency: 'TRY' | 'USD' | 'EUR';
};

type Supplier = {
  id: number;
  name: string;
  balance: string | number;
  balanceTry: string | number;
  balanceUsd: string | number;
  balanceEur: string | number;
  defaultCurrency: 'TRY' | 'USD' | 'EUR';
};

type Receipt = {
  id: number;
  documentNo: string;
  status?: 'ACTIVE' | 'CANCELLED';
  cancelled?: boolean;
  totalAmount: string | number;
  totalAmountTry?: string | number;
  documentCurrency?: 'TRY' | 'USD' | 'EUR';
  originalTotal?: string | number;
  totalTry?: string | number;
  usdToTry: string | number;
  items?: ReceiptItem[];
};

type ReceiptItem = {
  id: number;
  productId: number;
  quantity: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  lineCurrency?: 'TRY' | 'USD' | 'EUR';
  unitPriceOriginal?: string | number;
  lineTotalOriginal?: string | number;
  unitPriceTry?: string | number;
  lineTotalTry?: string | number;
  unitCostTry?: string | number;
  totalCostTry?: string | number;
  grossProfitTry?: string | number;
  profitMargin?: string | number;
};

type StockMovement = {
  id: number;
  productId: number;
  movementType: string;
  quantity: string | number;
  note?: string | null;
  unitCostTry?: string | number | null;
  valueChangeTry?: string | number | null;
  stockAfter?: string | number | null;
  averageCostAfterTry?: string | number | null;
  sourceDocumentType: string;
  sourceDocumentId: number;
};

type StockValuationRow = {
  productId: number;
  productCode: string;
  currency: 'TRY' | 'USD' | 'EUR';
  stockQuantity: number;
  purchasePrice: number;
  averageCostTry: number;
  stockValueTry: number;
  salePrice: number;
  salePriceTry: number;
  potentialSaleValueTry: number;
  potentialGrossProfitTry: number;
  profitMargin: number;
  lowStock: boolean;
};

type StockValuationSummary = {
  totalProductCount: number;
  totalStockQuantity: number;
  totalStockValueTry: number;
  totalPotentialSaleValueTry: number;
  totalPotentialGrossProfitTry: number;
  lowStockCount: number;
};

type ProfitCostStatus = 'ok' | 'missing';

type ProductProfitReport = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  salesAmountTry: number;
  costTry: number;
  grossProfitTry: number;
  profitMargin: number;
  costStatus: ProfitCostStatus;
};

type SalesProfitReport = {
  receiptId: number;
  documentNo: string;
  customerName: string;
  documentCurrency: 'TRY' | 'USD' | 'EUR';
  originalTotal: number;
  totalTry: number;
  createdAt: string;
  quantity: number;
  salesAmountTry: number;
  costTry: number;
  grossProfitTry: number;
  profitMargin: number;
  costStatus: ProfitCostStatus;
};

type SalesReceiptProfitDetail = Omit<SalesProfitReport, 'quantity'> & {
  items: Array<{
    itemId: number;
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    lineCurrency: 'TRY' | 'USD' | 'EUR';
    lineTotalOriginal: number;
    lineTotalTry: number;
    unitCostTry: number;
    totalCostTry: number;
    grossProfitTry: number;
    profitMargin: number;
    costStatus: ProfitCostStatus;
  }>;
};

type ImportSummary = {
  total: number;
  valid: number;
  warning: number;
  error: number;
  duplicate: number;
  created: number;
  updated: number;
  skipped: number;
};

type ImportPreviewResponse = {
  ok: boolean;
  importJobId?: number;
  summary: ImportSummary;
  rows: Array<{ rowNumber: number; valid: boolean; duplicate: boolean; action: 'create' | 'update' | 'skip'; status: string; error: string[]; data?: Record<string, unknown> }>;
};

type ImportJob = {
  id: number;
  kind: string;
  mode: string;
  fileName?: string | null;
  status: 'PREVIEWED' | 'APPLIED' | 'FAILED';
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  rows?: Array<{ rowNumber: number; status: string; action: string; errorJson?: string[]; rawJson?: Record<string, unknown> | null; entityId?: number | null }>;
};

type RecentSaleReport = {
  receiptNo: string;
  documentCurrency?: 'TRY' | 'USD' | 'EUR';
  originalTotal?: number;
  totalTry?: number;
};

type CurrentAccountMovement = {
  id: number;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: number | null;
  documentType: 'SALES_RECEIPT' | 'PURCHASE_RECEIPT' | 'PAYMENT' | 'COLLECTION' | 'CANCEL';
  documentNo: string;
  direction: 'DEBIT' | 'CREDIT';
  currency: 'TRY' | 'USD' | 'EUR';
  amount: string | number;
  paymentMethod?: 'CASH' | 'BANK' | 'CARD' | 'OTHER' | null;
  accountCurrency?: 'TRY' | 'USD' | 'EUR';
  accountAmount?: string | number;
  documentCurrency?: 'TRY' | 'USD' | 'EUR';
  documentAmount?: string | number;
};

type SystemStatus = {
  databaseConnected: boolean;
  activeUser?: { username: string; role: string };
  roleRules?: Record<string, string[]>;
  recentAuditLogs: Array<{ action: string; entityType: string; entityId: number }>;
};

type AppUser = {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTING' | 'VIEWER' | 'STAFF';
  active: boolean;
  passwordHash?: string;
};

type SmokeResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const runId = Date.now().toString().slice(-8);
const results: SmokeResult[] = [];
let adminToken = '';
let staffToken = '';
let managerToken = '';
let createdUser: AppUser | null = null;
let inactiveUser: AppUser | null = null;

async function request<T>(path: string, init?: RequestInit, token = adminToken): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : 'bilinmeyen baglanti hatasi';
    throw new Error(`API'ye ulasilamadi: ${url}. Backend calisiyor mu, API_BASE_URL dogru mu? Detay: ${cause}`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message ?? `API hata dondu: ${response.status} ${response.statusText} (${url})`);
  }
  return body as T;
}

async function requestText(path: string, token = adminToken): Promise<string> {
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API hata dondu: ${response.status} ${response.statusText} (${url})`);
  }
  return response.text();
}

async function record(name: string, task: () => Promise<string>) {
  try {
    const detail = await task();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : 'Unknown error' });
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function asNumber(value: string | number) {
  return Number(value);
}

function assertClose(actual: string | number | null | undefined, expected: number, tolerance: number, message: string) {
  const numeric = Number(actual);
  if (!Number.isFinite(numeric) || Math.abs(numeric - expected) > tolerance) {
    throw new Error(`${message}: beklenen=${expected}, gelen=${actual}`);
  }
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} hazir degil.`);
  return value;
}

function xlsxBase64(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
  return (XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer).toString('base64');
}

async function main() {
  let product: Product;
  let lowStockProduct: Product;
  let customer: Customer;
  let usdCustomer: Customer;
  let eurCustomer: Customer;
  let supplier: Supplier;
  let usdSupplier: Supplier;
  let eurSupplier: Supplier;
  let frozenReceiptId: number | null = null;
  let frozenUsdToTry = 0;
  let frozenTotalAmount = 0;
  let cancelSalesReceiptId: number | null = null;
  let cancelPurchaseReceiptId: number | null = null;
  let costSalesReceiptId: number | null = null;
  let expectedAverageCostTry = 0;
  let fxUsdTryProductId: number | null = null;
  let fxUsdTrySaleDocumentNo = '';

  await record('admin login token aliyor mu?', async () => {
    const response = await request<{ token: string; user: { role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: process.env.SMOKE_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'admin123' }),
    }, '');
    adminToken = response.token;
    assert(response.user.role === 'ADMIN' && Boolean(adminToken), 'Admin login basarisiz.');
    return `role=${response.user.role}`;
  });

  await record('staff login token aliyor mu?', async () => {
    const response = await request<{ token: string; user: { role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'staff', password: process.env.SMOKE_STAFF_PASSWORD ?? process.env.STAFF_PASSWORD ?? 'staff123' }),
    }, '');
    staffToken = response.token;
    assert(response.user.role === 'STAFF' && Boolean(staffToken), 'Staff login basarisiz.');
    return `role=${response.user.role}`;
  });

  await record('admin kullanici olusturabiliyor mu?', async () => {
    const username = `smoke_user_${runId}`;
    createdUser = await request<AppUser>('/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Smoke Kullanici', username, role: 'MANAGER', password: `TempPass-${runId}`, active: true }),
    });
    assert(createdUser.username === username && createdUser.role === 'MANAGER', 'Kullanici beklenen bilgilerle olusmadi.');
    assert(!('passwordHash' in createdUser), 'passwordHash response icinde dondu.');
    const login = await request<{ token: string; user: { role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: `TempPass-${runId}` }),
    }, '');
    managerToken = login.token;
    assert(login.user.role === 'MANAGER' && Boolean(managerToken), 'Yeni manager login olamadi.');
    return `user=${createdUser.id}, role=${createdUser.role}`;
  });

  await record('manager kullanici olusturamaz 403 mu?', async () => {
    try {
      await request<AppUser>('/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Manager Deneme', username: `manager_deneme_${runId}`, role: 'STAFF', password: `TempPass-${runId}`, active: true }),
      }, managerToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yetki hatasi';
      assert(message.includes('yetkiniz yok'), `Beklenen 403 yetki mesaji degil: ${message}`);
      return message;
    }
    throw new Error('Manager kullanici olusturabildi.');
  });

  await record('staff kullanici olusturamaz 403 mu?', async () => {
    try {
      await request<AppUser>('/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Staff Deneme', username: `staff_deneme_${runId}`, role: 'STAFF', password: `TempPass-${runId}`, active: true }),
      }, staffToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yetki hatasi';
      assert(message.includes('yetkiniz yok'), `Beklenen 403 yetki mesaji degil: ${message}`);
      return message;
    }
    throw new Error('Staff kullanici olusturabildi.');
  });

  await record('password hash response icinde donmuyor mu?', async () => {
    const users = await request<AppUser[]>('/users');
    assert(users.every((user) => !('passwordHash' in user)), 'Liste response icinde passwordHash var.');
    return `${users.length} kullanici temiz dondu`;
  });

  await record('pasif kullanici login olamiyor mu?', async () => {
    inactiveUser = await request<AppUser>('/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Smoke Pasif', username: `smoke_inactive_${runId}`, role: 'STAFF', password: `Inactive-${runId}`, active: true }),
    });
    await request<AppUser>(`/users/${inactiveUser.id}/deactivate`, { method: 'PATCH' });
    try {
      await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: inactiveUser.username, password: `Inactive-${runId}` }),
      }, '');
    } catch (error) {
      return error instanceof Error ? error.message : 'Pasif login engellendi';
    }
    throw new Error('Pasif kullanici login olabildi.');
  });

  await record('sifre reset sonrasi yeni sifreyle login oluyor mu?', async () => {
    const user = requireValue(createdUser ?? undefined, 'Reset kullanicisi');
    const newPassword = `ResetPass-${runId}`;
    const updated = await request<AppUser>(`/users/${user.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: newPassword }) });
    assert(!('passwordHash' in updated), 'Reset response icinde passwordHash var.');
    const login = await request<{ token: string; user: { username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: user.username, password: newPassword }),
    }, '');
    assert(Boolean(login.token) && login.user.username === user.username, 'Reset sonrasi login basarisiz.');
    return `user=${user.username}`;
  });

  await record('yeni rol matrisi endpointi calisiyor mu?', async () => {
    const matrix = await request<{ permissionGroups: Record<string, string>; rolePermissions: Record<string, string[]> }>('/users/permissions/matrix');
    assert(matrix.rolePermissions.SALES?.includes('salesCreate'), 'SALES satis olusturma yetkisi almadi.');
    assert(matrix.rolePermissions.WAREHOUSE?.includes('stockAdjust'), 'WAREHOUSE stok duzeltme yetkisi almadi.');
    assert(matrix.rolePermissions.ACCOUNTING?.includes('cashMovement'), 'ACCOUNTING odeme/tahsilat yetkisi almadi.');
    assert(matrix.rolePermissions.VIEWER?.includes('reportsView'), 'VIEWER rapor goruntuleme yetkisi almadi.');
    assert(!matrix.rolePermissions.VIEWER?.includes('importApply'), 'VIEWER import yetkisi almamali.');
    return `${Object.keys(matrix.rolePermissions).length} rol / ${Object.keys(matrix.permissionGroups).length} yetki`;
  });

  await record('urun listesi cekiliyor mu?', async () => {
    const products = await request<Product[]>('/products');
    assert(Array.isArray(products), 'Products response array degil.');
    return `${products.length} urun geldi`;
  });

  await record('musteri listesi cekiliyor mu?', async () => {
    const customers = await request<Customer[]>('/customers');
    assert(Array.isArray(customers), 'Customers response array degil.');
    return `${customers.length} musteri geldi`;
  });

  await record('tedarikci listesi cekiliyor mu?', async () => {
    const suppliers = await request<Supplier[]>('/suppliers');
    assert(Array.isArray(suppliers), 'Suppliers response array degil.');
    return `${suppliers.length} tedarikci geldi`;
  });

  await record('CSV import sablonlari indiriliyor mu?', async () => {
    const [productTemplate, customerTemplate, supplierTemplate, priceTemplate, stockTemplate, productXlsx, priceXlsx, stockXlsx] = await Promise.all([
      requestText('/import/templates/products'),
      requestText('/import/templates/customers'),
      requestText('/import/templates/suppliers'),
      requestText('/import/templates/prices'),
      requestText('/import/templates/stock'),
      requestText('/import/templates/products.xlsx'),
      requestText('/import/templates/prices.xlsx'),
      requestText('/import/templates/stock.xlsx'),
    ]);
    assert(productTemplate.includes('stockCode,barcode'), 'Urun import sablonu beklenen kolonlari icermiyor.');
    assert(customerTemplate.includes('name,phone'), 'Musteri import sablonu beklenen kolonlari icermiyor.');
    assert(supplierTemplate.includes('name,phone'), 'Tedarikci import sablonu beklenen kolonlari icermiyor.');
    assert(priceTemplate.includes('purchasePrice,salePrice'), 'Fiyat import sablonu beklenen kolonlari icermiyor.');
    assert(stockTemplate.includes('stockCode,barcode,quantity,mode,note'), 'Stok import sablonu beklenen kolonlari icermiyor.');
    assert(productXlsx.length > 0, 'Urun XLSX sablonu bos.');
    assert(priceXlsx.length > 0, 'Fiyat XLSX sablonu bos.');
    assert(stockXlsx.length > 0, 'Stok XLSX sablonu bos.');
    return 'urun/musteri/tedarikci sablonlari OK';
  });

  await record('urun CSV preview create ve hata kontrolu yapiyor mu?', async () => {
    const csv = [
      'stockCode,barcode,brand,typeName,currency,purchasePrice,salePrice,buyPriceTry,sellPriceTry,quantity,active',
      `IMP-P-${runId},IMP-BAR-${runId},Import Marka,Import Urun,TRY,12,20,12,20,3,true`,
      `IMP-BAD-${runId},IMP-BAD-BAR-${runId},Import Marka,Hatali,TRY,-1,20,0,20,1,true`,
    ].join('\n');
    const preview = await request<ImportPreviewResponse>('/import/products/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(preview.summary.total === 2, 'Urun preview satir sayisi yanlis.');
    assert(preview.summary.valid === 1, 'Urun preview gecerli satir sayisi yanlis.');
    assert(preview.summary.error === 1, 'Urun preview negatif fiyat hatasini yakalamadi.');
    return `valid=${preview.summary.valid}, error=${preview.summary.error}`;
  });

  await record('urun CSV apply kayit olusturuyor ve duplicate yakaliyor mu?', async () => {
    const csv = [
      'stockCode,barcode,brand,typeName,currency,purchasePrice,salePrice,buyPriceTry,sellPriceTry,quantity,active',
      `IMP-P-${runId},IMP-BAR-${runId},Import Marka,Import Urun,TRY,12,20,12,20,3,true`,
    ].join('\n');
    const applied = await request<ImportPreviewResponse>('/import/products/apply', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(applied.summary.created === 1, 'Urun import create yapmadi.');
    const duplicatePreview = await request<ImportPreviewResponse>('/import/products/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'upsert' }) });
    assert(duplicatePreview.rows[0]?.duplicate === true && duplicatePreview.rows[0]?.action === 'update', 'Urun duplicate/upsert update gorunmedi.');
    const imported = await request<Product[]>(`/products?search=IMP-P-${runId}`).then((items) => items[0]);
    assert(imported?.barcode === `IMP-BAR-${runId}`, 'Import edilen urun bulunamadi.');
    assert(Number(imported.averageCostTry ?? 0) === 0, 'averageCostTry import tarafindan degistirilmemeli.');
    return `created=${applied.summary.created}, duplicate=${duplicatePreview.summary.duplicate}`;
  });

  await record('musteri CSV preview/apply calisiyor mu?', async () => {
    const csv = [
      'name,phone,defaultCurrency,balanceTry,balanceUsd,balanceEur,active',
      `Import Musteri ${runId},0212${runId},USD,0,5,0,true`,
    ].join('\n');
    const preview = await request<ImportPreviewResponse>('/import/customers/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'create', 'Musteri preview create donmedi.');
    const applied = await request<ImportPreviewResponse>('/import/customers/apply', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(applied.summary.created === 1, 'Musteri import create yapmadi.');
    return `created=${applied.summary.created}`;
  });

  await record('tedarikci CSV preview/apply calisiyor mu?', async () => {
    const csv = [
      'name,phone,defaultCurrency,balanceTry,balanceUsd,balanceEur,active',
      `Import Tedarikci ${runId},0312${runId},EUR,0,0,7,true`,
    ].join('\n');
    const preview = await request<ImportPreviewResponse>('/import/suppliers/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'create', 'Tedarikci preview create donmedi.');
    const applied = await request<ImportPreviewResponse>('/import/suppliers/apply', { method: 'POST', body: JSON.stringify({ csv, mode: 'createOnly' }) });
    assert(applied.summary.created === 1, 'Tedarikci import create yapmadi.');
    return `created=${applied.summary.created}`;
  });

  await record('XLSX urun preview barkodu string koruyor mu?', async () => {
    const fileName = `products-${runId}.xlsx`;
    const fileBase64 = xlsxBase64([
      ['stockCode', 'barcode', 'brand', 'typeName', 'currency', 'purchasePrice', 'salePrice', 'buyPriceTry', 'sellPriceTry', 'quantity', 'active'],
      [`XLS-P-${runId}`, `000${runId}`, 'Excel Marka', 'Excel Urun', 'TRY', 11, 19, 11, 19, 2, true],
      [`XLS-NUM-${runId}`, 1234567890123, 'Excel Marka', 'Sayisal Barkod', 'TRY', 11, 19, 11, 19, 2, true],
    ]);
    const preview = await request<ImportPreviewResponse>('/import/products/preview', { method: 'POST', body: JSON.stringify({ fileName, fileBase64, mode: 'createOnly' }) });
    assert(preview.summary.total === 2, 'XLSX urun preview satir sayisi yanlis.');
    assert(preview.summary.valid === 2, 'XLSX urun preview gecerli satir sayisi yanlis.');
    assert(String(preview.rows[0]?.data?.barcode) === `000${runId}`, 'XLSX barkod string korunmadi.');
    assert(preview.rows[1]?.status === 'warning', 'Sayisal XLSX barkod icin uyari uretilmedi.');
    return `barcode=${preview.rows[0]?.data?.barcode}, warning=${preview.rows[1]?.status}`;
  });

  await record('XLSX musteri preview calisiyor mu?', async () => {
    const fileBase64 = xlsxBase64([
      ['name', 'phone', 'defaultCurrency', 'balanceTry', 'balanceUsd', 'balanceEur', 'active'],
      [`XLSX Musteri ${runId}`, `0500${runId}`, 'USD', 0, 3, 0, true],
    ]);
    const preview = await request<ImportPreviewResponse>('/import/customers/preview', { method: 'POST', body: JSON.stringify({ fileName: `customers-${runId}.xlsx`, fileBase64, mode: 'createOnly' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'create', 'XLSX musteri preview create donmedi.');
    return `valid=${preview.summary.valid}`;
  });

  await record('XLSX tedarikci preview calisiyor mu?', async () => {
    const fileBase64 = xlsxBase64([
      ['name', 'phone', 'defaultCurrency', 'balanceTry', 'balanceUsd', 'balanceEur', 'active'],
      [`XLSX Tedarikci ${runId}`, `0600${runId}`, 'EUR', 0, 0, 4, true],
    ]);
    const preview = await request<ImportPreviewResponse>('/import/suppliers/preview', { method: 'POST', body: JSON.stringify({ fileName: `suppliers-${runId}.xlsx`, fileBase64, mode: 'createOnly' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'create', 'XLSX tedarikci preview create donmedi.');
    return `valid=${preview.summary.valid}`;
  });

  await record('fiyat CSV preview/apply urun fiyatlarini guncelliyor mu?', async () => {
    const before = await request<Product[]>(`/products?search=IMP-P-${runId}`).then((items) => requireValue(items[0], 'Import fiyat urunu'));
    const csv = [
      'stockCode,barcode,currency,purchasePrice,salePrice,buyPriceTry,buyPriceUsd,buyPriceEur,sellPriceTry,sellPriceUsd,sellPriceEur',
      `IMP-P-${runId},IMP-BAR-${runId},USD,13,25,390,4,3.5,750,7,6.5`,
      `IMP-MISSING-${runId},,TRY,1,2,1,,,2,,`,
      `IMP-P-${runId},IMP-BAR-${runId},GBP,1,2,1,,,2,,`,
      `IMP-P-${runId},IMP-BAR-${runId},TRY,-1,2,1,,,2,,`,
    ].join('\n');
    const preview = await request<ImportPreviewResponse>('/import/prices/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'upsert' }) });
    assert(preview.summary.total === 4, 'Fiyat preview satir sayisi yanlis.');
    assert(preview.summary.valid === 1, 'Fiyat preview gecerli satir sayisi yanlis.');
    assert(preview.summary.error === 3, 'Fiyat preview hata sayisi yanlis.');
    const applied = await request<ImportPreviewResponse>('/import/prices/apply', { method: 'POST', body: JSON.stringify({ csv, mode: 'upsert' }) });
    assert(applied.summary.updated === 1, 'Fiyat import update yapmadi.');
    const after = await request<Product[]>(`/products?search=IMP-P-${runId}`).then((items) => requireValue(items[0], 'Guncel fiyat urunu'));
    assert(after.currency === 'USD', `Fiyat import currency guncellemedi: ${after.currency}`);
    assertClose(after.purchasePrice, 13, 0.01, 'purchasePrice guncellenmedi');
    assertClose(after.salePrice, 25, 0.01, 'salePrice guncellenmedi');
    assertClose(after.buyPriceTry, 390, 0.01, 'buyPriceTry guncellenmedi');
    assertClose(after.sellPriceUsd, 7, 0.01, 'sellPriceUsd guncellenmedi');
    assertClose(after.averageCostTry, Number(before.averageCostTry ?? 0), 0.01, 'averageCostTry fiyat importla degismemeli');
    return `updated=${applied.summary.updated}, currency=${after.currency}`;
  });

  await record('fiyat XLSX preview calisiyor mu?', async () => {
    const fileBase64 = xlsxBase64([
      ['stockCode', 'barcode', 'currency', 'purchasePrice', 'salePrice', 'buyPriceTry', 'buyPriceUsd', 'buyPriceEur', 'sellPriceTry', 'sellPriceUsd', 'sellPriceEur'],
      [`IMP-P-${runId}`, `IMP-BAR-${runId}`, 'TRY', 14, 26, 410, 4.1, 3.6, 760, 7.1, 6.6],
    ]);
    const preview = await request<ImportPreviewResponse>('/import/prices/preview', { method: 'POST', body: JSON.stringify({ fileName: `prices-${runId}.xlsx`, fileBase64, mode: 'upsert' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'update', 'XLSX fiyat preview update donmedi.');
    assert(String(preview.rows[0]?.data?.barcode) === `IMP-BAR-${runId}`, 'XLSX fiyat barkod string korunmadi.');
    return `valid=${preview.summary.valid}`;
  });

  await record('stok CSV preview/apply stok hareketi olusturuyor mu?', async () => {
    const before = await request<Product[]>(`/products?search=IMP-P-${runId}`).then((items) => requireValue(items[0], 'Import stok urunu'));
    const beforeAverageCost = Number(before.averageCostTry ?? 0);
    const csv = [
      'stockCode,barcode,quantity,mode,note',
      `IMP-P-${runId},IMP-BAR-${runId},8,SET,Smoke stok sayim`,
      `IMP-P-${runId},IMP-BAR-${runId},999,SUBTRACT,Fazla dusum`,
      `IMP-MISSING-STOCK-${runId},,1,ADD,Bulunmayan urun`,
    ].join('\n');
    const preview = await request<ImportPreviewResponse>('/import/stock/preview', { method: 'POST', body: JSON.stringify({ csv, mode: 'upsert' }) });
    assert(preview.summary.total === 3, 'Stok preview satir sayisi yanlis.');
    assert(preview.summary.valid === 1, 'Stok preview gecerli satir sayisi yanlis.');
    assert(preview.summary.error === 2, 'Stok preview hata sayisi yanlis.');
    assert(Number(preview.rows[0]?.data?.previousStock ?? -1) === Number(before.quantity), 'Stok preview onceki stok yanlis.');
    assert(Number(preview.rows[0]?.data?.newStock ?? -1) === 8, 'Stok preview yeni stok yanlis.');
    assert(preview.importJobId, 'Stok preview importJobId dondurmedi.');
    const applied = await request<ImportPreviewResponse>('/import/stock/apply', { method: 'POST', body: JSON.stringify({ csv, mode: 'stockAdjustment', importJobId: preview.importJobId }) });
    assert(applied.summary.updated === 1, 'Stok import update yapmadi.');
    const after = await request<Product[]>(`/products?search=IMP-P-${runId}`).then((items) => requireValue(items[0], 'Guncel stok urunu'));
    assertClose(after.quantity, 8, 0.01, 'Stok import quantity guncellemedi');
    assertClose(after.averageCostTry, beforeAverageCost, 0.01, 'averageCostTry stok importla degismemeli');
    const movements = await request<StockMovement[]>(`/stock-movements?productId=${after.id}&sourceDocumentType=stock_import`);
    const movement = requireValue(movements.find((item) => item.note === 'Smoke stok sayim'), 'Stok import hareketi');
    assert(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(movement.movementType), `Beklenen ADJUSTMENT hareketi, gelen ${movement.movementType}`);
    assertClose(movement.stockAfter, 8, 0.01, 'Stok hareketi stockAfter yanlis');
    const job = await request<ImportJob>(`/import/jobs/${preview.importJobId}`);
    assert(job.status === 'APPLIED', 'Import job apply sonrasi APPLIED olmadi.');
    assert(job.kind === 'STOCK' && job.mode === 'stockAdjustment', 'Import job stok tipi/modu yanlis.');
    assert(job.totalRows === 3 && job.validRows === 1 && job.errorRows === 2, 'Import job ozet sayilari yanlis.');
    assert((job.rows ?? []).length === 3, 'Import job satir detaylari yazilmadi.');
    const errorsCsv = await requestText(`/import/jobs/${preview.importJobId}/errors.csv`);
    assert(errorsCsv.includes('SUBTRACT sonucu stok eksiye dusemez'), 'Import job hata CSV beklenen hatayi icermiyor.');
    return `updated=${applied.summary.updated}, movement=${movement.movementType}, job=${job.status}`;
  });

  await record('stok XLSX preview calisiyor mu?', async () => {
    const fileBase64 = xlsxBase64([
      ['stockCode', 'barcode', 'quantity', 'mode', 'note'],
      [`IMP-P-${runId}`, `IMP-BAR-${runId}`, 2, 'ADD', 'XLSX stok ekleme'],
    ]);
    const preview = await request<ImportPreviewResponse>('/import/stock/preview', { method: 'POST', body: JSON.stringify({ fileName: `stock-${runId}.xlsx`, fileBase64, mode: 'upsert' }) });
    assert(preview.summary.valid === 1 && preview.rows[0]?.action === 'update', 'XLSX stok preview update donmedi.');
    assert(Number(preview.rows[0]?.data?.newStock ?? 0) === 10, 'XLSX stok yeni stok hesaplamasi yanlis.');
    return `newStock=${preview.rows[0]?.data?.newStock}`;
  });

  await record('CSV import audit log yaziyor mu?', async () => {
    const systemStatus = await request<SystemStatus>('/system/status');
    const actions = new Set(systemStatus.recentAuditLogs.map((log) => log.action));
    assert(actions.has('PRODUCT_IMPORT_APPLIED'), 'PRODUCT_IMPORT_APPLIED audit log yok.');
    assert(actions.has('CUSTOMER_IMPORT_APPLIED'), 'CUSTOMER_IMPORT_APPLIED audit log yok.');
    assert(actions.has('SUPPLIER_IMPORT_APPLIED'), 'SUPPLIER_IMPORT_APPLIED audit log yok.');
    assert(actions.has('PRICE_IMPORT_APPLIED'), 'PRICE_IMPORT_APPLIED audit log yok.');
    assert(actions.has('STOCK_IMPORT_APPLIED'), 'STOCK_IMPORT_APPLIED audit log yok.');
    return 'import audit loglari gorundu';
  });

  await record('test kayitlari hazirlaniyor', async () => {
    product = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({
        stockCode: `SMK-${runId}`,
        barcode: `978${runId}`,
        brand: 'Smoke Test',
        typeName: 'Test Urunu',
        quantity: 10,
        buyPrice: 50,
        sellPrice: 80,
        buyPriceTry: 50,
        sellPriceTry: 80,
        active: true,
      }),
    });
    lowStockProduct = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({
        stockCode: `SMK-LOW-${runId}`,
        barcode: `979${runId}`,
        brand: 'Smoke Test',
        typeName: 'Dusuk Stok',
        quantity: 1,
        buyPrice: 20,
        sellPrice: 30,
        buyPriceTry: 20,
        sellPriceTry: 30,
        active: true,
      }),
    });
    customer = await request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke Musteri ${runId}`, phone: '05000000000', defaultCurrency: 'TRY', active: true }),
    });
    usdCustomer = await request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke USD Musteri ${runId}`, phone: '05000000002', defaultCurrency: 'USD', active: true }),
    });
    eurCustomer = await request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke EUR Musteri ${runId}`, phone: '05000000003', defaultCurrency: 'EUR', active: true }),
    });
    supplier = await request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke Tedarikci ${runId}`, phone: '05000000001', defaultCurrency: 'TRY', active: true }),
    });
    usdSupplier = await request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke USD Tedarikci ${runId}`, phone: '05000000004', defaultCurrency: 'USD', active: true }),
    });
    eurSupplier = await request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: `Smoke EUR Tedarikci ${runId}`, phone: '05000000005', defaultCurrency: 'EUR', active: true }),
    });
    return `urun=${product.id}, musteri=${customer.id}, tedarikci=${supplier.id}`;
  });

  await record('alis fisi stok artiriyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const before = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    await request('/purchase-receipts', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: activeSupplier.id,
        items: [{ productId: activeProduct.id, quantity: 5, unitPrice: 55 }],
        note: 'Smoke alis',
      }),
    });
    const after = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    assert(asNumber(after.quantity) === asNumber(before.quantity) + 5, `Stok artmadi: ${before.quantity} -> ${after.quantity}`);
    return `${before.quantity} -> ${after.quantity}`;
  });

  await record('tedarikci bakiyesi artiyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const suppliers = await request<Supplier[]>('/suppliers');
    const updated = requireValue(suppliers.find((item) => item.id === activeSupplier.id), 'Guncel tedarikci');
    assert(asNumber(updated.balanceTry) >= 275, `TRY bakiye beklenen seviyede degil: ${updated.balanceTry}`);
    return `balanceTry=${updated.balanceTry}`;
  });

  await record('alis sonrasi averageCostTry guncelleniyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const updated = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    expectedAverageCostTry = ((10 * 50) + (5 * 55)) / 15;
    assertClose(updated.averageCostTry, expectedAverageCostTry, 0.02, 'Ortalama maliyet beklenen degerde degil');
    return `averageCostTry=${updated.averageCostTry}`;
  });

  await record('stok hareketleri endpointi veri donduruyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const movements = await request<Array<{ productId: number; documentNo?: string | null; movementType: string }>>(`/stock-movements?productId=${activeProduct.id}`);
    assert(movements.some((item) => item.productId === activeProduct.id && item.movementType === 'PURCHASE_IN'), 'Alis sonrasi stok hareketi bulunamadi.');
    return `${movements.length} hareket geldi`;
  });

  await record('satis fisi stok dusuyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const before = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    const receipt = await request<Receipt>('/sales-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerId: activeCustomer.id,
        items: [{ productId: activeProduct.id, quantity: 2, unitPrice: 80 }],
        note: 'Smoke satis',
      }),
    });
    costSalesReceiptId = receipt.id;
    const after = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    assert(asNumber(after.quantity) === asNumber(before.quantity) - 2, `Stok dusmedi: ${before.quantity} -> ${after.quantity}`);
    return `${before.quantity} -> ${after.quantity}`;
  });

  await record('satis item maliyet snapshot aliyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const receiptId = requireValue(costSalesReceiptId ?? undefined, 'Maliyet snapshot satis fisi');
    const receipt = await request<Receipt>(`/sales-receipts/${receiptId}`);
    const item = requireValue(receipt.items?.find((row) => row.productId === activeProduct.id), 'Satis satiri');
    assertClose(item.unitCostTry, expectedAverageCostTry, 0.02, 'Satis satiri unitCostTry snapshot yanlis');
    assertClose(item.totalCostTry, expectedAverageCostTry * 2, 0.03, 'Satis satiri totalCostTry yanlis');
    return `unitCostTry=${item.unitCostTry}, totalCostTry=${item.totalCostTry}`;
  });

  await record('satis grossProfitTry hesaplaniyor mu?', async () => {
    const receiptId = requireValue(costSalesReceiptId ?? undefined, 'Kar snapshot satis fisi');
    const receipt = await request<Receipt>(`/sales-receipts/${receiptId}`);
    const item = requireValue(receipt.items?.[0], 'Satis satiri');
    const expectedGrossProfit = 160 - (expectedAverageCostTry * 2);
    const expectedMargin = (expectedGrossProfit / 160) * 100;
    assertClose(item.grossProfitTry, expectedGrossProfit, 0.03, 'Satis satiri grossProfitTry yanlis');
    assertClose(item.profitMargin, expectedMargin, 0.02, 'Satis satiri profitMargin yanlis');
    return `grossProfitTry=${item.grossProfitTry}, profitMargin=${item.profitMargin}`;
  });

  await record('stockMovement maliyet alanlari doluyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const receiptId = requireValue(costSalesReceiptId ?? undefined, 'Maliyet stok hareketi satis fisi');
    const movements = await request<StockMovement[]>(`/stock-movements?productId=${activeProduct.id}`);
    const purchaseMovement = requireValue(movements.find((item) => item.movementType === 'PURCHASE_IN' && item.sourceDocumentType === 'purchase_receipt'), 'Alis maliyet stok hareketi');
    const saleMovement = requireValue(movements.find((item) => item.movementType === 'SALE_OUT' && item.sourceDocumentId === receiptId), 'Satis maliyet stok hareketi');
    assertClose(purchaseMovement.unitCostTry, 55, 0.01, 'Alis hareketi unitCostTry yanlis');
    assertClose(purchaseMovement.stockAfter, 15, 0.01, 'Alis hareketi stockAfter yanlis');
    assertClose(purchaseMovement.averageCostAfterTry, expectedAverageCostTry, 0.02, 'Alis hareketi averageCostAfterTry yanlis');
    assertClose(saleMovement.unitCostTry, expectedAverageCostTry, 0.02, 'Satis hareketi unitCostTry yanlis');
    assertClose(saleMovement.valueChangeTry, -(expectedAverageCostTry * 2), 0.03, 'Satis hareketi valueChangeTry yanlis');
    assertClose(saleMovement.stockAfter, 13, 0.01, 'Satis hareketi stockAfter yanlis');
    return `alis=${purchaseMovement.unitCostTry}, satis=${saleMovement.valueChangeTry}`;
  });

  await record('musteri bakiyesi artiyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const customers = await request<Customer[]>('/customers');
    const updated = requireValue(customers.find((item) => item.id === activeCustomer.id), 'Guncel musteri');
    assert(asNumber(updated.balanceTry) >= 160, `TRY bakiye beklenen seviyede degil: ${updated.balanceTry}`);
    return `balanceTry=${updated.balanceTry}`;
  });

  await record('musteri hareketleri endpointi satis sonrasi veri donduruyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const movements = await request<Array<{ type: string; receiptId: number; amount: string | number }>>(`/customers/${activeCustomer.id}/movements`);
    assert(movements.some((item) => item.type === 'SALE' && asNumber(item.amount) > 0), 'Musteri satis hareketi bulunamadi.');
    return `${movements.length} hareket geldi`;
  });

  await record('satis fisi cari hareket olusturuyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/CUSTOMER/${activeCustomer.id}`);
    assert(movements.some((item) => item.partyType === 'CUSTOMER' && item.documentType === 'SALES_RECEIPT' && item.direction === 'DEBIT' && asNumber(item.amount) > 0), 'Satis cari DEBIT hareketi bulunamadi.');
    return `${movements.length} cari hareket`;
  });

  await record('USD musteri satisinda balanceUsd artiyor mu?', async () => {
    const activeCustomer = requireValue(usdCustomer!, 'USD musterisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    await request('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, items: [{ productId: activeProduct.id, quantity: 1 }] }) });
    const updated = requireValue((await request<Customer[]>('/customers')).find((item) => item.id === activeCustomer.id), 'Guncel USD musteri');
    assert(asNumber(updated.balanceUsd) > 0 && asNumber(updated.balanceTry) === 0, `USD bakiye yanlis: usd=${updated.balanceUsd}, try=${updated.balanceTry}`);
    return `balanceUsd=${updated.balanceUsd}`;
  });

  await record('EUR musteri satisinda balanceEur artiyor mu?', async () => {
    const activeCustomer = requireValue(eurCustomer!, 'EUR musterisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    const receipt = await request<{ id: number; usdToTry: string | number; totalAmount: string | number }>('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, items: [{ productId: activeProduct.id, quantity: 1 }] }) });
    frozenReceiptId = receipt.id;
    frozenUsdToTry = asNumber(receipt.usdToTry);
    frozenTotalAmount = asNumber(receipt.totalAmount);
    const updated = requireValue((await request<Customer[]>('/customers')).find((item) => item.id === activeCustomer.id), 'Guncel EUR musteri');
    assert(asNumber(updated.balanceEur) > 0 && asNumber(updated.balanceTry) === 0, `EUR bakiye yanlis: eur=${updated.balanceEur}, try=${updated.balanceTry}`);
    return `balanceEur=${updated.balanceEur}`;
  });

  await record('USD tedarikci alisinda balanceUsd artiyor mu?', async () => {
    const activeSupplier = requireValue(usdSupplier!, 'USD tedarikcisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    await request('/purchase-receipts', { method: 'POST', body: JSON.stringify({ supplierId: activeSupplier.id, items: [{ productId: activeProduct.id, quantity: 1 }] }) });
    const updated = requireValue((await request<Supplier[]>('/suppliers')).find((item) => item.id === activeSupplier.id), 'Guncel USD tedarikci');
    assert(asNumber(updated.balanceUsd) > 0 && asNumber(updated.balanceTry) === 0, `USD tedarikci bakiye yanlis: usd=${updated.balanceUsd}, try=${updated.balanceTry}`);
    return `balanceUsd=${updated.balanceUsd}`;
  });

  await record('tedarikci hareketleri endpointi alis sonrasi veri donduruyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const movements = await request<Array<{ type: string; receiptId: number; amount: string | number }>>(`/suppliers/${activeSupplier.id}/movements`);
    assert(movements.some((item) => item.type === 'PURCHASE' && asNumber(item.amount) > 0), 'Tedarikci alis hareketi bulunamadi.');
    return `${movements.length} hareket geldi`;
  });

  await record('alis fisi cari hareket olusturuyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/SUPPLIER/${activeSupplier.id}`);
    assert(movements.some((item) => item.partyType === 'SUPPLIER' && item.documentType === 'PURCHASE_RECEIPT' && item.direction === 'CREDIT' && asNumber(item.amount) > 0), 'Alis cari CREDIT hareketi bulunamadi.');
    return `${movements.length} cari hareket`;
  });

  await record('EUR tedarikci alisinda balanceEur artiyor mu?', async () => {
    const activeSupplier = requireValue(eurSupplier!, 'EUR tedarikcisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    await request('/purchase-receipts', { method: 'POST', body: JSON.stringify({ supplierId: activeSupplier.id, items: [{ productId: activeProduct.id, quantity: 1 }] }) });
    const updated = requireValue((await request<Supplier[]>('/suppliers')).find((item) => item.id === activeSupplier.id), 'Guncel EUR tedarikci');
    assert(asNumber(updated.balanceEur) > 0 && asNumber(updated.balanceTry) === 0, `EUR tedarikci bakiye yanlis: eur=${updated.balanceEur}, try=${updated.balanceTry}`);
    return `balanceEur=${updated.balanceEur}`;
  });

  await record('kur degisince eski fis kuru sabit kaliyor mu?', async () => {
    const receiptId = requireValue(frozenReceiptId ?? undefined, 'Sabit kur test fisi');
    await request('/exchange-rates', { method: 'POST', body: JSON.stringify({ usdToTry: 40, eurToTry: 44, eurToUsd: 1.1, effectiveDate: new Date().toISOString() }) });
    const receipt = requireValue((await request<Array<{ id: number; usdToTry: string | number; totalAmount: string | number }>>('/sales-receipts')).find((item) => item.id === receiptId), 'Eski fis');
    assert(asNumber(receipt.usdToTry) === frozenUsdToTry, `Eski fis kuru degisti: ${frozenUsdToTry} -> ${receipt.usdToTry}`);
    assert(asNumber(receipt.totalAmount) === frozenTotalAmount, `Eski fis toplami degisti: ${frozenTotalAmount} -> ${receipt.totalAmount}`);
    return `usdToTry=${receipt.usdToTry}, total=${receipt.totalAmount}`;
  });

  await record('USD alis TRY satis yeni para modeli calisiyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const fxProduct = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ stockCode: `SMK-FX-USDTRY-${runId}`, barcode: `981${runId}`, brand: 'Smoke FX', typeName: 'USD Alis TRY Satis', quantity: 0, currency: 'USD', purchasePrice: 2, salePrice: 4, buyPrice: 2, sellPrice: 4, buyPriceUsd: 2, sellPriceUsd: 4, active: true }),
    });
    fxUsdTryProductId = fxProduct.id;
    const purchase = await request<Receipt>('/purchase-receipts', { method: 'POST', body: JSON.stringify({ supplierId: activeSupplier.id, currency: 'USD', items: [{ productId: fxProduct.id, quantity: 3, unitPrice: 2 }] }) });
    const sale = await request<Receipt>('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, currency: 'TRY', items: [{ productId: fxProduct.id, quantity: 1, unitPrice: 120 }] }) });
    fxUsdTrySaleDocumentNo = sale.documentNo;
    const saleDetail = await request<Receipt>(`/sales-receipts/${sale.id}`);
    const item = requireValue(saleDetail.items?.[0], 'USD alis TRY satis satiri');
    assert(purchase.documentCurrency === 'USD', `Alis documentCurrency USD degil: ${purchase.documentCurrency}`);
    assert(saleDetail.documentCurrency === 'TRY', `Satis documentCurrency TRY degil: ${saleDetail.documentCurrency}`);
    assert(item.lineCurrency === 'TRY', `Satis satiri lineCurrency TRY degil: ${item.lineCurrency}`);
    assert(asNumber(item.unitCostTry ?? 0) > 0, 'USD alis maliyeti TRY snapshota donusmedi.');
    return `alis=${purchase.documentCurrency}, satis=${saleDetail.documentCurrency}, maliyet=${item.unitCostTry}`;
  });

  await record('TRY alis USD satis yeni para modeli calisiyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const fxProduct = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ stockCode: `SMK-FX-TRYUSD-${runId}`, barcode: `982${runId}`, brand: 'Smoke FX', typeName: 'TRY Alis USD Satis', quantity: 0, currency: 'TRY', purchasePrice: 50, salePrice: 90, buyPrice: 50, sellPrice: 90, buyPriceTry: 50, sellPriceTry: 90, active: true }),
    });
    const purchase = await request<Receipt>('/purchase-receipts', { method: 'POST', body: JSON.stringify({ supplierId: activeSupplier.id, currency: 'TRY', items: [{ productId: fxProduct.id, quantity: 3, unitPrice: 50 }] }) });
    const sale = await request<Receipt>('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, currency: 'USD', items: [{ productId: fxProduct.id, quantity: 1, unitPrice: 3 }] }) });
    const saleDetail = await request<Receipt>(`/sales-receipts/${sale.id}`);
    const item = requireValue(saleDetail.items?.[0], 'TRY alis USD satis satiri');
    assert(purchase.documentCurrency === 'TRY', `Alis documentCurrency TRY degil: ${purchase.documentCurrency}`);
    assert(saleDetail.documentCurrency === 'USD', `Satis documentCurrency USD degil: ${saleDetail.documentCurrency}`);
    assert(item.lineCurrency === 'USD', `Satis satiri lineCurrency USD degil: ${item.lineCurrency}`);
    assert(asNumber(item.lineTotalTry ?? 0) > asNumber(item.lineTotal), 'USD satis lineTotalTry hesaplanmadi.');
    return `alis=${purchase.documentCurrency}, satis=${saleDetail.documentCurrency}, lineTry=${item.lineTotalTry}`;
  });

  await record('USD musteri TRY fis cari para ayrimi dogru mu?', async () => {
    const activeCustomer = requireValue(usdCustomer!, 'USD musterisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    const sale = await request<Receipt>('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, currency: 'TRY', items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }] }) });
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/CUSTOMER/${activeCustomer.id}`);
    const movement = requireValue(movements.find((item) => item.documentNo === sale.documentNo), 'USD musteri TRY fis cari hareketi');
    assert(movement.accountCurrency === 'USD', `accountCurrency USD degil: ${movement.accountCurrency}`);
    assert(movement.documentCurrency === 'TRY', `documentCurrency TRY degil: ${movement.documentCurrency}`);
    assert(asNumber(movement.documentAmount ?? 0) === 80, `documentAmount TRY tutari degil: ${movement.documentAmount}`);
    assert(asNumber(movement.accountAmount ?? 0) > 0 && asNumber(movement.accountAmount ?? 0) < 80, `accountAmount USD donusmedi: ${movement.accountAmount}`);
    return `account=${movement.accountCurrency} ${movement.accountAmount}, document=${movement.documentCurrency} ${movement.documentAmount}`;
  });

  await record('TRY musteri USD fis cari para ayrimi dogru mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const activeProduct = requireValue(product!, 'Test urunu');
    const sale = await request<Receipt>('/sales-receipts', { method: 'POST', body: JSON.stringify({ customerId: activeCustomer.id, currency: 'USD', items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 2 }] }) });
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/CUSTOMER/${activeCustomer.id}`);
    const movement = requireValue(movements.find((item) => item.documentNo === sale.documentNo), 'TRY musteri USD fis cari hareketi');
    assert(movement.accountCurrency === 'TRY', `accountCurrency TRY degil: ${movement.accountCurrency}`);
    assert(movement.documentCurrency === 'USD', `documentCurrency USD degil: ${movement.documentCurrency}`);
    assert(asNumber(movement.documentAmount ?? 0) === 2, `documentAmount USD tutari degil: ${movement.documentAmount}`);
    assert(asNumber(movement.accountAmount ?? 0) > 2, `accountAmount TRY donusmedi: ${movement.accountAmount}`);
    return `account=${movement.accountCurrency} ${movement.accountAmount}, document=${movement.documentCurrency} ${movement.documentAmount}`;
  });

  await record('yetersiz stokta satis engelleniyor mu?', async () => {
    const activeLowStockProduct = requireValue(lowStockProduct!, 'Dusuk stok test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    try {
      await request('/sales-receipts', {
        method: 'POST',
        body: JSON.stringify({
          customerId: activeCustomer.id,
          items: [{ productId: activeLowStockProduct.id, quantity: 999, unitPrice: 30 }],
          note: 'Smoke yetersiz stok',
        }),
      });
    } catch (error) {
      return error instanceof Error ? error.message : 'Yetersiz stok engellendi';
    }
    throw new Error('Yetersiz stok satisi engellenmedi.');
  });

  await record('ayni localUuid tekrar gelince duplicate oluyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const localUuid = `smoke-${runId}`;
    const payload = {
      customerId: activeCustomer.id,
      items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }],
      note: 'Smoke terminal sync',
    };
    const first = await request<{ ok: boolean; duplicate: boolean; status: string; serverId: number }>('/terminal/sync-sales-receipt', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    const second = await request<{ ok: boolean; duplicate: boolean; status: string; serverId: number }>('/terminal/sync-sales-receipt', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    assert(first.ok === true && first.status === 'synced', `Ilk sync basarisiz: ${first.status}`);
    assert(Number.isInteger(first.serverId), 'Ilk sync serverId donmedi.');
    assert(second.duplicate === true, 'Ikinci sync duplicate donmedi.');
    return `first=${first.status}, duplicate=${second.duplicate}`;
  });

  await record('POST /terminal-sync alias satisi senkronluyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const localUuid = `smoke-alias-${runId}`;
    const payload = {
      customerId: activeCustomer.id,
      items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }],
      note: 'Smoke terminal-sync alias',
    };
    const result = await request<{ ok: boolean; localUuid: string; serverId: number; status: string }>('/terminal-sync', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    assert(result.ok === true, 'terminal-sync ok=true donmedi.');
    assert(result.status === 'synced', `Beklenen synced, gelen: ${result.status}`);
    assert(result.localUuid === localUuid, 'localUuid ayni donmedi.');
    assert(Number.isInteger(result.serverId), 'serverId donmedi.');
    return `${result.status} serverId=${result.serverId}`;
  });

  await record('POST /terminal-sync duplicate basarili kabul ediliyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const localUuid = `smoke-alias-dup-${runId}`;
    const payload = {
      customerId: activeCustomer.id,
      items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }],
      note: 'Smoke terminal-sync duplicate',
    };
    await request('/terminal-sync', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    const duplicate = await request<{ ok: boolean; duplicate: boolean; status: string }>('/terminal-sync', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    assert(duplicate.ok === true, 'Duplicate ok=true donmedi.');
    assert(duplicate.status === 'duplicate', `Beklenen duplicate, gelen: ${duplicate.status}`);
    assert(duplicate.duplicate === true, 'duplicate=true donmedi.');
    return `${duplicate.status}`;
  });

  await record('GET /terminal-sync/logs calisiyor mu?', async () => {
    const response = await request<{ ok: boolean; logs: Array<{ localUuid: string; terminalId: string; status: string }> }>('/terminal-sync/logs');
    assert(response.ok === true, 'logs ok=true donmedi.');
    assert(Array.isArray(response.logs), 'logs array degil.');
    assert(response.logs.some((log) => log.terminalId === 'SMOKE-TERM'), 'Smoke terminal logu bulunamadi.');
    return `${response.logs.length} log`;
  });

  await record('GET /terminal-sync/summary calisiyor mu?', async () => {
    const summary = await request<{ ok: boolean; total: number; pending: number; synced: number; failed: number }>('/terminal-sync/summary');
    assert(summary.ok === true, 'summary ok=true donmedi.');
    assert(summary.total >= summary.synced, 'summary total/synced tutarsiz.');
    return `total=${summary.total}, synced=${summary.synced}, failed=${summary.failed}`;
  });

  await record('POST /terminal-devices/heartbeat calisiyor mu?', async () => {
    const response = await request<{ ok: boolean; terminalId: string; status: string; serverSeenAt: string }>('/terminal-devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ terminalId: 'SMOKE-TERM', deviceName: 'Smoke Terminal', appVersion: 'smoke' }),
    });
    assert(response.ok === true, 'heartbeat ok=true donmedi.');
    assert(response.status === 'online', `Beklenen online, gelen: ${response.status}`);
    assert(Boolean(response.serverSeenAt), 'serverSeenAt donmedi.');
    return `${response.terminalId} ${response.status}`;
  });

  await record('aktif kur yoksa fis kaydi net hata veriyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    await prisma.exchangeRate.updateMany({ where: { active: true }, data: { active: false } });
    try {
      await request('/sales-receipts', {
        method: 'POST',
        body: JSON.stringify({
          customerId: activeCustomer.id,
          items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }],
          note: 'Smoke aktif kur yok',
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Aktif kur hatasi';
      await request('/exchange-rates', { method: 'POST', body: JSON.stringify({ usdToTry: 40, eurToTry: 44, tryToUsd: 1 / 40, tryToEur: 1 / 44, eurToUsd: 1.1, usdToEur: 40 / 44, effectiveDate: new Date().toISOString() }) });
      assert(message.includes('Aktif manuel kur bulunamadi'), `Beklenen aktif kur hatasi degil: ${message}`);
      return message;
    }
    await request('/exchange-rates', { method: 'POST', body: JSON.stringify({ usdToTry: 40, eurToTry: 44, tryToUsd: 1 / 40, tryToEur: 1 / 44, eurToUsd: 1.1, usdToEur: 40 / 44, effectiveDate: new Date().toISOString() }) });
    throw new Error('Aktif kur yokken fis kaydi kabul edildi.');
  });

  await record('staff kur guncelleme denemesi 403 donuyor mu?', async () => {
    try {
      await request('/exchange-rates', {
        method: 'POST',
        body: JSON.stringify({ usdToTry: 41, eurToTry: 45, eurToUsd: 1.1, effectiveDate: new Date().toISOString() }),
      }, staffToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yetki hatasi';
      assert(message.includes('yetkiniz yok'), `Beklenen 403 yetki mesaji degil: ${message}`);
      return message;
    }
    throw new Error('Staff kur guncelleyebildi.');
  });

  await record('staff fis iptal denemesi 403 donuyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const receipt = await request<Receipt>('/sales-receipts', {
      method: 'POST',
      body: JSON.stringify({ customerId: activeCustomer.id, items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }], note: 'Smoke staff iptal yetki' }),
    });
    try {
      await request<Receipt>(`/sales-receipts/${receipt.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Staff iptal denemesi' }) }, staffToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yetki hatasi';
      assert(message.includes('yetkiniz yok'), `Beklenen 403 yetki mesaji degil: ${message}`);
      return message;
    }
    throw new Error('Staff satis fisi iptal edebildi.');
  });

  await record('satis fisi iptal edilince stok geri artiyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const before = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    const receipt = await request<Receipt>('/sales-receipts', {
      method: 'POST',
      body: JSON.stringify({ customerId: activeCustomer.id, items: [{ productId: activeProduct.id, quantity: 1, unitPrice: 80 }], note: 'Smoke iptal satis' }),
    });
    cancelSalesReceiptId = receipt.id;
    const afterSale = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    await request<Receipt>(`/sales-receipts/${receipt.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Smoke satis iptal' }) });
    const afterCancel = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    assert(asNumber(afterSale.quantity) === asNumber(before.quantity) - 1, `Satis stok dusurmedi: ${before.quantity} -> ${afterSale.quantity}`);
    assert(asNumber(afterCancel.quantity) === asNumber(before.quantity), `Iptal stok geri artirmadi: ${before.quantity} -> ${afterCancel.quantity}`);
    return `${afterSale.quantity} -> ${afterCancel.quantity}`;
  });

  await record('satis fisi iptal edilince musteri bakiyesi dusuyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const updated = requireValue((await request<Customer[]>('/customers')).find((item) => item.id === activeCustomer.id), 'Guncel musteri');
    assert(asNumber(updated.balanceTry) >= 240, `Musteri bakiyesi beklenen seviyeye donmedi: ${updated.balanceTry}`);
    return `balanceTry=${updated.balanceTry}`;
  });

  await record('satis fisi ikinci kez iptal edilemiyor mu?', async () => {
    const receiptId = requireValue(cancelSalesReceiptId ?? undefined, 'Iptal satis fisi');
    try {
      await request<Receipt>(`/sales-receipts/${receiptId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Smoke tekrar satis iptal' }) });
    } catch (error) {
      return error instanceof Error ? error.message : 'Tekrar iptal engellendi';
    }
    throw new Error('Satis fisi ikinci kez iptal edildi.');
  });

  await record('satis iptali ters cari hareket olusturuyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const receiptId = requireValue(cancelSalesReceiptId ?? undefined, 'Iptal satis fisi');
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/CUSTOMER/${activeCustomer.id}`);
    assert(movements.some((item) => item.documentType === 'CANCEL' && item.direction === 'CREDIT' && item.partyType === 'CUSTOMER' && item.id && item.documentNo && item.amount && item.partyId === activeCustomer.id), 'Satis iptali CREDIT ters cari hareketi bulunamadi.');
    assert(movements.some((item) => item.documentType === 'CANCEL' && item.direction === 'CREDIT' && item.partyType === 'CUSTOMER'), `Iptal fis ${receiptId} icin ters hareket yok.`);
    return `${movements.filter((item) => item.documentType === 'CANCEL').length} iptal hareketi`;
  });

  await record('alis fisi iptal edilince stok dusuyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const before = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    const receipt = await request<Receipt>('/purchase-receipts', {
      method: 'POST',
      body: JSON.stringify({ supplierId: activeSupplier.id, items: [{ productId: activeProduct.id, quantity: 2, unitPrice: 55 }], note: 'Smoke iptal alis' }),
    });
    cancelPurchaseReceiptId = receipt.id;
    const afterPurchase = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    await request<Receipt>(`/purchase-receipts/${receipt.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Smoke alis iptal' }) });
    const afterCancel = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    assert(asNumber(afterPurchase.quantity) === asNumber(before.quantity) + 2, `Alis stok artirmadi: ${before.quantity} -> ${afterPurchase.quantity}`);
    assert(asNumber(afterCancel.quantity) === asNumber(before.quantity), `Alis iptali stok dusurmedi: ${afterPurchase.quantity} -> ${afterCancel.quantity}`);
    return `${afterPurchase.quantity} -> ${afterCancel.quantity}`;
  });

  await record('alis fisi iptal edilince tedarikci bakiyesi dusuyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const updated = requireValue((await request<Supplier[]>('/suppliers')).find((item) => item.id === activeSupplier.id), 'Guncel tedarikci');
    assert(asNumber(updated.balanceTry) >= 275, `Tedarikci bakiyesi beklenen seviyeye donmedi: ${updated.balanceTry}`);
    return `balanceTry=${updated.balanceTry}`;
  });

  await record('stok yetersizse alis iptali engelleniyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const lockedProduct = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({
        stockCode: `SMK-CANCEL-LOW-${runId}`,
        barcode: `977${runId}`,
        brand: 'Smoke Test',
        typeName: 'Alis Iptal Dusuk Stok',
        quantity: 0,
        buyPrice: 10,
        sellPrice: 20,
        buyPriceTry: 10,
        sellPriceTry: 20,
        active: true,
      }),
    });
    const receipt = await request<Receipt>('/purchase-receipts', {
      method: 'POST',
      body: JSON.stringify({ supplierId: activeSupplier.id, items: [{ productId: lockedProduct.id, quantity: 3, unitPrice: 10 }], note: 'Smoke yetersiz alis iptal' }),
    });
    await request<Receipt>('/sales-receipts', {
      method: 'POST',
      body: JSON.stringify({ customerId: activeCustomer.id, items: [{ productId: lockedProduct.id, quantity: 3, unitPrice: 20 }], note: 'Smoke stok bosalt' }),
    });
    try {
      await request<Receipt>(`/purchase-receipts/${receipt.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Smoke yetersiz stok alis iptal' }) });
    } catch (error) {
      return error instanceof Error ? error.message : 'Yetersiz stokta alis iptali engellendi';
    }
    throw new Error('Yetersiz stokta alis iptali engellenmedi.');
  });

  await record('alis fisi ikinci kez iptal edilemiyor mu?', async () => {
    const receiptId = requireValue(cancelPurchaseReceiptId ?? undefined, 'Iptal alis fisi');
    try {
      await request<Receipt>(`/purchase-receipts/${receiptId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Smoke tekrar alis iptal' }) });
    } catch (error) {
      return error instanceof Error ? error.message : 'Tekrar iptal engellendi';
    }
    throw new Error('Alis fisi ikinci kez iptal edildi.');
  });

  await record('alis iptali ters cari hareket olusturuyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const movements = await request<CurrentAccountMovement[]>(`/current-account/movements/SUPPLIER/${activeSupplier.id}`);
    assert(movements.some((item) => item.documentType === 'CANCEL' && item.direction === 'DEBIT' && item.partyType === 'SUPPLIER' && item.partyId === activeSupplier.id), 'Alis iptali DEBIT ters cari hareketi bulunamadi.');
    return `${movements.filter((item) => item.documentType === 'CANCEL').length} iptal hareketi`;
  });

  await record('cari hareket listesi calisiyor mu?', async () => {
    const movements = await request<CurrentAccountMovement[]>('/current-account/movements');
    assert(Array.isArray(movements), 'Cari hareket listesi array degil.');
    assert(movements.some((item) => item.documentType === 'SALES_RECEIPT'), 'Cari listede satis hareketi yok.');
    assert(movements.some((item) => item.documentType === 'PURCHASE_RECEIPT'), 'Cari listede alis hareketi yok.');
    return `${movements.length} cari hareket`;
  });

  await record('musteri tahsilati cari hareket olusturuyor mu?', async () => {
    const activeCustomer = requireValue(customer!, 'Test musterisi');
    const movement = await request<CurrentAccountMovement>('/current-account/collection', {
      method: 'POST',
      body: JSON.stringify({ customerId: activeCustomer.id, amount: 25, currency: 'TRY', paymentMethod: 'CASH', description: 'Smoke tahsilat' }),
    });
    assert(movement.partyType === 'CUSTOMER', 'Tahsilat CUSTOMER hareketi degil.');
    assert(movement.documentType === 'COLLECTION', `Beklenen COLLECTION, gelen ${movement.documentType}`);
    assert(movement.direction === 'CREDIT', `Beklenen CREDIT, gelen ${movement.direction}`);
    assert(movement.paymentMethod === 'CASH', `Beklenen CASH, gelen ${movement.paymentMethod}`);
    return `${movement.documentNo} ${movement.direction}`;
  });

  await record('tedarikci odemesi cari hareket olusturuyor mu?', async () => {
    const activeSupplier = requireValue(supplier!, 'Test tedarikcisi');
    const movement = await request<CurrentAccountMovement>('/current-account/payment', {
      method: 'POST',
      body: JSON.stringify({ supplierId: activeSupplier.id, amount: 30, currency: 'TRY', paymentMethod: 'BANK', description: 'Smoke odeme' }),
    });
    assert(movement.partyType === 'SUPPLIER', 'Odeme SUPPLIER hareketi degil.');
    assert(movement.documentType === 'PAYMENT', `Beklenen PAYMENT, gelen ${movement.documentType}`);
    assert(movement.direction === 'DEBIT', `Beklenen DEBIT, gelen ${movement.direction}`);
    assert(movement.paymentMethod === 'BANK', `Beklenen BANK, gelen ${movement.paymentMethod}`);
    return `${movement.documentNo} ${movement.direction}`;
  });

  await record('tahsilat ve odeme hareket listesinde gorunuyor mu?', async () => {
    const movements = await request<CurrentAccountMovement[]>('/current-account/movements');
    assert(movements.some((item) => item.documentType === 'COLLECTION' && item.direction === 'CREDIT'), 'COLLECTION hareketi listede yok.');
    assert(movements.some((item) => item.documentType === 'PAYMENT' && item.direction === 'DEBIT'), 'PAYMENT hareketi listede yok.');
    return `${movements.length} cari hareket`;
  });

  await record('stok deger raporu urun bazli veri donduruyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const rows = await request<StockValuationRow[]>('/reports/stock-valuation');
    const row = requireValue(rows.find((item) => item.productId === activeProduct.id), 'Stok deger raporu satiri');
    assert(row.productCode === activeProduct.stockCode, 'Stok deger raporu stok kodu yanlis.');
    assert(row.stockQuantity >= 0, 'Stok miktari negatif geldi.');
    assert(row.averageCostTry >= 0, 'Ortalama maliyet negatif geldi.');
    assertClose(row.stockValueTry, row.stockQuantity * row.averageCostTry, 0.05, 'Stok degeri yanlis');
    assertClose(row.potentialSaleValueTry, row.stockQuantity * row.salePrice, 0.05, 'Potansiyel satis degeri yanlis');
    return `${row.productCode} stokDegeri=${row.stockValueTry}`;
  });

  await record('stok deger raporu summary calisiyor mu?', async () => {
    const summary = await request<StockValuationSummary>('/reports/stock-valuation/summary');
    assert(summary.totalProductCount > 0, 'Toplam urun sayisi bos.');
    assert(summary.totalStockQuantity >= 0, 'Toplam stok miktari negatif.');
    assert(summary.totalStockValueTry >= 0, 'Toplam stok degeri negatif.');
    assert(summary.lowStockCount >= 0, 'Dusuk stok sayisi negatif.');
    return `urun=${summary.totalProductCount}, stokDegeri=${summary.totalStockValueTry}`;
  });

  await record('urun kar raporu snapshot alanlarini donduruyor mu?', async () => {
    const activeProduct = requireValue(product!, 'Test urunu');
    const rows = await request<ProductProfitReport[]>('/reports/product-profit');
    const row = requireValue(rows.find((item) => item.productId === activeProduct.id), 'Urun kar raporu satiri');
    assert(row.productCode === activeProduct.stockCode, 'Urun kar raporu stok kodu yanlis.');
    assert(row.quantity >= 2, 'Urun kar raporu satilan adet bos.');
    assert(row.salesAmountTry > 0, 'Urun kar raporu satis TRY bos.');
    assert(row.costTry > 0, 'Urun kar raporu maliyet TRY bos.');
    assert(row.costStatus === 'ok', `Beklenen costStatus=ok, gelen ${row.costStatus}`);
    return `${row.productCode} kar=${row.grossProfitTry}`;
  });

  await record('fis kar analizi raporu satis fisi donduruyor mu?', async () => {
    const receiptId = requireValue(costSalesReceiptId ?? undefined, 'Kar analizi satis fisi');
    const rows = await request<SalesProfitReport[]>('/reports/sales-profit');
    const row = requireValue(rows.find((item) => item.receiptId === receiptId), 'Fis kar analizi satiri');
    assert(row.salesAmountTry > 0, 'Fis kar analizi satis TRY bos.');
    assert(row.costTry > 0, 'Fis kar analizi maliyet TRY bos.');
    assert(row.grossProfitTry > 0, 'Fis kar analizi brut kar bos.');
    assert(row.costStatus === 'ok', `Beklenen costStatus=ok, gelen ${row.costStatus}`);
    return `${row.documentNo} kar=${row.grossProfitTry}`;
  });

  await record('satis fisi kar detayi satir maliyetlerini donduruyor mu?', async () => {
    const receiptId = requireValue(costSalesReceiptId ?? undefined, 'Kar detayi satis fisi');
    const detail = await request<SalesReceiptProfitDetail>(`/sales-receipts/${receiptId}/profit`);
    assert(detail.receiptId === receiptId, 'Kar detayi fis id yanlis.');
    assert(detail.items.length > 0, 'Kar detayi satirlari bos.');
    assert(detail.items.every((item) => item.totalCostTry > 0), 'Kar detayi satir maliyeti bos.');
    assert(detail.costStatus === 'ok', `Beklenen costStatus=ok, gelen ${detail.costStatus}`);
    return `${detail.documentNo} satir=${detail.items.length}`;
  });

  await record('dusuk karli urunler raporu calisiyor mu?', async () => {
    const rows = await request<ProductProfitReport[]>('/reports/low-profit-products?threshold=100');
    assert(Array.isArray(rows), 'Dusuk karli urunler array degil.');
    assert(rows.some((item) => item.costStatus === 'ok' || item.costStatus === 'missing'), 'Dusuk karli urun durum etiketi yok.');
    return `${rows.length} dusuk karli/maliyet eksik urun`;
  });

  await record('USD alis TRY satis raporlarda dogru gorunuyor mu?', async () => {
    const productId = requireValue(fxUsdTryProductId ?? undefined, 'USD alis TRY satis urunu');
    const rows = await request<StockValuationRow[]>('/reports/stock-valuation');
    const row = requireValue(rows.find((item) => item.productId === productId), 'FX stok deger raporu satiri');
    const recentSales = await request<RecentSaleReport[]>('/reports/recent-sales');
    const sale = requireValue(recentSales.find((item) => item.receiptNo === fxUsdTrySaleDocumentNo), 'FX recent sales satiri');
    assert(row.currency === 'USD', `Stok kart para birimi USD degil: ${row.currency}`);
    assert(row.averageCostTry > 0, 'FX averageCostTry raporda bos.');
    assert(sale.documentCurrency === 'TRY', `Recent sales documentCurrency TRY degil: ${sale.documentCurrency}`);
    assert(Number(sale.totalTry ?? 0) > 0, 'Recent sales totalTry bos.');
    return `stok=${row.currency}, maliyet=${row.averageCostTry}, fis=${sale.documentCurrency}`;
  });

  await record('kritik islemler audit log yaziyor mu?', async () => {
    const systemStatus = await request<SystemStatus>('/system/status');
    assert(systemStatus.databaseConnected, 'Sistem durumu DB baglantisini OK gostermiyor.');
    const actions = new Set(systemStatus.recentAuditLogs.map((log) => log.action));
    assert(actions.has('SALES_RECEIPT_CREATED'), 'Satis audit log yok.');
    assert(actions.has('PURCHASE_RECEIPT_CREATED'), 'Alis audit log yok.');
    assert(actions.has('SALES_RECEIPT_CANCELLED'), 'Satis iptal audit log yok.');
    assert(actions.has('PURCHASE_RECEIPT_CANCELLED'), 'Alis iptal audit log yok.');
    return `${systemStatus.recentAuditLogs.length} audit kaydi gorundu`;
  });

  for (const result of results) {
    console.info(`${result.ok ? 'PASS' : 'FAIL'} - ${result.name} - ${result.detail}`);
  }

  const failed = results.filter((result) => !result.ok);
  console.info(`\nSUMMARY: ${results.length - failed.length}/${results.length} PASS`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL - smoke test runner - ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
