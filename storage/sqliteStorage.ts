import * as SQLite from 'expo-sqlite';
import type { CachedCustomer, CachedProduct, OfflineSalesReceipt, TerminalBootstrapData } from '../types';

type SQLiteDatabase = SQLite.SQLiteDatabase;

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('melisa_terminal.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_sales_receipts (
          local_uuid TEXT PRIMARY KEY NOT NULL,
          terminal_id TEXT NOT NULL,
          customer_id INTEGER,
          customer_name TEXT NOT NULL,
          document_no TEXT NOT NULL,
          items_json TEXT NOT NULL,
          total_amount REAL NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'TRY',
          used_exchange_rate_json TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS cached_products (
          id INTEGER PRIMARY KEY NOT NULL,
          stock_code TEXT NOT NULL,
          barcode TEXT NOT NULL,
          brand TEXT NOT NULL,
          type_name TEXT NOT NULL,
          quantity REAL NOT NULL DEFAULT 0,
          buy_price REAL NOT NULL DEFAULT 0,
          sell_price REAL NOT NULL DEFAULT 0,
          buy_price_try REAL NOT NULL DEFAULT 0,
          buy_price_usd REAL,
          buy_price_eur REAL,
          sell_price_try REAL NOT NULL DEFAULT 0,
          sell_price_usd REAL,
          sell_price_eur REAL,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS cached_customers (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          balance REAL NOT NULL DEFAULT 0,
          default_currency TEXT NOT NULL DEFAULT 'TRY',
          balance_try REAL NOT NULL DEFAULT 0,
          balance_usd REAL NOT NULL DEFAULT 0,
          balance_eur REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS terminal_cache_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await ensureColumn(db, 'offline_sales_receipts', 'currency', "TEXT NOT NULL DEFAULT 'TRY'");
      await ensureColumn(db, 'offline_sales_receipts', 'used_exchange_rate_json', 'TEXT');
      await ensureColumn(db, 'cached_products', 'buy_price_try', 'REAL NOT NULL DEFAULT 0');
      await ensureColumn(db, 'cached_products', 'buy_price_usd', 'REAL');
      await ensureColumn(db, 'cached_products', 'buy_price_eur', 'REAL');
      await ensureColumn(db, 'cached_products', 'sell_price_try', 'REAL NOT NULL DEFAULT 0');
      await ensureColumn(db, 'cached_products', 'sell_price_usd', 'REAL');
      await ensureColumn(db, 'cached_products', 'sell_price_eur', 'REAL');
      await ensureColumn(db, 'cached_customers', 'default_currency', "TEXT NOT NULL DEFAULT 'TRY'");
      await ensureColumn(db, 'cached_customers', 'balance_try', 'REAL NOT NULL DEFAULT 0');
      await ensureColumn(db, 'cached_customers', 'balance_usd', 'REAL NOT NULL DEFAULT 0');
      await ensureColumn(db, 'cached_customers', 'balance_eur', 'REAL NOT NULL DEFAULT 0');
      return db;
    });
  }
  return dbPromise;
}

