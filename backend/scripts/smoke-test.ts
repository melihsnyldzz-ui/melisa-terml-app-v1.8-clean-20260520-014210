import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Product = {
  id: number;
  stockCode: string;
  barcode: string;
  quantity: string | number;
  buyPrice: string | number;
  sellPrice: string | number;
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
  status?: 'ACTIVE' | 'CANCELLED';
  cancelled?: boolean;
  totalAmount: string | number;
  usdToTry: string | number;
};

type SystemStatus = {
  databaseConnected: boolean;
  activeUser?: { username: string; role: string };
  recentAuditLogs: Array<{ action: string; entityType: string; entityId: number }>;
};

type AppUser = {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
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

function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} hazir degil.`);
  return value;
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
    await request('/sales-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerId: activeCustomer.id,
        items: [{ productId: activeProduct.id, quantity: 2, unitPrice: 80 }],
        note: 'Smoke satis',
      }),
    });
    const after = await request<Product[]>(`/products?search=${activeProduct.stockCode}`).then((items) => items[0]);
    assert(asNumber(after.quantity) === asNumber(before.quantity) - 2, `Stok dusmedi: ${before.quantity} -> ${after.quantity}`);
    return `${before.quantity} -> ${after.quantity}`;
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
    const first = await request<{ duplicate: boolean; status: string }>('/terminal/sync-sales-receipt', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    const second = await request<{ duplicate: boolean; status: string }>('/terminal/sync-sales-receipt', {
      method: 'POST',
      body: JSON.stringify({ localUuid, terminalId: 'SMOKE-TERM', payload }),
    });
    assert(first.status === 'SYNCED', `Ilk sync basarisiz: ${first.status}`);
    assert(second.duplicate === true, 'Ikinci sync duplicate donmedi.');
    return `first=${first.status}, duplicate=${second.duplicate}`;
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