async function ensureColumn(db: SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((item) => item.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function rowToReceipt(row: Record<string, unknown>): OfflineSalesReceipt {
  const lines = JSON.parse(String(row.items_json ?? '[]'));
  const status = String(row.status ?? 'PENDING') as OfflineSalesReceipt['status'];
  return {
    localUuid: String(row.local_uuid),
    terminalId: String(row.terminal_id),
    customerId: row.customer_id == null ? undefined : Number(row.customer_id),
    customerName: String(row.customer_name),
    documentNo: String(row.document_no),
    lines,
    totalAmount: Number(row.total_amount ?? 0),
    currency: String(row.currency ?? 'TRY') as OfflineSalesReceipt['currency'],
    usedExchangeRate: row.used_exchange_rate_json ? JSON.parse(String(row.used_exchange_rate_json)) : null,
    status,
    synced: status === 'SYNCED',
    retryCount: Number(row.retry_count ?? 0),
    lastError: row.last_error ? String(row.last_error) : undefined,
    createdAt: String(row.created_at),
  };
}

export async function loadOfflineSalesReceiptsFromSQLite(): Promise<OfflineSalesReceipt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM offline_sales_receipts ORDER BY created_at DESC');
  return rows.map(rowToReceipt);
}

export async function saveOfflineSalesReceiptToSQLite(receipt: OfflineSalesReceipt): Promise<void> {
  const db = await getDb();
  const status = receipt.status ?? (receipt.synced ? 'SYNCED' : 'PENDING');
  const totalAmount = receipt.totalAmount ?? receipt.lines.reduce((sum, line) => sum + line.quantity * (line.sellPrice ?? 0), 0);
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_sales_receipts
      (local_uuid, terminal_id, customer_id, customer_name, document_no, items_json, total_amount, currency, used_exchange_rate_json, status, created_at, retry_count, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    receipt.localUuid,
    receipt.terminalId,
    receipt.customerId ?? null,
    receipt.customerName,
    receipt.documentNo,
    JSON.stringify(receipt.lines),
    totalAmount,
    receipt.currency ?? 'TRY',
    receipt.usedExchangeRate ? JSON.stringify(receipt.usedExchangeRate) : null,
    status,
    receipt.createdAt,
    receipt.retryCount,
    receipt.lastError ?? null,
  );
}

export async function markOfflineSalesReceiptStatusInSQLite(localUuid: string, status: 'PENDING' | 'SYNCED' | 'FAILED', lastError?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE offline_sales_receipts
     SET status = ?, retry_count = CASE WHEN ? = 'FAILED' THEN retry_count + 1 ELSE retry_count END, last_error = ?
     WHERE local_uuid = ?`,
    status,
    status,
    lastError ?? null,
    localUuid,
  );
}

export async function saveBootstrapCacheToSQLite(data: TerminalBootstrapData): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_products');
    await db.runAsync('DELETE FROM cached_customers');

    for (const product of data.products) {
      await db.runAsync(
        `INSERT INTO cached_products
          (id, stock_code, barcode, brand, type_name, quantity, buy_price, sell_price, buy_price_try, buy_price_usd, buy_price_eur, sell_price_try, sell_price_usd, sell_price_eur, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        product.id,
        product.stockCode,
        product.barcode,
        product.brand,
        product.typeName,
        product.quantity,
        product.buyPrice,
        product.sellPrice,
        product.buyPriceTry,
        product.buyPriceUsd ?? null,
        product.buyPriceEur ?? null,
        product.sellPriceTry,
        product.sellPriceUsd ?? null,
        product.sellPriceEur ?? null,
        product.active ? 1 : 0,
      );
    }

    for (const customer of data.customers) {
      await db.runAsync(
        `INSERT INTO cached_customers (id, name, phone, balance, default_currency, balance_try, balance_usd, balance_eur, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        customer.id,
        customer.name,
        customer.phone ?? null,
        customer.balance,
        customer.defaultCurrency,
        customer.balanceTry,
        customer.balanceUsd,
        customer.balanceEur,
        customer.active ? 1 : 0,
      );
    }

    await db.runAsync('INSERT OR REPLACE INTO terminal_cache_meta (key, value) VALUES (?, ?)', 'bootstrap', JSON.stringify(data.settings));
  });
}

export async function loadCachedProductsFromSQLite(): Promise<CachedProduct[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM cached_products WHERE active = 1 ORDER BY stock_code ASC');
  return rows.map((row) => ({
    id: Number(row.id),
    stockCode: String(row.stock_code),
    barcode: String(row.barcode),
    brand: String(row.brand),
    typeName: String(row.type_name),
    quantity: Number(row.quantity ?? 0),
    buyPrice: Number(row.buy_price ?? 0),
    sellPrice: Number(row.sell_price ?? 0),
    buyPriceTry: Number(row.buy_price_try ?? row.buy_price ?? 0),
    buyPriceUsd: row.buy_price_usd == null ? null : Number(row.buy_price_usd),
    buyPriceEur: row.buy_price_eur == null ? null : Number(row.buy_price_eur),
    sellPriceTry: Number(row.sell_price_try ?? row.sell_price ?? 0),
    sellPriceUsd: row.sell_price_usd == null ? null : Number(row.sell_price_usd),
    sellPriceEur: row.sell_price_eur == null ? null : Number(row.sell_price_eur),
    active: Boolean(row.active),
  }));
}

export async function loadCachedCustomersFromSQLite(): Promise<CachedCustomer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM cached_customers WHERE active = 1 ORDER BY name ASC');
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    balance: Number(row.balance ?? 0),
    defaultCurrency: String(row.default_currency ?? 'TRY') as CachedCustomer['defaultCurrency'],
    balanceTry: Number(row.balance_try ?? row.balance ?? 0),
    balanceUsd: Number(row.balance_usd ?? 0),
    balanceEur: Number(row.balance_eur ?? 0),
    active: Boolean(row.active),
  }));
}

export async function isSQLiteAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.getFirstAsync('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}
